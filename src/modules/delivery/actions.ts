'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'

import { requireOrg, requireRole, type OrgContext } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { DELIVERY_STATUS_FLOW, type DeliveryStatus } from '@/lib/status'
import { getAdapter, ConfigRequiredError } from '@/lib/couriers'
import type { ActionResult } from '@/lib/types'
import type { Delivery } from '@/types/db'
import {
  createDeliverySchema,
  assignRiderSchema,
  markPickedUpSchema,
  markInTransitSchema,
  markDeliveredSchema,
  markFailedSchema,
  markReturnedSchema,
  zoneSchema,
  riderSchema,
  settleCodSchema,
  type CreateDeliveryInput,
  type AssignRiderInput,
  type MarkDeliveredInput,
  type MarkFailedInput,
  type MarkReturnedInput,
  type ZoneInput,
  type RiderInput,
  type SettleCodInput,
} from './schemas'

type ServerSupabase = Awaited<ReturnType<typeof getServerClient>>
type DeliveryWithOrder = Delivery & { order: { id: string; order_no: string; status: string } }

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function formatAddressLine(address: { line1: string; area?: string; district: string; postcode?: string }): string {
  return [address.line1, address.area, address.district, address.postcode].filter(Boolean).join(', ')
}

async function loadDeliveryForOrg(
  supabase: ServerSupabase,
  orgId: string,
  deliveryId: string,
): Promise<DeliveryWithOrder | null> {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, order:orders(id, order_no, status)')
    .eq('id', deliveryId)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return null
  return data as unknown as DeliveryWithOrder
}

function assertTransition(current: DeliveryStatus, next: DeliveryStatus): string | null {
  if (!DELIVERY_STATUS_FLOW[current]?.includes(next)) {
    return `배송 상태를 "${current}"에서 "${next}"(으)로 바꿀 수 없습니다`
  }
  return null
}

// ===========================================================================
// Deliveries
// ===========================================================================

export async function createDeliveryAction(
  input: CreateDeliveryInput,
): Promise<ActionResult<{ id: string; delivery_no: string }>> {
  let ctx: OrgContext | undefined
  try {
    ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = createDeliverySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    }
    const data = parsed.data

    const supabase = await getServerClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_no')
      .eq('id', data.order_id)
      .eq('org_id', ctx.org.id)
      .single()

    if (orderError || !order) {
      return { ok: false, error: '주문을 찾을 수 없습니다' }
    }

    let consignmentId: string | null = null
    let trackingCode: string | null = null

    if (data.method === 'courier') {
      if (!data.courier) return { ok: false, error: '택배사를 선택하세요' }

      try {
        const adapter = getAdapter(data.courier)
        const result = await adapter.createOrder(ctx, {
          orderNo: order.order_no,
          recipientName: data.recipient_name,
          recipientPhone: data.recipient_phone,
          recipientAddress: formatAddressLine(data.address),
          district: data.address.district,
          codAmount: data.cod_amount,
          note: null,
          manualTrackingCode: data.manual_tracking_code || null,
        })
        consignmentId = result.consignmentId
        trackingCode = result.trackingCode
      } catch (err) {
        if (err instanceof ConfigRequiredError) {
          return { ok: false, error: err.message }
        }
        throw err
      }
    }

    const { data: deliveryNo, error: seqError } = await supabase.rpc('next_doc_number', {
      p_org: ctx.org.id,
      p_doc_type: 'delivery',
      p_prefix: 'DLV-',
    })

    if (seqError || !deliveryNo) {
      return { ok: false, error: '배송 번호를 만들지 못했습니다' }
    }

    const isRiderAssigned = data.method === 'rider' && !!data.rider_id
    const status: DeliveryStatus = isRiderAssigned ? 'assigned' : 'pending'

    const insertRow = {
      org_id: ctx.org.id,
      order_id: order.id,
      delivery_no: deliveryNo as string,
      method: data.method,
      rider_id: data.method === 'rider' ? data.rider_id ?? null : null,
      courier: data.method === 'courier' ? data.courier : null,
      consignment_id: consignmentId,
      tracking_code: trackingCode,
      status,
      cod_amount: data.cod_amount,
      recipient_name: data.recipient_name,
      recipient_phone: data.recipient_phone,
      address: data.address,
      zone_id: data.zone_id ?? null,
      fee: data.fee,
      otp_code: data.otp_enabled ? generateOtp() : null,
      assigned_at: isRiderAssigned ? new Date().toISOString() : null,
    }

    const { data: delivery, error: insertError } = await supabase
      .from('deliveries')
      .insert(insertRow)
      .select('id, delivery_no')
      .single()

    if (insertError || !delivery) {
      return { ok: false, error: insertError?.message ?? '배송을 등록하지 못했습니다' }
    }

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id: delivery.id,
      status,
      note: isRiderAssigned ? '배송 등록 및 배송기사 배정 완료.' : '배송 등록 완료.',
      actor_id: ctx.user.id,
    })

    await supabase.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: order.id,
      type: 'delivery',
      message: `배송 ${delivery.delivery_no} 등록 (${data.method}).`,
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.create', 'delivery', delivery.id, undefined, insertRow)
    revalidatePath('/admin/deliveries')
    revalidatePath(`/admin/orders/${order.id}`)

    return { ok: true, data: { id: delivery.id, delivery_no: delivery.delivery_no as string } }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[createDeliveryAction]', err)
    return { ok: false, error: '배송 등록 중 문제가 발생했습니다' }
  }
}

