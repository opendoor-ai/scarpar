'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import { toPaisa } from '@/lib/money'
import type { ActionResult } from '@/lib/types'
import type { AppointmentStatus, Customer, ServiceJob, ServiceJobStatus } from '@/types/db'
import { createOrderCore } from '@/modules/orders/create-order'

import {
  JOB_STATUS_FLOW,
  appointmentFormSchema,
  jobFormSchema,
  newJobSchema,
  type AppointmentFormValues,
  type JobFormValues,
  type NewJobValues,
} from './schemas'

type ServerClient = Awaited<ReturnType<typeof getServerClient>>

async function requireServicesCtx() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'services')
  return ctx
}

/** Finds a customer by phone within the org, or quick-creates one. */
async function resolveCustomer(
  supabase: ServerClient,
  orgId: string,
  customer: NewJobValues['customer'],
): Promise<{ id: string } | { error: string }> {
  if (customer.mode === 'existing') {
    return { id: customer.customer_id }
  }

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('org_id', orgId)
    .eq('phone', customer.customer_phone)
    .maybeSingle()

  if (existing) return { id: (existing as { id: string }).id }

  const { data, error } = await supabase
    .from('customers')
    .insert({ org_id: orgId, name: customer.customer_name, phone: customer.customer_phone })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? '고객을 추가하지 못했습니다' }

  return { id: data.id }
}

export async function searchCustomers(
  query: string,
): Promise<ActionResult<Pick<Customer, 'id' | 'name' | 'phone'>[]>> {
  const ctx = await requireServicesCtx()

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

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function createJob(input: NewJobValues): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  const parsed = newJobSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()

  const resolved = await resolveCustomer(supabase, ctx.org.id, parsed.data.customer)
  if ('error' in resolved) return { ok: false, error: resolved.error }

  const { data: jobNo, error: jobNoError } = await supabase.rpc('next_doc_number', {
    p_org: ctx.org.id,
    p_doc_type: 'job',
    p_prefix: 'JOB-',
  })

  if (jobNoError || !jobNo) return { ok: false, error: jobNoError?.message ?? '작업 번호를 만들지 못했습니다' }

  const address =
    parsed.data.address_line1 || parsed.data.address_district
      ? { line1: parsed.data.address_line1 || '', district: parsed.data.address_district || '' }
      : null

  const { data, error } = await supabase
    .from('service_jobs')
    .insert({
      org_id: ctx.org.id,
      job_no: jobNo as string,
      customer_id: resolved.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      quote_amount: toPaisa(parsed.data.quote_amount),
      scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at).toISOString() : null,
      address,
      status: 'quoted',
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '작업을 만들지 못했습니다' }

  audit(ctx, 'job.create', 'service_job', data.id, undefined, { title: parsed.data.title, job_no: jobNo })
  revalidatePath('/admin/services')

  return { ok: true, data: { id: data.id } }
}

export async function updateJob(jobId: string, input: JobFormValues): Promise<ActionResult> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  const parsed = jobFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', jobId)
    .maybeSingle()

  if (!before) return { ok: false, error: '작업을 찾을 수 없습니다' }

  const address =
    parsed.data.address_line1 || parsed.data.address_district
      ? { line1: parsed.data.address_line1 || '', district: parsed.data.address_district || '' }
      : null

  const { error } = await supabase
    .from('service_jobs')
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      quote_amount: toPaisa(parsed.data.quote_amount),
      final_amount: parsed.data.final_amount ? toPaisa(parsed.data.final_amount) : null,
      scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at).toISOString() : null,
      assigned_to: parsed.data.assigned_to ?? null,
      address,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', ctx.org.id)
    .eq('id', jobId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'job.update', 'service_job', jobId, before, parsed.data)
  revalidatePath(`/admin/services/${jobId}`)
  revalidatePath('/admin/services')

  return { ok: true }
}

