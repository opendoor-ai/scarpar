import type { Metadata } from 'next'

import { requireUser } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { Org, Role } from '@/types/db'

import { CreateOrgStepper } from './_components/create-org-stepper'
import { OrgPicker } from './_components/org-picker'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '회사(조직) 만들기 — Scarpar' }

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

  return (
    <div className="flex min-h-svh flex-col items-center gap-10 bg-muted px-4 py-16">
      <span className="text-xl font-semibold tracking-tight text-foreground">Scarpar</span>

      <div className="flex w-full max-w-2xl flex-col gap-10">
        {memberships.length > 0 ? <OrgPicker memberships={memberships} /> : null}

        <CreateOrgStepper
          heading={memberships.length > 0 ? '새 조직 추가하기' : '우리 회사(조직) 만들기'}
        />
      </div>
    </div>
  )
}
