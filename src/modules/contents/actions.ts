'use server'

// 사이트 콘텐츠(쇼츠·블로그·매거진) 등록·수정·삭제 — 플랫폼 관리자 전용

import { revalidatePath } from 'next/cache'

import { sanitizeDetailHtml } from '@/lib/detail-html'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import { contentSchema, type ContentInput } from './schemas'

function refresh() {
  revalidatePath('/admin/contents')
  revalidatePath('/')
  revalidatePath('/magazine')
}

export async function saveContentAction(id: string | null, input: ContentInput): Promise<ActionResult> {
  let user
  try {
    user = await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const parsed = contentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data
  const admin = getAdminClient()

  // 함께 보여줄 제품: 블로그는 쉼표로 최대 3개, 매거진은 1개
  const nos = [
    ...new Set(
      [d.product_no ?? 0, ...(d.product_nos ?? '').split(/[,\s]+/).map((x) => Number(x.replace(/^p/i, '')))].filter(
        (n) => Number.isInteger(n) && n > 0,
      ),
    ),
  ].slice(0, 3)
  const productIds: string[] = []
  if (nos.length > 0) {
    const { data } = await admin.from('products').select('id, product_no').in('product_no', nos)
    const byNo = new Map(((data ?? []) as { id: string; product_no: number }[]).map((r) => [r.product_no, r.id]))
    const missing = nos.filter((n) => !byNo.has(n))
    if (missing.length) return { ok: false, error: `상품번호 ${missing.map((n) => `P${n}`).join(', ')} 상품을 찾을 수 없어요.` }
    for (const n of nos) productIds.push(byNo.get(n)!)
  }
  const productId = productIds[0] ?? null

  const row = {
    kind: d.kind,
    title: d.title,
    url: d.url || null,
    thumbnail: d.thumbnail || null,
    summary: d.summary || null,
    body_html: d.kind === 'magazine' && d.body_html ? sanitizeDetailHtml(d.body_html) : null,
    product_id: productId,
    product_ids: productIds,
    author: d.author || null,
    is_published: d.is_published,
    sort_order: d.sort_order,
    updated_at: new Date().toISOString(),
  }
  const write = (r: Record<string, unknown>) =>
    id ? admin.from('site_contents').update(r).eq('id', id) : admin.from('site_contents').insert({ ...r, created_by: user.id })
  let { error } = await write(row)
  // 0030 실행 전이면 새 칸 없이 저장
  if (error && /product_ids|author/.test(error.message)) {
    const { product_ids: _p, author: _a, ...base } = row
    ;({ error } = await write(base))
  }
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

export async function deleteContentAction(id: string): Promise<ActionResult> {
  try {
    await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const { error } = await getAdminClient().from('site_contents').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}
