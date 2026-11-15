'use server'

// 공급사 등급 관리 (플랫폼 관리자 전용) — 등급 만들기·고치기·지우기, 공급사 등급 바꾸기(무료 ↔ 유료)

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requirePlatformAdmin } from '@/lib/platform-admin'
import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

function refresh() {
  revalidatePath('/admin/suppliers')
  revalidatePath('/admin/products')
}

const gradeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_-]{1,29}$/, '코드는 영문 소문자로 시작하는 2~30자 (예: paid, premium)'),
  name: z.string().trim().min(1, '등급 이름을 입력하세요').max(30),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  is_paid: z.boolean(),
  jump_featured_limit: z.coerce.number().int().min(0, '0 이상').max(100, '100 이하'),
  jump_normal_limit: z.coerce.number().int().min(0, '0 이상').max(100, '100 이하'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '색상을 다시 고르세요'),
  sort_order: z.coerce.number().int().min(0).max(9999),
  is_default: z.boolean(),
})
export type GradeInput = z.input<typeof gradeSchema>

export async function saveGradeAction(input: GradeInput): Promise<ActionResult> {
  await requirePlatformAdmin()
  const parsed = gradeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요' }
  const { id, ...d } = parsed.data
  const admin = getAdminClient()
  const row = { ...d, description: d.description || null, updated_at: new Date().toISOString() }

  // 기본 등급은 하나만
  if (d.is_default) {
    const q = admin.from('supplier_grades').update({ is_default: false }).eq('is_default', true)
    await (id ? q.neq('id', id) : q)
  }
  const { error } = id
    ? await admin.from('supplier_grades').update(row).eq('id', id)
    : await admin.from('supplier_grades').insert(row)
  if (error) {
    if (error.code === '23505') return { ok: false, error: '같은 코드의 등급이 이미 있어요' }
    return { ok: false, error: '저장하지 못했어요. 0026 SQL을 실행했는지 확인해 주세요.' }
  }
  refresh()
  return { ok: true }
}

export async function deleteGradeAction(id: string): Promise<ActionResult> {
  await requirePlatformAdmin()
  const admin = getAdminClient()
  const { data } = await admin.from('supplier_grades').select('is_default').eq('id', id).maybeSingle()
  if (!data) return { ok: false, error: '등급을 찾을 수 없어요' }
  if ((data as { is_default: boolean }).is_default) return { ok: false, error: '기본 등급은 지울 수 없어요. 다른 등급을 기본으로 바꾼 뒤 지우세요.' }
  // 이 등급이던 공급사는 기본 등급으로 돌아가요 (FK on delete set null)
  const { error } = await admin.from('supplier_grades').delete().eq('id', id)
  if (error) return { ok: false, error: '지우지 못했어요' }
  refresh()
  return { ok: true }
}

const orgGradeSchema = z.object({
  orgId: z.string().uuid(),
  gradeId: z.string().uuid().nullable(),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  memo: z.string().max(500).nullable(),
})

/** 공급사 관리 기록 남기기 (0027 전이면 조용히 넘어감) */
async function logSupplier(orgId: string, kind: 'status' | 'grade' | 'info', summary: string, memo: string | null, userId: string) {
  try {
    await getAdminClient().from('supplier_admin_logs').insert({ org_id: orgId, kind, summary, memo, changed_by: userId })
  } catch {
    // 기록 실패는 무시
  }
}

/** 공급사 등급 바꾸기 (무료 → 유료 전환 등). until = 유료 기간 끝나는 날 (없으면 계속) */
export async function setOrgGradeAction(input: z.input<typeof orgGradeSchema>): Promise<ActionResult> {
  const user = await requirePlatformAdmin()
  const parsed = orgGradeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: '입력값을 확인하세요' }
  const d = parsed.data
  const admin = getAdminClient()
  const [{ data: before }, { data: grades }] = await Promise.all([
    admin.from('orgs').select('supplier_grade_id, grade_until').eq('id', d.orgId).maybeSingle(),
    admin.from('supplier_grades').select('id, name, is_default'),
  ])
  const nameOf = (id: string | null) => {
    const list = (grades ?? []) as { id: string; name: string; is_default: boolean }[]
    return (id ? list.find((g) => g.id === id) : list.find((g) => g.is_default))?.name ?? '기본 등급'
  }
  const { error } = await admin
    .from('orgs')
    .update({ supplier_grade_id: d.gradeId, grade_until: d.until, grade_memo: d.memo?.trim() || null })
    .eq('id', d.orgId)
  if (error) return { ok: false, error: '바꾸지 못했어요. 0026 SQL을 실행했는지 확인해 주세요.' }
  const prev = before as { supplier_grade_id: string | null; grade_until: string | null } | null
  await logSupplier(
    d.orgId,
    'grade',
    `${nameOf(prev?.supplier_grade_id ?? null)} → ${nameOf(d.gradeId)}${d.until ? ` (${d.until}까지)` : ''}`,
    d.memo?.trim() || null,
    user.id,
  )
  refresh()
  return { ok: true }
}

