export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PageProps } from '@/lib/types'
import type { Lesson } from '@/types/db'

import { CourseDetailForm } from '@/modules/courses/components/course-detail-form'
import { EnrollmentsPanel } from '@/modules/courses/components/enrollments-panel'
import { LessonsSection } from '@/modules/courses/components/lessons-section'
import type { CourseDetailRow, EnrollmentRow } from '@/modules/courses/schemas'

export default async function CourseDetailPage({ params }: PageProps<{ id: string }>) {
  const { id } = await params
  const ctx = await requireOrg()
  requireModule(ctx.org, 'courses')

  const supabase = await getServerClient()

  const [{ data: course }, { data: lessons }, { data: enrollments }] = await Promise.all([
    supabase.from('courses').select('*, cover:media(id, path)').eq('org_id', ctx.org.id).eq('id', id).maybeSingle(),
    supabase
      .from('lessons')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('course_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('enrollments')
      .select('*, customer:customers(name, phone)')
      .eq('org_id', ctx.org.id)
      .eq('course_id', id)
      .order('enrolled_at', { ascending: false }),
  ])

  if (!course) notFound()

  const courseRow = course as CourseDetailRow
  const lessonRows = (lessons ?? []) as Lesson[]
  const enrollmentRows = (enrollments ?? []) as EnrollmentRow[]

  return (
    <div className="px-6 py-6">
      <PageHeader
        title={courseRow.title}
        description={`등록일 ${new Date(courseRow.created_at).toLocaleDateString('ko-KR')}`}
        backHref="/admin/courses"
        actions={<StatusBadge kind="product" value={courseRow.status} />}
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">정보</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollmentRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex flex-col gap-6 pt-4">
          <CourseDetailForm course={courseRow} />
          <LessonsSection courseId={courseRow.id} lessons={lessonRows} />
        </TabsContent>

        <TabsContent value="enrollments" className="pt-4">
          <EnrollmentsPanel courseId={courseRow.id} enrollments={enrollmentRows} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
