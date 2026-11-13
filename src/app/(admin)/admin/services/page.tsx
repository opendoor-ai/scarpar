export const dynamic = 'force-dynamic'

import { endOfDay, startOfDay } from 'date-fns'
import { Wrench } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import type { Profile, ServiceJob } from '@/types/db'

import { JobStatusTabs } from '@/modules/services/components/job-status-tabs'
import { JobsTable } from '@/modules/services/components/jobs-table'
import { NewJobDialog } from '@/modules/services/components/new-job-dialog'
import { TodayAppointmentsCard } from '@/modules/services/components/today-appointments-card'
import type { AppointmentRow, JobListRow } from '@/modules/services/schemas'

// Hand-rolled rather than the shared PageProps<TParams, TSearchParams> helper:
// `{ status?: string }` is an all-optional object literal, which doesn't satisfy
// PageProps' `TSearchParams extends Record<string, string | string[] | undefined>`
// constraint (TS2344) — matches the workaround used in the listings list page.
interface ServicesPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'services')

  const { status } = await searchParams

  const supabase = await getServerClient()

  let jobsQuery = supabase
    .from('service_jobs')
    .select('*, customer:customers(name, phone)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    jobsQuery = jobsQuery.eq('status', status)
  }

  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  const [{ data: jobsData }, { data: membersData }, { data: todayData }] = await Promise.all([
    jobsQuery,
    supabase.from('org_members').select('user_id').eq('org_id', ctx.org.id),
    supabase
      .from('appointments')
      .select('*, customer:customers(name)')
      .eq('org_id', ctx.org.id)
      .gte('starts_at', todayStart)
      .lte('starts_at', todayEnd)
      .order('starts_at', { ascending: true }),
  ])

  const memberIds = ((membersData ?? []) as { user_id: string }[]).map((member) => member.user_id)
  let profileMap = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', memberIds)
    profileMap = new Map(
      ((profilesData ?? []) as Pick<Profile, 'user_id' | 'full_name'>[]).map((profile) => [
        profile.user_id,
        profile.full_name ?? '이름 없음',
      ]),
    )
  }

  const jobs: JobListRow[] = (
    (jobsData ?? []) as (ServiceJob & { customer: { name: string; phone: string } | null })[]
  ).map((job) => ({
    ...job,
    assigned_to_name: job.assigned_to ? (profileMap.get(job.assigned_to) ?? '알 수 없음') : null,
  }))

  const todayAppointments = (todayData ?? []) as AppointmentRow[]

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="서비스 작업"
        description="작업, 견적, 예약을 관리합니다."
        actions={<NewJobDialog />}
      />

      <TodayAppointmentsCard appointments={todayAppointments} />

      <div className="mb-4">
        <JobStatusTabs current={status ?? 'all'} />
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={Wrench} title="아직 작업이 없습니다" description="첫 작업을 만들어 보세요." />
      ) : (
        <JobsTable jobs={jobs} />
      )}
    </div>
  )
}
