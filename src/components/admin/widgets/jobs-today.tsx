import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { format } from 'date-fns'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

interface ServiceJobRow {
  id: string
  job_no: string
  title: string
  status: string
  scheduled_at: string | null
}

/** Service jobs scheduled for today. */
export async function JobsTodayWidget() {
  const ctx = await requireOrg()

  let jobs: ServiceJobRow[] = []

  try {
    const supabase = await getServerClient()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    const { data } = await supabase
      .from('service_jobs')
      .select('id, job_no, title, status, scheduled_at')
      .eq('org_id', ctx.org.id)
      .gte('scheduled_at', startOfToday.toISOString())
      .lt('scheduled_at', startOfTomorrow.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(8)

    jobs = (data ?? []) as ServiceJobRow[]
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">오늘 작업</CardTitle>
        <Link href="/admin/services" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {jobs.length === 0 ? (
          <EmptyState icon={Wrench} title="오늘 예정된 작업이 없습니다" className="py-8" />
        ) : (
          <ul className="flex flex-col gap-1">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/admin/services/${job.id}`}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{job.title}</span>
                  {job.scheduled_at && (
                    <span className="shrink-0 text-2xs text-muted-foreground">
                      {format(new Date(job.scheduled_at), 'HH:mm')}
                    </span>
                  )}
                  <StatusBadge kind="job" value={job.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
