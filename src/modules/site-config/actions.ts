'use server'

// 사이트 운영 설정 저장 (메인 관리자 전용) — 다른 설정을 지우지 않고 해당 부분만 바꿔요

import { revalidatePath } from 'next/cache'

import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import { appSchema, displaySchema, searchSchema, seoSchema } from './schemas'

const SCHEMAS = { seo: seoSchema, search: searchSchema, display: displaySchema, app: appSchema } as const
type Section = keyof typeof SCHEMAS

export async function saveSiteSectionAction(section: Section, value: unknown): Promise<ActionResult> {
  try {
    await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const schema = SCHEMAS[section]
  if (!schema) return { ok: false, error: '잘못된 설정이에요' }
  const parsed = schema.safeParse(value)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요' }

  const admin = getAdminClient()
  const { data: row } = await admin.from('site_settings').select('data').eq('id', 1).maybeSingle()
  const current = ((row as { data: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>
  const { error } = await admin
    .from('site_settings')
    .upsert({ id: 1, data: { ...current, [section]: parsed.data }, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: '저장하지 못했어요. 다시 시도해 주세요.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}
