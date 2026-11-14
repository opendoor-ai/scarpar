'use server'

// 사이트 설정 저장 — 플랫폼 관리자 전용

import { revalidatePath } from 'next/cache'

import { requirePlatformAdmin } from '@/lib/platform-admin'
import { siteSettingsSchema, type SiteSettings } from '@/lib/site-settings'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

export async function saveSiteSettingsAction(input: SiteSettings): Promise<ActionResult> {
  try {
    await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const parsed = siteSettingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  // 다른 설정(SEO·검색 등)은 그대로 두고 이 부분만 덮어씀
  const admin = getAdminClient()
  const { data: row } = await admin.from('site_settings').select('data').eq('id', 1).maybeSingle()
  const current = ((row as { data: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>
  const { error } = await admin
    .from('site_settings')
    .upsert({ id: 1, data: { ...current, ...parsed.data }, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}
