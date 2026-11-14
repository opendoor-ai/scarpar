'use server'

// 상품목록 일괄 처리 — 선택한 상품을 한 번에 판매중·임시저장·보관 / 분류 변경 / 복사 / 삭제

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

const idsSchema = z.array(z.string().uuid()).min(1, '상품을 선택하세요').max(200, '한 번에 200개까지 처리할 수 있어요')

function refresh() {
  revalidatePath('/admin/products')
  revalidatePath('/products')
}

/** 판매 상태 바꾸기 */
export async function bulkSetStatusAction(ids: string[], status: string): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')
  const parsedIds = idsSchema.safeParse(ids)
  if (!parsedIds.success) return { ok: false, error: parsedIds.error.issues[0]?.message ?? '상품을 선택하세요' }
  const parsedStatus = z.enum(['active', 'draft', 'archived']).safeParse(status)
  if (!parsedStatus.success) return { ok: false, error: '잘못된 상태입니다' }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('products')
    .update({ status: parsedStatus.data })
    .in('id', parsedIds.data)
    .eq('org_id', ctx.org.id)
    .select('id')
  if (error) return { ok: false, error: '바꾸지 못했어요. 다시 시도해 주세요.' }
  audit(ctx, 'update', 'product', parsedIds.data.join(','), undefined, { status: parsedStatus.data, bulk: true })
  refresh()
  return { ok: true, data: { count: data?.length ?? 0 } }
}

/** 분류(카테고리) 바꾸기 — 플랫폼 공통 분류만 */
export async function bulkSetCategoryAction(ids: string[], categoryId: string): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')
  const parsedIds = idsSchema.safeParse(ids)
  if (!parsedIds.success) return { ok: false, error: parsedIds.error.issues[0]?.message ?? '상품을 선택하세요' }
  const categories = await getPlatformCategories()
  if (!categories.some((c) => c.id === categoryId)) return { ok: false, error: '분류를 다시 선택해 주세요' }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('products')
    .update({ category_id: categoryId })
    .in('id', parsedIds.data)
    .eq('org_id', ctx.org.id)
    .select('id')
  if (error) return { ok: false, error: '분류를 바꾸지 못했어요.' }
  audit(ctx, 'update', 'product', parsedIds.data.join(','), undefined, { category_id: categoryId, bulk: true })
  refresh()
  return { ok: true, data: { count: data?.length ?? 0 } }
}

/** 삭제 (사진 파일은 남기고, 상품·옵션·사진 연결만 지움) */
export async function bulkDeleteAction(ids: string[]): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')
  const parsedIds = idsSchema.safeParse(ids)
  if (!parsedIds.success) return { ok: false, error: parsedIds.error.issues[0]?.message ?? '상품을 선택하세요' }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('products')
    .delete()
    .in('id', parsedIds.data)
    .eq('org_id', ctx.org.id)
    .select('id')
  if (error) return { ok: false, error: '삭제하지 못했어요. 다시 시도해 주세요.' }
  audit(ctx, 'delete', 'product', parsedIds.data.join(','), undefined, { bulk: true })
  refresh()
  return { ok: true, data: { count: data?.length ?? 0 } }
}

/** 복사 — 같은 내용으로 새 상품을 "임시저장" 상태로 만들어요 (사진·옵션 포함) */
export async function bulkCopyAction(ids: string[]): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')
  const parsedIds = idsSchema.max(20, '복사는 한 번에 20개까지 할 수 있어요').safeParse(ids)
  if (!parsedIds.success) return { ok: false, error: parsedIds.error.issues[0]?.message ?? '상품을 선택하세요' }

  const supabase = await getServerClient()
  const { data: sources, error } = await supabase
    .from('products')
    .select('*, product_images(media_id, position, variant_id), product_variants(*)')
    .in('id', parsedIds.data)
    .eq('org_id', ctx.org.id)
  if (error || !sources) return { ok: false, error: '복사할 상품을 불러오지 못했어요.' }

  let count = 0
  for (const src of sources as Record<string, unknown>[]) {
    const {
      id: _id,
      product_no: _no,
      slug: _slug,
      created_at: _c,
      updated_at: _u,
      product_images: images,
      product_variants: variants,
      ...rest
    } = src
    const { data: row, error: insErr } = await supabase
      .from('products')
      .insert({
        ...rest,
        name: `${String(rest.name)} (복사)`.slice(0, 200),
        status: 'draft',
        slug: `copy-${crypto.randomUUID()}`,
        display_at: new Date().toISOString(),
        jumped_at: null,
      })
      .select('id, product_no')
      .single()
    if (insErr || !row) {
      console.error('[catalog:copy]', insErr?.message)
      continue
    }
    const newId = row.id as string
    await supabase.from('products').update({ slug: String(row.product_no) }).eq('id', newId).eq('org_id', ctx.org.id)

    // 옵션 복사 (사진-옵션 연결은 새 옵션 id로 바꿔 줌)
    const variantIdMap = new Map<string, string>()
    for (const v of (variants as Record<string, unknown>[] | null) ?? []) {
      const { id: oldVid, product_id: _p, created_at: _vc, updated_at: _vu, ...vrest } = v
      const { data: nv } = await supabase
        .from('product_variants')
        .insert({ ...vrest, product_id: newId, sku: null })
        .select('id')
        .single()
      if (nv) variantIdMap.set(oldVid as string, nv.id as string)
    }
    const imgRows = ((images as { media_id: string; position: number; variant_id: string | null }[] | null) ?? []).map(
      (img) => ({
        org_id: ctx.org.id,
        product_id: newId,
        media_id: img.media_id,
        position: img.position,
        variant_id: img.variant_id ? (variantIdMap.get(img.variant_id) ?? null) : null,
      }),
    )
    if (imgRows.length > 0) await supabase.from('product_images').insert(imgRows)
    audit(ctx, 'create', 'product', newId, undefined, { copiedFrom: _id })
    count += 1
  }
  if (count === 0) return { ok: false, error: '복사하지 못했어요.' }
  refresh()
  return { ok: true, data: { count } }
}

/** 점프 — 선택한 판매중 제품을 목록 맨 위로 (등급별 하루 한도는 DB 함수가 확인) */
export async function jumpProductsAction(ids: string[]): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')
  const parsedIds = idsSchema.max(10, '점프는 한 번에 10개까지 할 수 있어요').safeParse(ids)
  if (!parsedIds.success) return { ok: false, error: parsedIds.error.issues[0]?.message ?? '제품을 선택하세요' }

  const supabase = await getServerClient()
  const { data, error } = await supabase.rpc('jump_products', { p_product_ids: parsedIds.data })
  if (error) {
    // DB 함수가 보낸 한국어 안내를 그대로 보여줌
    const msg = /[가-힣]/.test(error.message) ? error.message : '점프하지 못했어요. 0026 SQL을 실행했는지 확인해 주세요.'
    return { ok: false, error: msg }
  }
  audit(ctx, 'update', 'product', parsedIds.data.join(','), undefined, { jump: true, result: data })
  refresh()
  revalidatePath('/')
  return { ok: true, data: { count: (data as { jumped?: number } | null)?.jumped ?? parsedIds.data.length } }
}
