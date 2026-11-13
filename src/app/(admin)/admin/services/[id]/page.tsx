export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import type { PageProps } from '@/lib/types'
import type { Profile } from '@/types/db'

import { AppointmentsSection } from '@/modules/services/components/appointments-section'
import { JobDetailForm } from '@/modules/services/components/job-detail-form'
import { JobStatusActions } from '@/modules/services/components/job-status-actions'
import type { AppointmentRow, JobDetailRow, TeamMember } from '@/modules/services/schemas'

export default async function JobDetailPage({ params }: PageProps<{ id: string }>) {
  const { id } = await params
  const ctx = await requireOrg()
  requireModule(ctx.org, 'services')

  const supabase = await getServerClient()

  const [{ data: jobData }, { data: appointmentsData }, { data: membersData }] = await Promise.all([
    supabase
      .from('service_jobs')
      .select('*, customer:customers(name, phone, email)')
      .eq('org_id', ctx.org.id)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('*, customer:customers(name)')
      .eq('org_id', ctx.org.id)
      .eq('job_id', id)
      .order('starts_at', { ascending: false }),
    supabase.from('org_members').select('user_id').eq('org_id', ctx.org.id),
  ])

  if (!jobData) notFound()

  const job = jobData as JobDetailRow
  const appointments = (appointmentsData ?? []) as AppointmentRow[]

  const memberIds = ((membersData ?? []) as { user_id: string }[]).map((member) => member.user_id)
  let teamMembers: TeamMember[] = []
  if (memberIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', memberIds)
    teamMembers = ((profilesData ?? []) as Pick<Profile, 'user_id' | 'full_name'>[]).map((profile) => ({
      id: profile.user_id,
      name: profile.full_name ?? '이름 없음',
    }))
  }

  return (
    <div className="px-6 py-6">
      <PageHeader
        title={job.title}
        description={job.job_no}
        backHref="/admin/services"
        actions={<StatusBadge kind="job" value={job.status} />}
      />

      <div className="mb-6">
        <JobStatusActions jobId={job.id} status={job.status} />
      </div>

      <div className="flex flex-col gap-6">
        <JobDetailForm job={job} teamMembers={teamMembers} />
        <AppointmentsSection jobId={job.id} appointments={appointments} />
      </div>
    </div>
  )
}