const statusSchema = z.object({
  orgId: z.string().uuid(),
  active: z.boolean(),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
})

/** 운영 상태 바꾸기 (운영중 ↔ 중지). 중지하면 공개 사이트·미니샵에서 제품이 숨겨지고, 공급사 직원은 관리자 화면에 못 들어가요. */
export async function setOrgStatusAction(input: z.input<typeof statusSchema>): Promise<ActionResult> {
  const user = await requirePlatformAdmin()
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: '입력값을 확인하세요' }
  const d = parsed.data
  const admin = getAdminClient()
  const { data: org } = await admin.from('orgs').select('slug, is_active').eq('id', d.orgId).maybeSingle()
  if (!org) return { ok: false, error: '공급사를 찾을 수 없어요' }
  const o = org as { slug: string; is_active: boolean }
  // 전자동(플랫폼) 자신은 중지할 수 없음 — 사이트 전체 제품이 숨겨지는 사고 방지
  if (!d.active && o.slug === PLATFORM_ORG_SLUG) {
    return { ok: false, error: '전자동(플랫폼) 공급사는 중지할 수 없어요. 사이트 전체 제품이 숨겨져요.' }
  }
  if (!d.active && !d.reason) return { ok: false, error: '중지 사유를 입력하세요' }
  if (o.is_active === d.active) return { ok: true }

  const now = new Date().toISOString()
  const full = await admin
    .from('orgs')
    .update({ is_active: d.active, status_reason: d.active ? null : d.reason, status_changed_at: now, updated_at: now })
    .eq('id', d.orgId)
  // 0027 실행 전이면 사유 칸 없이 상태만 바꿈
  const { error } = full.error ? await admin.from('orgs').update({ is_active: d.active, updated_at: now }).eq('id', d.orgId) : full
  if (error) return { ok: false, error: '운영 상태를 바꾸지 못했어요' }
  await logSupplier(d.orgId, 'status', d.active ? '중지 → 운영중' : '운영중 → 중지', d.reason || null, user.id)
  refresh()
  revalidatePath('/admin/platform')
  revalidatePath('/')
  revalidatePath('/products')
  return { ok: true }
}

const infoSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2, '공급사명을 2자 이상 입력하세요').max(120),
  name_en: z.string().trim().max(80).optional().or(z.literal('')),
  logo_path: z.string().trim().max(300).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().email('이메일 형식이 올바르지 않아요').max(120).optional().or(z.literal('')),
  contact_name: z.string().trim().max(60).optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  homepage_url: z.string().trim().max(200).optional().or(z.literal('')),
  bin_number: z.string().trim().max(20).optional().or(z.literal('')),
})

/** 공급사 기본 정보 고치기 (플랫폼 관리자) */
export async function updateSupplierInfoAction(input: z.input<typeof infoSchema>): Promise<ActionResult> {
  const user = await requirePlatformAdmin()
  const parsed = infoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요' }
  const { orgId, ...d } = parsed.data
  const admin = getAdminClient()
  const base = {
      name: d.name,
      logo_path: d.logo_path || null,
      phone: d.phone || null,
      email: d.email || null,
      contact_name: d.contact_name || null,
      address: d.address || null,
      homepage_url: d.homepage_url || null,
      bin_number: d.bin_number || null,
      updated_at: new Date().toISOString(),
  }
  let { error } = await admin.from('orgs').update({ ...base, name_en: d.name_en || null }).eq('id', orgId)
  if (error && /name_en/.test(error.message)) ({ error } = await admin.from('orgs').update(base).eq('id', orgId))
  if (error) return { ok: false, error: '정보를 저장하지 못했어요' }
  await logSupplier(orgId, 'info', '기본 정보 수정', null, user.id)
  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// 공급사 로그인 계정 (메인 관리자 전용) — 공급사가 직접 로그인할 계정 만들기·비밀번호 바꾸기·빼기
// ---------------------------------------------------------------------------

const MEMBER_ROLES = ['owner', 'admin', 'manager', 'staff'] as const

export interface SupplierAccount {
  userId: string
  email: string
  role: string
  lastSignInAt: string | null
  createdAt: string
}

async function findUserByEmail(email: string) {
  const admin = getAdminClient()
  // 사용자가 많아도 찾을 수 있게 여러 쪽을 넘겨 봄 (최대 10,000명)
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 1000) return null
  }
  return null
}

