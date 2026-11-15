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
  const logo = d.logo_path && /^applications\/[\w./-]+$/.test(d.logo_path) && !d.logo_path.includes('..') ? d.logo_path : null
  const row = {
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
  }
  let { error } = await supabase.from('supplier_applications').insert({ ...row, name_en: d.name_en || null, logo_path: logo })
  // 0031 실행 전이면 영문명·로고 없이
  if (error && /name_en|logo_path/.test(error.message)) ({ error } = await supabase.from('supplier_applications').insert(row))
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
      name_en: (app as { name_en?: string | null }).name_en ?? null,
      logo_path: (app as { logo_path?: string | null }).logo_path ?? null,
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

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

/** 일반회원: 입점 신청용 회사 로고 올리기 (아직 공급사가 없어서 따로 받아요) */
export async function uploadApplicationLogoAction(formData: FormData): Promise<ActionResult<{ path: string }>> {
  const user = await requireUser()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: '로고 파일을 선택하세요.' }
  if (!LOGO_TYPES.includes(file.type)) return { ok: false, error: 'JPG·PNG·GIF·WEBP·SVG 로고만 올릴 수 있어요.' }
  if (file.size > 4 * 1024 * 1024) return { ok: false, error: '4MB 이하 로고만 올릴 수 있어요.' }
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' } as Record<string, string>)[file.type]
  const path = `applications/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await getAdminClient().storage.from('media').upload(path, file, { contentType: file.type, upsert: false })
  if (error) return { ok: false, error: '로고를 올리지 못했어요. 다시 시도해 주세요.' }
  return { ok: true, data: { path } }
}
