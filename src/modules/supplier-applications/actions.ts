'use server'

// 공급사 입점 신청 — 신청(일반회원) / 승인·거절(플랫폼 관리자)

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth'
import { isOrgSlugTaken, provisionOrg } from '@/lib/org-provision'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

import { applicationSchema, rejectSchema, type ApplicationInput } from './schemas'

/** 예약어 — 시스템 주소와 겹치지 않게 */
const RESERVED_SLUGS = new Set(['admin', 'api', 'products', 'login', 'signup', 'track', 's', 'www', 'jadong', 'minishop'])

function splitKeywords(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((k) => k.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 20)
}

async function requirePlatformAdmin() {
  const user = await requireUser()
  const supabase = await getServerClient()
  const { data } = await supabase.rpc('is_platform_admin')
  if (!data) throw new Error('플랫폼 관리자만 할 수 있습니다.')
  return user
}

/** 일반회원: 입점 신청 */
export async function submitApplicationAction(input: ApplicationInput): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = applicationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data

  if (RESERVED_SLUGS.has(d.desired_slug)) return { ok: false, error: '쓸 수 없는 주소입니다. 다른 주소를 입력하세요.' }
  if (await isOrgSlugTaken(d.desired_slug)) return { ok: false, error: '이미 사용 중인 주소입니다. 다른 주소를 입력하세요.' }

  // 본인 권한(RLS)으로 저장 — 정책상 본인 이름의 "대기" 신청만 들어감
  const supabase = await getServerClient()
  const { error } = await supabase.from('supplier_applications').insert({
    user_id: user.id,
    company_name: d.company_name,
    desired_slug: d.desired_slug,
    business_number: d.business_number || null,
    contact_name: d.contact_name,
    phone: d.phone,
    email: d.email || user.email || null,
    address: d.address || null,
    homepage_url: d.homepage_url || null,
    item_keywords: splitKeywords(d.item_keywords),
    message: d.message || null,
  })
  if (error) {
    if (error.code === '23505') return { ok: false, error: '이미 심사 중인 신청이 있습니다.' }
    return { ok: false, error: '신청을 저장하지 못했습니다. 다시 시도해 주세요.' }
  }

  revalidatePath('/onboarding')
  revalidatePath('/admin/platform')
  return { ok: true }
}

/** 플랫폼 관리자: 승인 → 공급사(조직) 생성 + 신청자를 대표로 등록 */
export async function approveApplicationAction(id: string): Promise<ActionResult<{ orgSlug: string }>> {
  let reviewer
  try {
    reviewer = await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }

  const admin = getAdminClient()
  const { data: app } = await admin.from('supplier_applications').select('*').eq('id', id).maybeSingle()
  if (!app) return { ok: false, error: '신청을 찾을 수 없습니다.' }
  if (app.status !== 'pending') return { ok: false, error: '이미 처리된 신청입니다.' }

  const result = await provisionOrg(
    {
      name: app.company_name,
      slug: app.desired_slug,
      vertical: 'ecommerce',
      phone: app.phone,
      email: app.email,
      address: app.address,
      bin_number: app.business_number,
      contact_name: app.contact_name,
      homepage_url: app.homepage_url,
      item_keywords: app.item_keywords,
    },
    app.user_id,
  )
  if (!result.ok) return { ok: false, error: result.error }

  const now = new Date().toISOString()
  await admin
    .from('supplier_applications')
    .update({ status: 'approved', org_id: result.org.id, reviewed_by: reviewer.id, reviewed_at: now, updated_at: now })
    .eq('id', id)

  revalidatePath('/admin/platform')
  return { ok: true, data: { orgSlug: result.org.slug } }
}

/** 플랫폼 관리자: 거절 (사유는 신청자 화면에 보임) */
export async function rejectApplicationAction(id: string, reason: string): Promise<ActionResult> {
  let reviewer
  try {
    reviewer = await requirePlatformAdmin()
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
  const parsed = rejectSchema.safeParse({ id, reason })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const now = new Date().toISOString()
  const { error } = await getAdminClient()
    .from('supplier_applications')
    .update({ status: 'rejected', reject_reason: parsed.data.reason, reviewed_by: reviewer.id, reviewed_at: now, updated_at: now })
    .eq('id', id)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/platform')
  return { ok: true }
}