export async function assignRiderAction(input: AssignRiderInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = assignRiderSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    const { delivery_id, rider_id } = parsed.data

    const supabase = await getServerClient()
    const delivery = await loadDeliveryForOrg(supabase, ctx.org.id, delivery_id)
    if (!delivery) return { ok: false, error: '배송을 찾을 수 없습니다' }

    const transitionError = assertTransition(delivery.status, 'assigned')
    if (transitionError) return { ok: false, error: transitionError }

    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, name')
      .eq('id', rider_id)
      .eq('org_id', ctx.org.id)
      .single()
    if (riderError || !rider) return { ok: false, error: '배송기사를 찾을 수 없습니다' }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ rider_id, status: 'assigned', assigned_at: new Date().toISOString() })
      .eq('id', delivery_id)
    if (updateError) return { ok: false, error: updateError.message }

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id,
      status: 'assigned',
      note: `배송기사 ${rider.name}에게 배정.`,
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.assign', 'delivery', delivery_id, { status: delivery.status }, { rider_id, status: 'assigned' })
    revalidatePath(`/admin/deliveries/${delivery_id}`)
    revalidatePath('/admin/deliveries')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[assignRiderAction]', err)
    return { ok: false, error: '배송기사 배정 중 문제가 발생했습니다' }
  }
}

export async function markPickedUpAction(input: { delivery_id: string }): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = markPickedUpSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }

    const supabase = await getServerClient()
    const delivery = await loadDeliveryForOrg(supabase, ctx.org.id, parsed.data.delivery_id)
    if (!delivery) return { ok: false, error: '배송을 찾을 수 없습니다' }

    const transitionError = assertTransition(delivery.status, 'picked_up')
    if (transitionError) return { ok: false, error: transitionError }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'picked_up' })
      .eq('id', delivery.id)
    if (updateError) return { ok: false, error: updateError.message }

    await supabase
      .from('orders')
      .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
      .eq('id', delivery.order.id)

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id: delivery.id,
      status: 'picked_up',
      note: '집하 완료.',
      actor_id: ctx.user.id,
    })

    await supabase.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: delivery.order.id,
      type: 'delivery',
      message: '배송 집하 완료 — 출고 처리.',
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.picked_up', 'delivery', delivery.id, { status: delivery.status }, { status: 'picked_up' })
    await notify(ctx.org.id, 'order_dispatched', {
      title: `주문 ${delivery.order.order_no} 출고됨`,
      link: `/admin/orders/${delivery.order.id}`,
    })

    revalidatePath(`/admin/deliveries/${delivery.id}`)
    revalidatePath('/admin/deliveries')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[markPickedUpAction]', err)
    return { ok: false, error: '배송 상태 변경 중 문제가 발생했습니다' }
  }
}

