import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { getServerClient } from '@/lib/supabase/server'
import { getOrgSettings } from '@/lib/settings'
import type { Org, Role } from '@/types/db'

/** Cookie holding the active org id (docs/architecture.md §6). */
export const ORG_COOKIE = 'jadong-org'
/** 예전 이름 (원본 프로젝트 시절 저장된 쿠키도 읽음) */
export const LEGACY_ORG_COOKIE = 'scarpar-org'

export const ROLE_RANK: Record<Role, number> = {
  owner: 6,
  admin: 5,
  manager: 4,
  staff: 3,
  rider: 2,
  viewer: 1,
}

export interface OrgContext {
  user: User
  org: Org
  role: Role
  settings: Record<string, unknown>
  /** 메인(플랫폼) 관리자가 직원 등록 없이 이 공급사 관리자 화면을 대신 보고 있는지 */
  viaPlatform?: boolean
}

/** Current Supabase auth user, or null. React cache()'d per request. */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/** Redirects to /login if there's no signed-in user. */
export async function requireUser(): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * Reads the jadong-org cookie, loads the org + the caller's membership role
 * + org settings (parallel query set), and returns the full OrgContext.
 * Redirects to /onboarding if the cookie is missing or points at an org the
 * user isn't (or is no longer) a member of.
 */
export const requireOrg = cache(async (): Promise<OrgContext> => {
  const user = await requireUser()

  const cookieStore = await cookies()
  const supabase = await getServerClient()
  // 선택한 회사: 새 이름 쿠키 → 예전 이름 쿠키 → (둘 다 없으면) 내가 속한 첫 회사
  let orgId = cookieStore.get(ORG_COOKIE)?.value ?? cookieStore.get(LEGACY_ORG_COOKIE)?.value ?? null
  if (!orgId) {
    const { data } = await supabase
      .from('org_members')
      .select('org_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    orgId = (data as { org_id: string } | null)?.org_id ?? null
  }

  if (!orgId) {
    redirect('/onboarding')
  }

  const [orgResult, memberResult, settings] = await Promise.all([
    supabase.from('orgs').select('*').eq('id', orgId).single(),
    supabase.from('org_members').select('role').eq('org_id', orgId).eq('user_id', user.id).single(),
    getOrgSettings(orgId),
  ])

  const isMember = !memberResult.error && Boolean(memberResult.data)
  // 메인(플랫폼) 관리자는 직원이 아니어도, 운영 중지된 공급사라도 들어가서 관리할 수 있음
  let platformAdmin = false
  if (!isMember || !(orgResult.data as Org | null)?.is_active) {
    const { data } = await supabase.rpc('is_platform_admin')
    platformAdmin = Boolean(data)
  }

  if (orgResult.error || !orgResult.data || (!isMember && !platformAdmin)) {
    redirect('/onboarding')
  }
  if (!(orgResult.data as Org).is_active && !platformAdmin) {
    redirect('/onboarding')
  }

  return {
    user,
    org: orgResult.data as Org,
    role: isMember ? (memberResult.data as { role: Role }).role : 'owner',
    settings,
    viaPlatform: !isMember,
  }
})

/** Redirects to /admin if ctx.role is below minRole in the owner>admin>manager>staff>rider>viewer order. */
export function requireRole(ctx: OrgContext, minRole: Role): void {
  if (ROLE_RANK[ctx.role] < ROLE_RANK[minRole]) {
    redirect('/admin')
  }
}
