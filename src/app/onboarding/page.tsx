import type { Metadata } from 'next'

import { requireUser } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { Org, Role } from '@/types/db'

import { SITE_NAME } from '@/lib/site'
import { ApplicationForm } from '@/modules/supplier-applications/components/application-form'
import { ApplicationStatus, type MyApplication } from '@/modules/supplier-applications/components/application-status'

import { CreateOrgStepper } from './_components/create-org-stepper'
import { OrgPicker } from './_components/org-picker'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '공급사 입점 신청' }

interface Membership {
  org: Org
  role: Role
}

/**
 * Two plain queries (no PostgREST embedding) to match the established
 * pattern in src/lib/auth.ts / set-org.ts.
 */
async function loadMemberships(userId: string): Promise<Membership[]> {
  const supabase = await getServerClient()

  const { data: memberRows } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)

  const rows = (memberRows ?? []) as { org_id: string; role: Role }[]
  if (rows.length === 0) return []

  const { data: orgRows } = await supabase
    .from('orgs')
    .select('*')
    .in(
      'id',
      rows.map((r) => r.org_id),
    )
    .eq('is_active', true)

  const orgs = (orgRows ?? []) as Org[]
  const roleByOrgId = new Map(rows.map((r) => [r.org_id, r.role]))

  return orgs
    .map((org) => ({ org, role: roleByOrgId.get(org.id) }))
    .filter((m): m is Membership => Boolean(m.role))
}

export default async function OnboardingPage() {
  const user = await requireUser()
  const memberships = await loadMemberships(user.id)

  const supabase = await getServerClient()
  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')

  // 일반회원: 내 최근 입점 신청 상태
  let latest: MyApplication | null = null
  if (!isPlatformAdmin) {
    const { data } = await supabase
      .from('supplier_applications')
      .select('id, company_name, desired_slug, status, reject_reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    latest = (data as MyApplication | null) ?? null
  }
  const hasPending = latest?.status === 'pending'

  return (
    <div className="flex min-h-svh flex-col items-center gap-10 bg-muted px-4 py-16">
      <span className="text-xl font-semibold tracking-tight text-foreground">{SITE_NAME}</span>

      <div className="flex w-full max-w-2xl flex-col gap-6">
        {memberships.length > 0 ? <OrgPicker memberships={memberships} /> : null}

        {isPlatformAdmin ? (
          // 플랫폼 관리자는 공급사를 직접 만들 수 있음
          <CreateOrgStepper heading="공급사 생성" />
        ) : (
          <>
            {latest ? <ApplicationStatus application={latest} /> : null}
            {!hasPending ? <ApplicationForm defaultEmail={user.email ?? undefined} /> : null}
          </>
        )}
      </div>
    </div>
  )
}
