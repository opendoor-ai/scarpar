'use server'

// 공급사 기본정보 · 판매정보 표시설정 저장 (공급사 관리자 화면)

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { sanitizeDetailHtml } from '@/lib/detail-html'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))

const contactSchema = z.object({ name: opt(40), phone: opt(20), email: opt(120) })

const infoSchema = z.object({
  name_en: opt(80),
  logo_path: opt(300),
  item_keywords: opt(300),
  phone: z.string().trim().min(9, '일반전화를 입력하세요').max(20),
  fax: opt(20),
  email: z.string().trim().email('이메일 형식이 올바르지 않아요').max(120).optional().or(z.literal('')),
  address: z.string().trim().min(2, '사업장 주소를 입력하세요').max(200),
  homepage_url: opt(200),
  contacts: z.array(contactSchema).max(3),
  company_intro: z.string().max(50000).optional().or(z.literal('')),
  bin_number: opt(20),
  biz_name: opt(80),
  ceo_name: opt(40),
  biz_type: opt(80),
  biz_item: opt(200),
})
export type SupplierInfoInput = z.input<typeof infoSchema>

function revalidateShop(slug: string) {
  revalidatePath('/admin/supplier-info')
  revalidatePath('/admin/seller-display')
  revalidatePath(`/minishop/${slug}`, 'layout')
}

export async function saveSupplierInfoAction(input: SupplierInfoInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')
  const parsed = infoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요' }
  const d = parsed.data
  const contacts = d.contacts
    .map((c) => ({ name: c.name || '', phone: c.phone || '', email: c.email || '' }))
    .filter((c) => c.name || c.phone || c.email)
  const first = contacts[0]

  const update = {
    item_keywords: d.item_keywords
      ? d.item_keywords
          .split(',')
          .map((k) => k.trim().replace(/^#/, ''))
          .filter(Boolean)
          .slice(0, 20)
      : null,
    phone: d.phone,
    fax: d.fax || null,
    email: d.email || null,
    address: d.address,
    homepage_url: d.homepage_url || null,
    contacts,
    // 미니샵·상세페이지의 "담당자명"은 첫 번째 담당자
    contact_name: first?.name || null,
    company_intro: d.company_intro ? sanitizeDetailHtml(d.company_intro) : null,
    bin_number: d.bin_number || null,
    biz_name: d.biz_name || null,
    ceo_name: d.ceo_name || null,
    biz_type: d.biz_type || null,
    biz_item: d.biz_item || null,
    updated_at: new Date().toISOString(),
  }
  const supabase = await getServerClient()
  let { error } = await supabase
    .from('orgs')
    .update({ ...update, name_en: d.name_en || null, logo_path: d.logo_path || null })
    .eq('id', ctx.org.id)
  // 0031 실행 전이면 영문명 없이 (로고는 원래 있던 칸)
  if (error && /name_en/.test(error.message)) {
    ;({ error } = await supabase.from('orgs').update({ ...update, logo_path: d.logo_path || null }).eq('id', ctx.org.id))
  }
  if (error) {
    return { ok: false, error: /column/.test(error.message) ? '0029 SQL을 먼저 실행해 주세요.' : '저장하지 못했어요. 다시 시도해 주세요.' }
  }
  audit(ctx, 'org.updated', 'orgs', ctx.org.id, undefined, { supplierInfo: true })
  revalidateShop(ctx.org.slug)
  return { ok: true }
}

/** 내 로그인 비밀번호 바꾸기 (공급사 운영자 본인) */
export async function changeMyPasswordAction(password: string, confirm: string): Promise<ActionResult> {
  await requireOrg()
  if (password !== confirm) return { ok: false, error: '비밀번호 확인이 맞지 않아요' }
  const strong =
    password.length >= 8 &&
    password.length <= 16 &&
    [/[a-zA-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(password)).length >= (password.length >= 10 ? 2 : 3)
  if (!strong) return { ok: false, error: '영문·숫자·특수문자 중 2가지 이상 10~16자, 또는 3가지 이상 8~16자로 입력하세요' }
  const supabase = await getServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, error: error.message.includes('same') ? '지금 비밀번호와 다른 비밀번호를 입력하세요' : '비밀번호를 바꾸지 못했어요' }
  return { ok: true }
}

const displaySchema = z.object({
  detailEnabled: z.boolean(),
  detailHtml: z.string().max(20000),
  shopEnabled: z.boolean(),
  shopHtml: z.string().max(20000),
})

/** 판매정보 표시설정 (상품 상세페이지 · 미니샵의 공급사 정보 상자) */
export async function saveSellerDisplayAction(input: z.input<typeof displaySchema>): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')
  const parsed = displaySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: '입력값을 확인하세요' }
  const d = parsed.data
  const supabase = await getServerClient()
  const { error } = await supabase
    .from('orgs')
    .update({
      seller_info_detail_enabled: d.detailEnabled,
      seller_info_detail_html: d.detailHtml.trim() ? sanitizeDetailHtml(d.detailHtml) : null,
      seller_info_shop_enabled: d.shopEnabled,
      seller_info_shop_html: d.shopHtml.trim() ? sanitizeDetailHtml(d.shopHtml) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ctx.org.id)
  if (error) return { ok: false, error: /column/.test(error.message) ? '0029 SQL을 먼저 실행해 주세요.' : '저장하지 못했어요' }
  audit(ctx, 'org.updated', 'orgs', ctx.org.id, undefined, { sellerDisplay: true })
  revalidateShop(ctx.org.slug)
  return { ok: true }
}
