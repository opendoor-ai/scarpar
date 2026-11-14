'use server'

// 구매문의 등록 (회원가입 없이). 방문자에게 직접 쓰기 권한이 없으므로
// 서버에서 검사한 뒤 service role로 저장합니다.

import { revalidatePath } from 'next/cache'

import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import { purchaseRequestSchema, type PurchaseRequestInput } from './schemas'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** 첨부 사진 1장 올리기 → 저장 경로 */
export async function uploadRequestImageAction(formData: FormData): Promise<ActionResult<{ path: string }>> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: '사진을 선택하세요.' }
  if (!ALLOWED.includes(file.type)) return { ok: false, error: 'JPG, PNG, GIF, WEBP 사진만 올릴 수 있어요.' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: '10MB 이하 사진만 올릴 수 있어요.' }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `requests/${new Date().toISOString().slice(0, 7)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await getAdminClient().storage.from('media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    console.error('[purchase-requests:upload]', error.message)
    return { ok: false, error: '사진을 올리지 못했어요. 다시 시도해 주세요.' }
  }
  return { ok: true, data: { path } }
}

/** 구매문의 등록 → 등록 번호 */
export async function createPurchaseRequestAction(
  input: PurchaseRequestInput,
): Promise<ActionResult<{ no: number }>> {
  const parsed = purchaseRequestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data
  // 스팸 로봇이 숨김 칸을 채운 경우: 성공한 척하고 저장하지 않음
  if (d.website) return { ok: true, data: { no: 0 } }

  // 이 사이트에서 올린 사진만 허용
  const images = d.images.filter((p) => /^requests\/[\w./-]+$/.test(p) && !p.includes('..'))
  const phone = d.phone.replace(/\s/g, '')

  try {
    const supabase = getAdminClient()
    // 같은 연락처로 1분 안에 연속 등록 막기 (간단한 도배 방지)
    const since = new Date(Date.now() - 60_000).toISOString()
    const { count } = await supabase
      .from('purchase_requests')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', since)
    if ((count ?? 0) > 0) return { ok: false, error: '잠시 후 다시 등록해 주세요.' }

    const { data, error } = await supabase
      .from('purchase_requests')
      .insert({
        title: d.title,
        condition: d.condition,
        detail: d.detail,
        images,
        author_name: d.authorName,
        phone,
        email: d.email || null,
        region: d.region || null,
      })
      .select('request_no')
      .single()
    if (error || !data) {
      console.error('[purchase-requests:create]', error?.message)
      return { ok: false, error: '구매문의를 등록하지 못했어요. 다시 시도해 주세요.' }
    }
    revalidatePath('/requests')
    revalidatePath('/')
    return { ok: true, data: { no: (data as { request_no: number }).request_no } }
  } catch (err) {
    console.error('[purchase-requests:create]', err)
    return { ok: false, error: '구매문의를 등록하지 못했어요. 다시 시도해 주세요.' }
  }
}
