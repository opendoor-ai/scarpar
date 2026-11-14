'use server'

// 쇼핑몰(로그인 안 한 방문자)용 질문 등록. 방문자에게 직접 쓰기 권한이 없으므로
// 서버에서 검증한 뒤 service role로 저장합니다 (docs/conventions.md — storefront writes).

import { notify } from '@/lib/notify'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import { getStoreOrg } from '@/components/store/get-store-org'

import { askQuestionSchema, type AskQuestionInput } from './schemas'

export async function askQuestionAction(input: AskQuestionInput): Promise<ActionResult> {
  const parsed = askQuestionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const data = parsed.data
  // 스팸 로봇이 숨김 칸을 채운 경우: 성공한 척하고 저장하지 않음
  if (data.website) return { ok: true }

  try {
    const org = await getStoreOrg(data.orgSlug)
    if (!org) return { ok: false, error: '쇼핑몰을 찾을 수 없습니다' }

    const supabase = getAdminClient()
    const { data: product } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', data.productId)
      .eq('org_id', org.id)
      .eq('status', 'active')
      .maybeSingle()
    if (!product) return { ok: false, error: '상품을 찾을 수 없습니다' }

    // 같은 상품에 1분 안에 같은 이름으로 연속 등록하는 것을 막음 (간단한 도배 방지)
    const since = new Date(Date.now() - 60_000).toISOString()
    const { count } = await supabase
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', data.productId)
      .eq('author_name', data.authorName)
      .gte('created_at', since)
    if ((count ?? 0) > 0) return { ok: false, error: '잠시 후 다시 등록해 주세요.' }

    const { error } = await supabase.from('product_questions').insert({
      org_id: org.id,
      product_id: data.productId,
      author_name: data.authorName,
      author_contact: data.authorContact || null,
      question: data.question,
      is_private: data.isPrivate,
      status: 'pending',
    })
    if (error) return { ok: false, error: '질문을 등록하지 못했습니다. 다시 시도해 주세요.' }

    await notify(org.id, 'question_received', {
      title: `새 상품 Q&A: ${(product as { name: string }).name}`,
      body: data.question.slice(0, 140),
      link: '/admin/questions',
    })

    return { ok: true }
  } catch (err) {
    console.error('[questions:askQuestionAction]', err)
    return { ok: false, error: '질문을 등록하지 못했습니다. 다시 시도해 주세요.' }
  }
}
