'use server'

// 공급사 미니샵 배너 등록·수정·삭제 (자기 공급사 것만 — 보안 규칙(RLS)으로도 한 번 더 막힘)

import { revalidatePath } from 'next/cache'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import { kstEnd, kstStart } from '@/modules/ads/schemas'

import { storeBannerSchema, type StoreBannerInput } from './banner-schemas'

export async function saveStoreBannerAction(id: string | null, input: StoreBannerInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')
  const parsed = storeBannerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data

  const row = {
    title: d.title,
    link_url: d.link_url || null,
    image_pc: d.image_pc,
    image_mobile: d.image_mobile || null,
    starts_at: d.starts_on ? kstStart(d.starts_on) : null,
    ends_at: d.ends_on ? kstEnd(d.ends_on) : null,
    sort_order: d.sort_order,
    is_active: d.is_active,
    updated_at: new Date().toISOString(),
  }
  const supabase = await getServerClient()
  const { data, error } = id
    ? await supabase.from('store_banners').update(row).eq('id', id).eq('org_id', ctx.org.id).select('id').maybeSingle()
    : await supabase
        .from('store_banners')
        .insert({ ...row, org_id: ctx.org.id })
        .select('id')
        .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: '배너를 찾을 수 없습니다.' }

  audit(ctx, id ? 'store_banner.updated' : 'store_banner.created', 'store_banner', (data as { id: string }).id, null, row)
  revalidatePath('/admin/banners')
  revalidatePath(`/minishop/${ctx.org.slug}`)
  return { ok: true }
}

export async function deleteStoreBannerAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')
  const supabase = await getServerClient()
  const { error } = await supabase.from('store_banners').delete().eq('id', id).eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }
  audit(ctx, 'store_banner.deleted', 'store_banner', id, null, null)
  revalidatePath('/admin/banners')
  revalidatePath(`/minishop/${ctx.org.slug}`)
  return { ok: true }
}
