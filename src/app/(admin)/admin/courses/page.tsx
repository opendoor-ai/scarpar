export const dynamic = 'force-dynamic'

import { GraduationCap } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import type { Course } from '@/types/db'

import { CoursesTable } from '@/modules/courses/components/courses-table'
import { NewCourseDialog } from '@/modules/courses/components/new-course-dialog'
import type { CourseCover, CourseListRow } from '@/modules/courses/schemas'

export default async function CoursesPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'courses')

  const supabase = await getServerClient()

  const [{ data: courses }, { data: lessonRows }, { data: enrollmentRows }] = await Promise.all([
    supabase
      .from('courses')
      .select('*, cover:media(id, path)')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false }),
    supabase.from('lessons').select('course_id').eq('org_id', ctx.org.id),
    supabase.from('enrollments').select('course_id').eq('org_id', ctx.org.id),
  ])

  const lessonCounts = new Map<string, number>()
  for (const row of (lessonRows ?? []) as { course_id: string }[]) {
    lessonCounts.set(row.course_id, (lessonCounts.get(row.course_id) ?? 0) + 1)
  }

  const enrollmentCounts = new Map<string, number>()
  for (const row of (enrollmentRows ?? []) as { course_id: string }[]) {
    enrollmentCounts.set(row.course_id, (enrollmentCounts.get(row.course_id) ?? 0) + 1)
  }

  const rows: CourseListRow[] = ((courses ?? []) as (Course & { cover: CourseCover })[]).map((course) => ({
    ...course,
    lessons_count: lessonCounts.get(course.id) ?? 0,
    enrollments_count: enrollmentCounts.get(course.id) ?? 0,
  }))

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="강의"
        description="온라인 강의, 수업, 수강생을 관리합니다."
        actions={<NewCourseDialog />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="아직 강의가 없습니다"
          description="첫 강의를 만들고 수업과 수강생을 추가하세요."
        />
      ) : (
        <CoursesTable courses={rows} />
      )}
    </div>
  )
}
