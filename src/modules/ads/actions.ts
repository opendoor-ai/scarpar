'use server'

// 광고 관리 (플랫폼 관리자 전용) — 배너 광고 / 유료 상단 노출

import { revalidatePath } from 'next/cache'

import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import {
  BANNER_PLACEMENT_INFO,
  MAX_PROMOTIONS_MAIN,
  MAX_PROMOTIONS_PER_CATEGORY,
  bannerSchema,
  kstEnd,
  kstStart,
  promotionSchema,
  type BannerInput,
  type PromotionInput,
} from './schemas'


function refresh() {
  revalidatePath('/admin/ads')
  revalidatePath('/products')
}

// ------------------------------------------------------------------ 배너

export async function saveBannerAction(id: string | null, input: BannerInput): Promise<ActionResult> {
  let user
  try {
    user = await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const parsed = bannerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data
  const starts_at = kstStart(d.starts_on)
  const ends_at = kstEnd(d.ends_on)
  const category_id = d.placement === 'category' ? d.category_id : null

  const admin = getAdminClient()
  // 같은 자리(위치+카테고리)에 기간이 겹치는 배너가 너무 많으면 막기
  if (d.is_active) {
    let q = admin
      .from('banner_ads')
      .select('id', { count: 'exact', head: true })
      .eq('placement', d.placement)
      .eq('is_active', true)
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at)
    q = category_id ? q.eq('category_id', category_id) : q.is('category_id', null)
    if (id) q = q.neq('id', id)
    const { count } = await q
    const max = BANNER_PLACEMENT_INFO[d.placement].max
    if ((count ?? 0) >= max) {
      return {
        ok: false,
        error: `이 자리는 해당 기간에 이미 배너가 ${max}개 예약돼 있어요. 기간을 바꾸거나 다른 배너를 멈춰 주세요.`,
      }
    }
  }

  const row = {
    title: d.title,
    advertiser_org_id: d.advertiser_org_id,
    advertiser_name: d.advertiser_name || null,
    link_url: d.link_url,
    image_pc: d.image_pc,
    image_mobile: d.image_mobile || null,
    subtitle: d.subtitle || null,
    phone: d.phone || null,
    placement: d.placement,
    category_id,
    starts_at,
    ends_at,
    sort_order: d.sort_order,
    is_active: d.is_active,
    payment_status: d.payment_status,
    price_won: d.price_won,
    memo: d.memo || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = id
    ? await admin.from('banner_ads').update(row).eq('id', id)
    : await admin.from('banner_ads').insert({ ...row, created_by: user.id })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

export async function deleteBannerAction(id: string): Promise<ActionResult> {
  try {
    await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const { error } = await getAdminClient().from('banner_ads').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

// ------------------------------------------------------------------ 유료 상단 노출

export async function savePromotionAction(id: string | null, input: PromotionInput): Promise<ActionResult> {
  let user
  try {
    user = await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const parsed = promotionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data
  const starts_at = kstStart(d.starts_on)
  const ends_at = kstEnd(d.ends_on)

  const admin = getAdminClient()
  const { data: product } = await admin
    .from('products')
    .select('id, org_id, category_id, status')
    .eq('product_no', d.product_no)
    .maybeSingle()
  if (!product) return { ok: false, error: `상품번호 P${d.product_no} 상품을 찾을 수 없어요.` }
  const p = product as { id: string; org_id: string; category_id: string | null; status: string }
  if (d.placement === 'category' && !p.category_id) {
    return { ok: false, error: '카테고리가 없는 상품이에요. 상품에 카테고리를 먼저 지정하거나 "전체 제품 첫 화면"을 고르세요.' }
  }

  if (d.is_active) {
    // 같은 상품·같은 위치에 기간이 겹치는 상단 노출이 이미 있으면 막기
    let dup = admin
      .from('product_promotions')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', p.id)
      .eq('placement', d.placement)
      .eq('is_active', true)
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at)
    if (id) dup = dup.neq('id', id)
    if (((await dup).count ?? 0) > 0) return { ok: false, error: '이 상품은 같은 위치·기간에 이미 상단 노출이 잡혀 있어요.' }

    // 자리 수 제한 (첫 화면 / 같은 카테고리)
    let slot = admin
      .from('product_promotions')
      .select('id, product:products!inner(category_id)', { count: 'exact', head: true })
      .eq('placement', d.placement)
      .eq('is_active', true)
      .lt('starts_at', ends_at)
      .gt('ends_at', starts_at)
    if (d.placement === 'category') slot = slot.eq('product.category_id', p.category_id as string)
    if (id) slot = slot.neq('id', id)
    const limit = d.placement === 'main' ? MAX_PROMOTIONS_MAIN : MAX_PROMOTIONS_PER_CATEGORY
    if (((await slot).count ?? 0) >= limit) {
      return { ok: false, error: `이 자리는 해당 기간에 이미 ${limit}개 상품이 상단 노출 중이에요. 기간을 바꿔 주세요.` }
    }
  }

  const row = {
    product_id: p.id,
    org_id: p.org_id,
    placement: d.placement,
    starts_at,
    ends_at,
    is_active: d.is_active,
    payment_status: d.payment_status,
    price_won: d.price_won,
    memo: d.memo || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = id
    ? await admin.from('product_promotions').update(row).eq('id', id)
    : await admin.from('product_promotions').insert({ ...row, created_by: user.id })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

export async function deletePromotionAction(id: string): Promise<ActionResult> {
  try {
    await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const { error } = await getAdminClient().from('product_promotions').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}