export async function markInTransitAction(input: { delivery_id: string }): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = markInTransitSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }

    const supabase = await getServerClient()
    const delivery = await loadDeliveryForOrg(supabase, ctx.org.id, parsed.data.delivery_id)
    if (!delivery) return { ok: false, error: '배송을 찾을 수 없습니다' }

    const transitionError = assertTransition(delivery.status, 'in_transit')
    if (transitionError) return { ok: false, error: transitionError }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'in_transit' })
      .eq('id', delivery.id)
    if (updateError) return { ok: false, error: updateError.message }

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id: delivery.id,
      status: 'in_transit',
      note: '배송 중.',
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.in_transit', 'delivery', delivery.id, { status: delivery.status }, { status: 'in_transit' })
    revalidatePath(`/admin/deliveries/${delivery.id}`)
    revalidatePath('/admin/deliveries')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[markInTransitAction]', err)
    return { ok: false, error: '배송 상태 변경 중 문제가 발생했습니다' }
  }
}

export async function markDeliveredAction(input: MarkDeliveredInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = markDeliveredSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    const { delivery_id, otp, cod_collected } = parsed.data

    const supabase = await getServerClient()
    const delivery = await loadDeliveryForOrg(supabase, ctx.org.id, delivery_id)
    if (!delivery) return { ok: false, error: '배송을 찾을 수 없습니다' }

    const transitionError = assertTransition(delivery.status, 'delivered')
    if (transitionError) return { ok: false, error: transitionError }

    if (delivery.otp_code && delivery.otp_code !== (otp ?? '').trim()) {
      return { ok: false, error: '인증 번호가 맞지 않습니다' }
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        delivered_at: now,
        cod_collected,
        cod_collected_at: cod_collected ? now : null,
      })
      .eq('id', delivery.id)
    if (updateError) return { ok: false, error: updateError.message }

    if (cod_collected && delivery.method === 'rider' && delivery.rider_id && delivery.cod_amount > 0) {
      const { data: rider } = await supabase
        .from('riders')
        .select('cash_on_hand')
        .eq('id', delivery.rider_id)
        .single()

      if (rider) {
        await supabase
          .from('riders')
          .update({ cash_on_hand: rider.cash_on_hand + delivery.cod_amount })
          .eq('id', delivery.rider_id)
      }
    }

    await supabase.from('orders').update({ status: 'delivered', delivered_at: now }).eq('id', delivery.order.id)

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id: delivery.id,
      status: 'delivered',
      note: cod_collected ? '배송 완료, 착불금 수금.' : '배송 완료.',
      actor_id: ctx.user.id,
    })

    await supabase.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: delivery.order.id,
      type: 'delivery',
      message: '배송 완료.',
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.delivered', 'delivery', delivery.id, { status: delivery.status }, { status: 'delivered', cod_collected })
    await notify(ctx.org.id, 'order_delivered', {
      title: `주문 ${delivery.order.order_no} 배송 완료`,
      link: `/admin/orders/${delivery.order.id}`,
    })

    revalidatePath(`/admin/deliveries/${delivery.id}`)
    revalidatePath('/admin/deliveries')
    revalidatePath('/admin/cod')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[markDeliveredAction]', err)
    return { ok: false, error: '배송 완료 처리 중 문제가 발생했습니다' }
  }
}

export async function markFailedAction(input: MarkFailedInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = markFailedSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    const { delivery_id, reason } = parsed.data

    const supabase = await getServerClient()
    const delivery = await loadDeliveryForOrg(supabase, ctx.org.id, delivery_id)
    if (!delivery) return { ok: false, error: '배송을 찾을 수 없습니다' }

    const transitionError = assertTransition(delivery.status, 'failed')
    if (transitionError) return { ok: false, error: transitionError }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'failed', failed_reason: reason })
      .eq('id', delivery.id)
    if (updateError) return { ok: false, error: updateError.message }

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id: delivery.id,
      status: 'failed',
      note: reason,
      actor_id: ctx.user.id,
    })

    await supabase.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: delivery.order.id,
      type: 'delivery',
      message: `배송 실패: ${reason}`,
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.failed', 'delivery', delivery.id, { status: delivery.status }, { status: 'failed', reason })
    revalidatePath(`/admin/deliveries/${delivery.id}`)
    revalidatePath('/admin/deliveries')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[markFailedAction]', err)
    return { ok: false, error: '배송 실패 처리 중 문제가 발생했습니다' }
  }
}

