'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import { toPaisa } from '@/lib/money'
import { randomKey, slugify } from '@/lib/utils'
import type { ActionResult } from '@/lib/types'
import type { Customer } from '@/types/db'

import {
  courseFormSchema,
  enrollCustomerSchema,
  lessonFormSchema,
  type CourseFormValues,
  type LessonFormValues,
} from './schemas'

type ServerClient = Awaited<ReturnType<typeof getServerClient>>

async function requireCoursesCtx() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'courses')
  return ctx
}

/** Slugify the title, retrying with a short random suffix on collision (org-scoped unique). */
async function uniqueCourseSlug(supabase: ServerClient, orgId: string, title: string): Promise<string> {
  const base = slugify(title) || 'course'
  let candidate = base

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from('courses')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', candidate)
      .maybeSingle()

    if (!data) return candidate
    candidate = `${base}-${randomKey(4).toLowerCase()}`
  }

  return `${base}-${randomKey(6).toLowerCase()}`
}

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

export async function createCourse(input: CourseFormValues): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const parsed = courseFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const slug = await uniqueCourseSlug(supabase, ctx.org.id, parsed.data.title)

  const { data, error } = await supabase
    .from('courses')
    .insert({
      org_id: ctx.org.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      price: toPaisa(parsed.data.price),
      cover_media_id: parsed.data.cover_media_id ?? null,
      status: parsed.data.status,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? '강의를 만들지 못했습니다' }
  }

  audit(ctx, 'course.create', 'course', data.id, undefined, { title: parsed.data.title, slug })
  revalidatePath('/admin/courses')

  return { ok: true, data: { id: data.id } }
}

export async function updateCourse(courseId: string, input: CourseFormValues): Promise<ActionResult> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const parsed = courseFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('courses')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', courseId)
    .maybeSingle()

  if (!before) return { ok: false, error: '강의를 찾을 수 없습니다' }

  const { error } = await supabase
    .from('courses')
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      price: toPaisa(parsed.data.price),
      cover_media_id: parsed.data.cover_media_id ?? null,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', ctx.org.id)
    .eq('id', courseId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'course.update', 'course', courseId, before, parsed.data)
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath('/admin/courses')

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function createLesson(
  courseId: string,
  input: LessonFormValues,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const parsed = lessonFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.org.id)
    .eq('course_id', courseId)

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      org_id: ctx.org.id,
      course_id: courseId,
      title: parsed.data.title,
      video_url: parsed.data.video_url || null,
      content: parsed.data.content || null,
      is_free: parsed.data.is_free,
      position: count ?? 0,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '수업을 추가하지 못했습니다' }

  audit(ctx, 'lesson.create', 'lesson', data.id, undefined, { course_id: courseId, ...parsed.data })
  revalidatePath(`/admin/courses/${courseId}`)

  return { ok: true, data: { id: data.id } }
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  input: LessonFormValues,
): Promise<ActionResult> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const parsed = lessonFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('lessons')
    .update({
      title: parsed.data.title,
      video_url: parsed.data.video_url || null,
      content: parsed.data.content || null,
      is_free: parsed.data.is_free,
    })
    .eq('org_id', ctx.org.id)
    .eq('id', lessonId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'lesson.update', 'lesson', lessonId, undefined, parsed.data)
  revalidatePath(`/admin/courses/${courseId}`)

  return { ok: true }
}

export async function deleteLesson(lessonId: string, courseId: string): Promise<ActionResult> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { error } = await supabase.from('lessons').delete().eq('org_id', ctx.org.id).eq('id', lessonId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'lesson.delete', 'lesson', lessonId)
  revalidatePath(`/admin/courses/${courseId}`)

  return { ok: true }
}

export async function moveLesson(
  lessonId: string,
  courseId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, position')
    .eq('org_id', ctx.org.id)
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  if (error || !lessons) return { ok: false, error: error?.message ?? '순서를 바꾸지 못했습니다' }

  const rows = lessons as { id: string; position: number }[]
  const index = rows.findIndex((lesson) => lesson.id === lessonId)
  const swapIndex = direction === 'up' ? index - 1 : index + 1

  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) {
    return { ok: false, error: '더 이상 이동할 수 없습니다' }
  }

  const current = rows[index]
  const target = rows[swapIndex]

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabase.from('lessons').update({ position: target.position }).eq('org_id', ctx.org.id).eq('id', current.id),
    supabase.from('lessons').update({ position: current.position }).eq('org_id', ctx.org.id).eq('id', target.id),
  ])

  if (error1 || error2) return { ok: false, error: error1?.message ?? error2?.message ?? '순서를 바꾸지 못했습니다' }

  audit(ctx, 'lesson.reorder', 'lesson', lessonId, undefined, { direction })
  revalidatePath(`/admin/courses/${courseId}`)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function searchCustomers(
  query: string,
): Promise<ActionResult<Pick<Customer, 'id' | 'name' | 'phone'>[]>> {
  const ctx = await requireCoursesCtx()

  const trimmed = query.trim()
  if (!trimmed) return { ok: true, data: [] }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('org_id', ctx.org.id)
    .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
    .limit(10)

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: (data ?? []) as Pick<Customer, 'id' | 'name' | 'phone'>[] }
}

export async function enrollCustomer(courseId: string, customerId: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const parsed = enrollCustomerSchema.safeParse({ customer_id: customerId })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '고객을 선택하세요' }
  }

  const supabase = await getServerClient()

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('org_id', ctx.org.id)
    .eq('course_id', courseId)
    .eq('customer_id', parsed.data.customer_id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) return { ok: false, error: '이미 수강 중인 고객입니다' }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      org_id: ctx.org.id,
      course_id: courseId,
      customer_id: parsed.data.customer_id,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '수강 등록에 실패했습니다' }

  audit(ctx, 'enrollment.create', 'enrollment', data.id, undefined, {
    course_id: courseId,
    customer_id: parsed.data.customer_id,
  })
  revalidatePath(`/admin/courses/${courseId}`)

  return { ok: true, data: { id: data.id } }
}

export async function revokeEnrollment(enrollmentId: string, courseId: string): Promise<ActionResult> {
  const ctx = await requireCoursesCtx()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'revoked' })
    .eq('org_id', ctx.org.id)
    .eq('id', enrollmentId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'enrollment.revoke', 'enrollment', enrollmentId, undefined, { status: 'revoked' })
  revalidatePath(`/admin/courses/${courseId}`)

  return { ok: true }
}