/** 이 공급사의 로그인 계정 목록 */
export async function listSupplierAccountsAction(orgId: string): Promise<ActionResult<SupplierAccount[]>> {
  await requirePlatformAdmin()
  if (!z.string().uuid().safeParse(orgId).success) return { ok: false, error: '잘못된 공급사예요' }
  const admin = getAdminClient()
  const { data: members, error } = await admin.from('org_members').select('user_id, role, created_at').eq('org_id', orgId)
  if (error) return { ok: false, error: '계정 목록을 불러오지 못했어요' }
  const out: SupplierAccount[] = []
  for (const m of (members ?? []) as { user_id: string; role: string; created_at: string }[]) {
    const { data } = await admin.auth.admin.getUserById(m.user_id)
    out.push({
      userId: m.user_id,
      email: data.user?.email ?? '(알 수 없음)',
      role: m.role,
      lastSignInAt: data.user?.last_sign_in_at ?? null,
      createdAt: m.created_at,
    })
  }
  return { ok: true, data: out }
}

const addAccountSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email('이메일 형식이 올바르지 않아요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 해요').max(72).optional().or(z.literal('')),
  role: z.enum(MEMBER_ROLES),
})

/**
 * 공급사 로그인 계정 추가.
 * - 이미 가입한 이메일이면 그 계정을 이 공급사 직원으로 연결 (비밀번호는 그대로)
 * - 처음 보는 이메일이면 새 계정을 만들고, 적은 초기 비밀번호로 바로 로그인할 수 있게 함
 */
export async function addSupplierAccountAction(input: z.input<typeof addAccountSchema>): Promise<ActionResult<{ created: boolean }>> {
  const me = await requirePlatformAdmin()
  const parsed = addAccountSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요' }
  const d = parsed.data
  const admin = getAdminClient()

  let user = await findUserByEmail(d.email)
  let created = false
  if (!user) {
    if (!d.password) return { ok: false, error: '처음 만드는 계정이에요. 초기 비밀번호(8자 이상)를 입력하세요.' }
    const { data, error } = await admin.auth.admin.createUser({ email: d.email, password: d.password, email_confirm: true })
    if (error || !data.user) return { ok: false, error: `계정을 만들지 못했어요: ${error?.message ?? ''}` }
    user = data.user
    created = true
  }

  const { error } = await admin
    .from('org_members')
    .upsert({ org_id: d.orgId, user_id: user.id, role: d.role }, { onConflict: 'org_id,user_id' })
  if (error) return { ok: false, error: '공급사에 연결하지 못했어요' }
  await logSupplier(d.orgId, 'info', `로그인 계정 ${created ? '생성' : '연결'}: ${d.email} (${d.role})`, null, me.id)
  refresh()
  return { ok: true, data: { created } }
}

/** 공급사 계정 비밀번호 바꾸기 (공급사가 비밀번호를 잊었을 때) */
export async function resetSupplierPasswordAction(orgId: string, userId: string, password: string): Promise<ActionResult> {
  const me = await requirePlatformAdmin()
  if (password.length < 8) return { ok: false, error: '비밀번호는 8자 이상이어야 해요' }
  const admin = getAdminClient()
  // 이 공급사의 직원 계정만
  const { data: member } = await admin.from('org_members').select('user_id').eq('org_id', orgId).eq('user_id', userId).maybeSingle()
  if (!member) return { ok: false, error: '이 공급사의 계정이 아니에요' }
  const { data: isAdminUser } = await admin.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (isAdminUser) return { ok: false, error: '메인 관리자 계정의 비밀번호는 여기서 바꿀 수 없어요' }
  const { data: u, error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: '비밀번호를 바꾸지 못했어요' }
  await logSupplier(orgId, 'info', `비밀번호 변경: ${u.user?.email ?? userId}`, null, me.id)
  return { ok: true }
}

/** 공급사에서 계정 빼기 (계정 자체는 지우지 않음) */
export async function removeSupplierAccountAction(orgId: string, userId: string): Promise<ActionResult> {
  const me = await requirePlatformAdmin()
  const admin = getAdminClient()
  const { data: owners } = await admin.from('org_members').select('user_id').eq('org_id', orgId).eq('role', 'owner')
  const ownerIds = ((owners ?? []) as { user_id: string }[]).map((o) => o.user_id)
  if (ownerIds.length === 1 && ownerIds[0] === userId) {
    return { ok: false, error: '마지막 대표(owner) 계정은 뺄 수 없어요. 다른 계정을 대표로 먼저 추가하세요.' }
  }
  const { data: u } = await admin.auth.admin.getUserById(userId)
  const { error } = await admin.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId)
  if (error) return { ok: false, error: '계정을 빼지 못했어요' }
  await logSupplier(orgId, 'info', `로그인 계정 제외: ${u.user?.email ?? userId}`, null, me.id)
  refresh()
  return { ok: true }
}
