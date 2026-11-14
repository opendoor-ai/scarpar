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

  let productId: string | null = null
  if (d.product_no) {
    const { data } = await admin.from('products').select('id').eq('product_no', d.product_no).maybeSingle()
    if (!data) return { ok: false, error: `상품번호 P${d.product_no} 상품을 찾을 수 없어요.` }
    productId = (data as { id: string }).id
  }

  const row = {
    kind: d.kind,
    title: d.title,
    url: d.url || null,
    thumbnail: d.thumbnail || null,
    summary: d.summary || null,
    body_html: d.kind === 'magazine' && d.body_html ? sanitizeDetailHtml(d.body_html) : null,
    product_id: productId,
    is_published: d.is_published,
    sort_order: d.sort_order,
    updated_at: new Date().toISOString(),
  }
  const { error } = id
    ? await admin.from('site_contents').update(row).eq('id', id)
    : await admin.from('site_contents').insert({ ...row, created_by: user.id })
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