export async function markReturnedAction(input: MarkReturnedInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = markReturnedSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }
    const { delivery_id, note } = parsed.data

    const supabase = await getServerClient()
    const delivery = await loadDeliveryForOrg(supabase, ctx.org.id, delivery_id)
    if (!delivery) return { ok: false, error: '배송을 찾을 수 없습니다' }

    const transitionError = assertTransition(delivery.status, 'returned')
    if (transitionError) return { ok: false, error: transitionError }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'returned' })
      .eq('id', delivery.id)
    if (updateError) return { ok: false, error: updateError.message }

    await supabase.from('orders').update({ status: 'returned' }).eq('id', delivery.order.id)

    await supabase.from('delivery_events').insert({
      org_id: ctx.org.id,
      delivery_id: delivery.id,
      status: 'returned',
      note: note || 'Returned.',
      actor_id: ctx.user.id,
    })

    await supabase.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: delivery.order.id,
      type: 'delivery',
      message: note ? `반송: ${note}` : '반송 처리.',
      actor_id: ctx.user.id,
    })

    audit(ctx, 'delivery.returned', 'delivery', delivery.id, { status: delivery.status }, { status: 'returned' })
    revalidatePath(`/admin/deliveries/${delivery.id}`)
    revalidatePath('/admin/deliveries')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[markReturnedAction]', err)
    return { ok: false, error: '반송 처리 중 문제가 발생했습니다' }
  }
}

// ===========================================================================
// Delivery zones
// ===========================================================================

export async function upsertZoneAction(input: ZoneInput): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'manager')

    const parsed = zoneSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    const { id, eta_text, ...rest } = parsed.data

    const supabase = await getServerClient()
    const row = { ...rest, eta_text: eta_text || null, org_id: ctx.org.id }

    if (id) {
      const { data: before } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('id', id)
        .eq('org_id', ctx.org.id)
        .single()

      const { data, error } = await supabase
        .from('delivery_zones')
        .update(row)
        .eq('id', id)
        .eq('org_id', ctx.org.id)
        .select('id')
        .single()

      if (error || !data) return { ok: false, error: error?.message ?? '배송 지역을 찾을 수 없습니다' }
      audit(ctx, 'delivery_zone.update', 'delivery_zone', id, before, row)
      revalidatePath('/admin/delivery-zones')
      return { ok: true, data: { id } }
    }

    const { data, error } = await supabase.from('delivery_zones').insert(row).select('id').single()
    if (error || !data) return { ok: false, error: error?.message ?? '배송 지역을 만들지 못했습니다' }

    audit(ctx, 'delivery_zone.create', 'delivery_zone', data.id, undefined, row)
    revalidatePath('/admin/delivery-zones')
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[upsertZoneAction]', err)
    return { ok: false, error: '배송 지역 저장 중 문제가 발생했습니다' }
  }
}

export async function deleteZoneAction(input: { id: string }): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'manager')
    if (!input?.id) return { ok: false, error: '배송 지역 정보가 없습니다' }

    const supabase = await getServerClient()
    const { data: before } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('id', input.id)
      .eq('org_id', ctx.org.id)
      .single()

    const { error } = await supabase.from('delivery_zones').delete().eq('id', input.id).eq('org_id', ctx.org.id)
    if (error) return { ok: false, error: error.message }

    audit(ctx, 'delivery_zone.delete', 'delivery_zone', input.id, before, undefined)
    revalidatePath('/admin/delivery-zones')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[deleteZoneAction]', err)
    return { ok: false, error: '배송 지역 삭제 중 문제가 발생했습니다' }
  }
}

// ===========================================================================
// Riders
// ===========================================================================

