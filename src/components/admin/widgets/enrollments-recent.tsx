import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { format } from 'date-fns'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

interface EnrollmentRow {
  id: string
  status: string
  enrolled_at: string
  courses: { title: string } | null
  customers: { name: string } | null
}

/** Last 8 enrollments — course + customer + StatusBadge. */
export async function EnrollmentsRecentWidget() {
  const ctx = await requireOrg()

  let enrollments: EnrollmentRow[] = []

  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('enrollments')
      .select('id, status, enrolled_at, courses(title), customers(name)')
      .eq('org_id', ctx.org.id)
      .order('enrolled_at', { ascending: false })
      .limit(8)

    enrollments = (data ?? []) as unknown as EnrollmentRow[]
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">최근 수강 신청</CardTitle>
        <Link href="/admin/courses" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {enrollments.length === 0 ? (
          <EmptyState icon={GraduationCap} title="아직 수강 신청이 없습니다" className="py-8" />
        ) : (
          <ul className="flex flex-col gap-1">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id}>
                <Link
                  href="/admin/courses"
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {enrollment.courses?.title ?? '강의'}{' '}
                    <span className="text-muted-foreground">
                      · {enrollment.customers?.name ?? '고객'}
                    </span>
                  </span>
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {format(new Date(enrollment.enrolled_at), 'MM.dd')}
                  </span>
                  <StatusBadge kind="enrollment" value={enrollment.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
