'use server'

import { RESERVED_SLUGS } from '@/lib/domains'
import { redirect } from 'next/navigation'

import { audit } from '@/lib/audit'
import { requireUser, type OrgContext } from '@/lib/auth'
import { setActiveOrg } from '@/lib/actions/set-org'
import { provisionOrg } from '@/lib/org-provision'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import type { Org } from '@/types/db'

import { createOrgSchema, type CreateOrgInput } from './onboarding-schemas'

/**
 * 플랫폼 관리자(전자동)가 공급사(조직)를 직접 만들 때 쓰는 기능.
 * 일반회원은 "공급사 입점 신청"(supplier-application)을 이용하고, 승인되면 자동으로 만들어집니다.
 */
export async function createOrgAction(input: CreateOrgInput): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = createOrgSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }
  }

  const { name, phone, vertical } = parsed.data
  const slug = parsed.data.slug
  // 시스템 주소와 겹치는 아이디는 쓸 수 없음
  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: '쓸 수 없는 공급사 아이디예요. 다른 아이디를 입력하세요.' }

  // 직접 생성은 플랫폼 관리자만 (일반회원은 입점 신청 → 승인)
  const supabase = await getServerClient()
  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
  if (!isPlatformAdmin) {
    return { ok: false, error: '공급사는 입점 신청 후 승인을 받아 만들어집니다.' }
  }

  const admin = getAdminClient()

  // 공급사 대표 계정: 적었으면 그 계정(없으면 새로 만듦), 안 적었으면 지금 로그인한 메인 관리자
  let ownerId = user.id
  const ownerEmail = parsed.data.ownerEmail || ''
  if (ownerEmail) {
    let found: { id: string } | null = null
    for (let page = 1; page <= 10 && !found; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      found = data?.users.find((u) => u.email?.toLowerCase() === ownerEmail) ?? null
      if (!data || data.users.length < 1000) break
    }
    if (!found) {
      const pw = parsed.data.ownerPassword || ''
      if (pw.length < 8) return { ok: false, error: '새 로그인 계정의 초기 비밀번호를 8자 이상 입력하세요.' }
      const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, password: pw, email_confirm: true })
      if (error || !data.user) return { ok: false, error: `로그인 계정을 만들지 못했어요: ${error?.message ?? ''}` }
      found = data.user
    }
    ownerId = found.id
  }

  let org: Org
  try {
    const result = await provisionOrg(
      { name, slug, vertical, phone, name_en: parsed.data.name_en || null, logo_path: parsed.data.logo_path || null },
      ownerId,
    )
    if (!result.ok) return { ok: false, error: result.error }
    org = result.org
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '공급사를 만들지 못했어요.' }
  }


  const auditCtx: OrgContext = { user, org, role: 'owner', settings: {} }
  audit(auditCtx, 'org.created', 'org', org.id, null, { vertical: org.vertical })

  // 공급사 계정을 따로 만들었으면 공급사 관리로, 아니면 새 공급사 관리자 화면으로
  if (ownerEmail) redirect('/admin/suppliers')
  await setActiveOrg(org.id)
  return { ok: true }
}