export async function upsertRiderAction(input: RiderInput): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = riderSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    const { id, vehicle, user_id, ...rest } = parsed.data

    const supabase = await getServerClient()
    const row = { ...rest, vehicle: vehicle || null, user_id: user_id || null, org_id: ctx.org.id }

    if (id) {
      const { data: before } = await supabase.from('riders').select('*').eq('id', id).eq('org_id', ctx.org.id).single()
      const { data, error } = await supabase
        .from('riders')
        .update(row)
        .eq('id', id)
        .eq('org_id', ctx.org.id)
        .select('id')
        .single()

      if (error || !data) return { ok: false, error: error?.message ?? '배송기사를 찾을 수 없습니다' }
      audit(ctx, 'rider.update', 'rider', id, before, row)
      revalidatePath('/admin/riders')
      return { ok: true, data: { id } }
    }

    const { data, error } = await supabase.from('riders').insert(row).select('id').single()
    if (error || !data) return { ok: false, error: error?.message ?? '배송기사를 추가하지 못했습니다' }

    audit(ctx, 'rider.create', 'rider', data.id, undefined, row)
    revalidatePath('/admin/riders')
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[upsertRiderAction]', err)
    return { ok: false, error: '배송기사 저장 중 문제가 발생했습니다' }
  }
}

export async function deactivateRiderAction(input: { id: string }): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    if (!input?.id) return { ok: false, error: '배송기사 정보가 없습니다' }

    const supabase = await getServerClient()
    const { error } = await supabase
      .from('riders')
      .update({ is_active: false })
      .eq('id', input.id)
      .eq('org_id', ctx.org.id)
    if (error) return { ok: false, error: error.message }

    audit(ctx, 'rider.deactivate', 'rider', input.id, { is_active: true }, { is_active: false })
    revalidatePath('/admin/riders')
    return { ok: true }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[deactivateRiderAction]', err)
    return { ok: false, error: '배송기사 비활성화 중 문제가 발생했습니다' }
  }
}

// ===========================================================================
// COD settlement
// ===========================================================================

export async function settleCodAction(input: SettleCodInput): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const parsed = settleCodSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
    const { rider_id, delivery_ids, note } = parsed.data

    const supabase = await getServerClient()

    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select('id, cash_on_hand')
      .eq('id', rider_id)
      .eq('org_id', ctx.org.id)
      .single()
    if (riderError || !rider) return { ok: false, error: '배송기사를 찾을 수 없습니다' }

    // Never trust client-supplied amounts (docs/conventions.md) — recompute
    // from the org's own unsettled, COD-collected deliveries for this rider.
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id, cod_amount')
      .eq('org_id', ctx.org.id)
      .eq('rider_id', rider_id)
      .eq('cod_collected', true)
      .is('settlement_id', null)
      .in('id', delivery_ids)

    if (deliveriesError || !deliveries || deliveries.length === 0) {
      return { ok: false, error: '정산할 배송이 없습니다' }
    }

    const matchedIds = deliveries.map((delivery) => delivery.id as string)
    const amount = deliveries.reduce((sum, delivery) => sum + (delivery.cod_amount as number), 0)

    const { data: settlement, error: settlementError } = await supabase
      .from('cod_settlements')
      .insert({
        org_id: ctx.org.id,
        rider_id,
        amount,
        delivery_ids: matchedIds,
        note: note || null,
        settled_by: ctx.user.id,
      })
      .select('id')
      .single()

    if (settlementError || !settlement) {
      return { ok: false, error: settlementError?.message ?? '정산을 만들지 못했습니다' }
    }

    await supabase.from('deliveries').update({ settlement_id: settlement.id }).in('id', matchedIds)
    await supabase
      .from('riders')
      .update({ cash_on_hand: Math.max(0, rider.cash_on_hand - amount) })
      .eq('id', rider_id)

    audit(ctx, 'cod_settlement.create', 'cod_settlement', settlement.id, undefined, {
      rider_id,
      amount,
      delivery_ids: matchedIds,
    })

    revalidatePath('/admin/cod')
    return { ok: true, data: { id: settlement.id } }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[settleCodAction]', err)
    return { ok: false, error: '착불 정산 중 문제가 발생했습니다' }
  }
}