export async function updateJobStatus(jobId: string, nextStatus: ServiceJobStatus): Promise<ActionResult> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  // Invoicing must go through generateInvoice() (it also creates the order) —
  // never let a plain status flip skip that.
  if (nextStatus === 'invoiced') {
    return { ok: false, error: '청구 완료는 "청구서 만들기" 버튼으로 처리하세요.' }
  }

  const supabase = await getServerClient()
  const { data: jobData } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', jobId)
    .maybeSingle()

  if (!jobData) return { ok: false, error: '작업을 찾을 수 없습니다' }

  const current = jobData as ServiceJob
  const allowed = JOB_STATUS_FLOW[current.status]
  if (!allowed.includes(nextStatus)) {
    return { ok: false, error: `작업 상태를 ${current.status}에서 ${nextStatus}(으)로 바꿀 수 없습니다` }
  }

  const { error } = await supabase
    .from('service_jobs')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('org_id', ctx.org.id)
    .eq('id', jobId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'job.status_change', 'service_job', jobId, { status: current.status }, { status: nextStatus })
  revalidatePath(`/admin/services/${jobId}`)
  revalidatePath('/admin/services')

  return { ok: true }
}

export async function generateInvoice(jobId: string): Promise<ActionResult<{ orderNo: string }>> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { data: jobData } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', jobId)
    .maybeSingle()

  if (!jobData) return { ok: false, error: '작업을 찾을 수 없습니다' }

  const job = jobData as ServiceJob
  if (job.status !== 'done') return { ok: false, error: '작업을 완료한 뒤에 청구할 수 있습니다' }

  const { data: customerData } = await supabase
    .from('customers')
    .select('id, name, phone, email')
    .eq('org_id', ctx.org.id)
    .eq('id', job.customer_id)
    .maybeSingle()

  if (!customerData) return { ok: false, error: '고객을 찾을 수 없습니다' }

  const customer = customerData as Pick<Customer, 'id' | 'name' | 'phone' | 'email'>

  try {
    const result = await createOrderCore({
      org_id: ctx.org.id,
      channel: 'manual',
      status: 'completed',
      payment_status: 'unpaid',
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email ?? null },
      delivery_charge: 0,
      discount_amount: 0,
      payment_method: 'cash',
      decrement_stock: false,
      actor_id: ctx.user.id,
      items: [
        {
          product_name: job.title,
          unit_price: job.final_amount ?? job.quote_amount ?? 0,
          qty: 1,
        },
      ],
    })

    const nextDescription = `${job.description ?? ''}\n[Invoiced: ${result.orderNo}]`.trim()

    const { error } = await supabase
      .from('service_jobs')
      .update({ status: 'invoiced', description: nextDescription, updated_at: new Date().toISOString() })
      .eq('org_id', ctx.org.id)
      .eq('id', jobId)

    if (error) return { ok: false, error: error.message }

    audit(
      ctx,
      'job.invoice',
      'service_job',
      jobId,
      { status: 'done' },
      { status: 'invoiced', order_no: result.orderNo },
    )
    revalidatePath(`/admin/services/${jobId}`)
    revalidatePath('/admin/services')

    return { ok: true, data: { orderNo: result.orderNo } }
  } catch (err) {
    // createOrderCore (src/modules/orders/create-order.ts) is a type-only
    // stub until the orders slice lands its implementation — a throw here
    // mid-build is expected, not a bug in this action.
    return { ok: false, error: err instanceof Error ? err.message : '청구서를 만들지 못했습니다' }
  }
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function createAppointment(
  jobId: string | null,
  input: AppointmentFormValues,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  const parsed = appointmentFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      org_id: ctx.org.id,
      job_id: jobId,
      customer_id: parsed.data.customer_id ?? null,
      title: parsed.data.title,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null,
      note: parsed.data.note || null,
      status: 'booked',
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '예약을 만들지 못했습니다' }

  audit(ctx, 'appointment.create', 'appointment', data.id, undefined, { job_id: jobId, title: parsed.data.title })
  if (jobId) revalidatePath(`/admin/services/${jobId}`)
  revalidatePath('/admin/services')

  return { ok: true, data: { id: data.id } }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  jobId?: string | null,
): Promise<ActionResult> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('org_id', ctx.org.id)
    .eq('id', appointmentId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'appointment.status_change', 'appointment', appointmentId, undefined, { status })
  if (jobId) revalidatePath(`/admin/services/${jobId}`)
  revalidatePath('/admin/services')

  return { ok: true }
}

export async function deleteAppointment(appointmentId: string, jobId?: string | null): Promise<ActionResult> {
  const ctx = await requireServicesCtx()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { error } = await supabase.from('appointments').delete().eq('org_id', ctx.org.id).eq('id', appointmentId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'appointment.delete', 'appointment', appointmentId)
  if (jobId) revalidatePath(`/admin/services/${jobId}`)
  revalidatePath('/admin/services')

  return { ok: true }
}
