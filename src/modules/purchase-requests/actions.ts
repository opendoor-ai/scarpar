'use server'

// 구매문의 — 공급사(상담하기·메모) / 플랫폼 관리자(상태 변경·삭제)

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireOrg } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import { REQUEST_STATUSES } from './schemas'

function refresh() {
  revalidatePath('/admin/requests')
  revalidatePath('/requests')
  revalidatePath('/')
}

/** 공급사: "상담하기" — 우리 회사를 상담 회사로 기록하고, 문의를 "상담중"으로 */
export async function respondRequestAction(requestId: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  if (!z.string().uuid().safeParse(requestId).success) return { ok: false, error: '잘못된 문의입니다.' }
  const supabase = getAdminClient()
  const { data: req } = await supabase
    .from('purchase_requests')
    .select('id, status')
    .eq('id', requestId)
    .maybeSingle()
  if (!req || (req as { status: string }).status === 'hidden') return { ok: false, error: '문의를 찾을 수 없어요.' }

  const { error } = await supabase
    .from('purchase_request_responses')
    .upsert({ request_id: requestId, org_id: ctx.org.id, user_id: ctx.user.id }, { onConflict: 'request_id,org_id' })
  if (error) return { ok: false, error: '기록하지 못했어요. 다시 시도해 주세요.' }
  if ((req as { status: string }).status === 'open') {
    await supabase.from('purchase_requests').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', requestId)
  }
  refresh()
  return { ok: true }
}

/** 공급사: 상담 취소 */
export async function cancelResponseAction(requestId: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  const supabase = getAdminClient()
  await supabase.from('purchase_request_responses').delete().eq('request_id', requestId).eq('org_id', ctx.org.id)
  // 상담 회사가 하나도 없으면 다시 "상담가능"
  const { count } = await supabase
    .from('purchase_request_responses')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId)
  if ((count ?? 0) === 0) {
    await supabase.from('purchase_requests').update({ status: 'open' }).eq('id', requestId).eq('status', 'in_progress')
  }
  refresh()
  return { ok: true }
}

/** 공급사: 내부 메모 */
export async function saveResponseMemoAction(requestId: string, memo: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  const { error } = await getAdminClient()
    .from('purchase_request_responses')
    .update({ memo: memo.trim().slice(0, 1000) || null })
    .eq('request_id', requestId)
    .eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: '메모를 저장하지 못했어요.' }
  revalidatePath('/admin/requests')
  return { ok: true }
}

/** 플랫폼 관리자: 상태 변경 (상담가능·상담중·상담완료·숨김) */
export async function setRequestStatusAction(requestId: string, status: string): Promise<ActionResult> {
  await requireOrg()
  if (!(await isPlatformAdmin())) return { ok: false, error: '플랫폼 관리자만 할 수 있어요.' }
  const parsed = z.enum(REQUEST_STATUSES).safeParse(status)
  if (!parsed.success) return { ok: false, error: '잘못된 상태입니다.' }
  const { error } = await getAdminClient()
    .from('purchase_requests')
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) return { ok: false, error: '바꾸지 못했어요.' }
  refresh()
  return { ok: true }
}

/** 플랫폼 관리자: 삭제 (첨부 사진도 함께) */
export async function deleteRequestAction(requestId: string): Promise<ActionResult> {
  await requireOrg()
  if (!(await isPlatformAdmin())) return { ok: false, error: '플랫폼 관리자만 할 수 있어요.' }
  const supabase = getAdminClient()
  const { data } = await supabase.from('purchase_requests').select('images').eq('id', requestId).maybeSingle()
  const images = ((data as { images: string[] | null } | null)?.images ?? []).filter((p) => p.startsWith('requests/'))
  const { error } = await supabase.from('purchase_requests').delete().eq('id', requestId)
  if (error) return { ok: false, error: '삭제하지 못했어요.' }
  if (images.length > 0) await supabase.storage.from('media').remove(images)
  refresh()
  return { ok: true }
}
