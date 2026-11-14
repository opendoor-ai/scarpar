'use server'

// 플랫폼 공통 카테고리(상품분류) 관리 — 전자동(플랫폼 관리자)만.
// 모든 공급사가 함께 쓰는 분류라서 플랫폼 운영 조직(jadong)의 카테고리만 다룹니다.
// 규칙: 1차(대분류) → 2차(소분류) 두 단계까지.

import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import { getPlatformOrgId } from '@/lib/platform-categories'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import {
  categoryOrderSchema,
  categorySettingsSchema,
  type CategoryOrderInput,
  type CategorySettingsInput,
} from './category-settings'

type Ctx = { orgId: string }

async function guard(): Promise<Ctx | { error: string }> {
  try {
    await requirePlatformAdmin()
  } catch (err) {
    return { error: (err as Error).message }
  }
  const orgId = await getPlatformOrgId()
  if (!orgId) return { error: '플랫폼 운영 조직을 찾을 수 없어요.' }
  return { orgId }
}

function refresh() {
  revalidatePath('/admin/categories')
  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/')
}

async function loadRows(orgId: string) {
  const { data } = await getAdminClient().from('categories').select('id, parent_id').eq('org_id', orgId)
  return (data ?? []) as { id: string; parent_id: string | null }[]
}

export async function saveCategoryAction(
  id: string | null,
  input: CategorySettingsInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await guard()
  if ('error' in ctx) return { ok: false, error: ctx.error }
  const parsed = categorySettingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data

  const rows = await loadRows(ctx.orgId)
  const byId = new Map(rows.map((r) => [r.id, r]))
  if (id && !byId.has(id)) return { ok: false, error: '분류를 찾을 수 없어요.' }
  if (d.parent_id) {
    const parent = byId.get(d.parent_id)
    if (!parent) return { ok: false, error: '상위 분류를 찾을 수 없어요.' }
    if (parent.parent_id) return { ok: false, error: '2차 분류 아래에는 분류를 만들 수 없어요. (1차 → 2차까지)' }
    if (id && d.parent_id === id) return { ok: false, error: '자기 자신을 상위 분류로 고를 수 없어요.' }
    if (id && rows.some((r) => r.parent_id === id)) {
      return { ok: false, error: '하위 분류가 있는 1차 분류는 다른 분류 아래로 옮길 수 없어요.' }
    }
  }

  const admin = getAdminClient()
  const values = {
    name: d.name,
    parent_id: d.parent_id,
    description: d.description || null,
    is_visible: d.is_visible,
    show_on_main: d.show_on_main,
    top_image: d.top_image || null,
    icon_image: d.icon_image || null,
    product_sort: d.product_sort,
    seo_title: d.seo_title || null,
    seo_description: d.seo_description || null,
    seo_keywords: d.seo_keywords || null,
    updated_at: new Date().toISOString(),
  }

  let savedId = id
  if (id) {
    const { error } = await admin.from('categories').update(values).eq('id', id).eq('org_id', ctx.orgId)
    if (error) return { ok: false, error: dbError(error) }
  } else {
    // 새 분류는 같은 단계 맨 뒤에
    const siblings = rows.filter((r) => r.parent_id === d.parent_id).length
    // 영문 주소(slug)는 내부용 — 임시값으로 넣고, 번호가 생기면 cat-번호로 바꿈
    const { data, error } = await admin
      .from('categories')
      .insert({ ...values, slug: `tmp-${randomUUID()}`, org_id: ctx.orgId, sort_order: siblings + 1 })
      .select('*')
      .single()
    if (error || !data) return { ok: false, error: dbError(error ?? { message: '분류를 추가하지 못했어요.' }) }
    const row = data as { id: string; cate_no?: number | null }
    savedId = row.id
    await admin
      .from('categories')
      .update({ slug: row.cate_no ? `cat-${row.cate_no}` : `cat-${row.id.slice(0, 8)}` })
      .eq('id', row.id)
  }

  refresh()
  return { ok: true, data: { id: savedId as string } }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await guard()
  if ('error' in ctx) return { ok: false, error: ctx.error }

  const rows = await loadRows(ctx.orgId)
  if (!rows.some((r) => r.id === id)) return { ok: false, error: '분류를 찾을 수 없어요.' }
  if (rows.some((r) => r.parent_id === id)) {
    return { ok: false, error: '하위 분류가 있어요. 하위 분류를 먼저 삭제하거나 다른 곳으로 옮겨 주세요.' }
  }

  // 상품의 분류는 자동으로 "미지정"이 됩니다 (on delete set null)
  const { error } = await getAdminClient().from('categories').delete().eq('id', id).eq('org_id', ctx.orgId)
  if (error) return { ok: false, error: dbError(error) }
  refresh()
  return { ok: true }
}

/** 끌어서 놓기로 바꾼 순서·위치를 한 번에 저장 */
export async function saveCategoryOrderAction(items: CategoryOrderInput): Promise<ActionResult> {
  const ctx = await guard()
  if ('error' in ctx) return { ok: false, error: ctx.error }
  const parsed = categoryOrderSchema.safeParse(items)
  if (!parsed.success) return { ok: false, error: '순서 정보가 올바르지 않아요.' }

  const rows = await loadRows(ctx.orgId)
  const ids = new Set(rows.map((r) => r.id))
  const next = new Map(parsed.data.map((i) => [i.id, i]))
  for (const i of parsed.data) {
    if (!ids.has(i.id)) return { ok: false, error: '없는 분류가 섞여 있어요. 새로고침 후 다시 해 주세요.' }
    if (i.parent_id) {
      if (i.parent_id === i.id) return { ok: false, error: '자기 자신 아래로 옮길 수 없어요.' }
      const parentNext = next.get(i.parent_id)
      const parentParent = parentNext ? parentNext.parent_id : rows.find((r) => r.id === i.parent_id)?.parent_id
      if (parentParent) return { ok: false, error: '2차 분류 아래로는 옮길 수 없어요. (1차 → 2차까지)' }
    }
  }
  // 하위 분류를 가진 1차가 다른 분류 아래로 들어가면 3단계가 되므로 막기
  for (const i of parsed.data) {
    if (!i.parent_id) continue
    const hasChildren = parsed.data.some((c) => c.parent_id === i.id)
    if (hasChildren) return { ok: false, error: '하위 분류가 있는 1차 분류는 다른 분류 아래로 옮길 수 없어요.' }
  }

  const admin = getAdminClient()
  const results = await Promise.all(
    parsed.data.map((i) =>
      admin
        .from('categories')
        .update({ parent_id: i.parent_id, sort_order: i.sort_order })
        .eq('id', i.id)
        .eq('org_id', ctx.orgId),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: dbError(failed.error) }
  refresh()
  return { ok: true }
}

function dbError(error: { code?: string; message: string }): string {
  if (error.code === '23505') return '같은 분류 번호·주소가 이미 있어요. 다시 시도해 주세요.'
  if (/column .* does not exist|schema cache/i.test(error.message)) {
    return '카테고리 상세 설정 칸이 아직 없어요. Supabase에서 0015_category_settings.sql을 먼저 실행해 주세요.'
  }
  return error.message
}
