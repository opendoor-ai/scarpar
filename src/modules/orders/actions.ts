'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireOrg, requireRole, type OrgContext } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { ORDER_STATUS_FLOW } from '@/lib/status'
import { toMinor, formatMoney } from '@/lib/money'
import type { ActionResult } from '@/lib/types'
import type { Order, OrderStatus, Payment, PaymentStatus, ReturnStatus, RiskLevel } from '@/types/db'
// Contract owned by the discounts slice — see docs/conventions.md ("own only your
// files") and the New Order form brief. Not yet built as of this pass (src/modules/
// discounts/ only has module.config.ts); this import is the agreed cross-slice
// contract and will resolve once that slice lands its validate.ts.
import { validateDiscountCode } from '@/modules/discounts/validate'

import { createOrderCore, applyOrderInventory, type CreateOrderItemInput } from './create-order'
import {
  CreateManualOrderSchema,
  CreateReturnSchema,
  RecordPaymentSchema,
  RefundReturnSchema,
  RejectPaymentSchema,
  RETURN_STATUS_FLOW,
  UpdateOrderNoteSchema,
  UpdateOrderStatusSchema,
  UpdateOrderTagsSchema,
  UpdateReturnStatusSchema,
  UpdateRiskSchema,
  type CreateManualOrderInput,
  type CreateReturnInput,
  type RecordPaymentInput,
  type RefundReturnInput,
  type RejectPaymentInput,
  type UpdateOrderNoteInput,
  type UpdateOrderStatusInput,
  type UpdateOrderTagsInput,
  type UpdateReturnStatusInput,
  type UpdateRiskInput,
} from './schemas'

// ---------------------------------------------------------------------------
// next/navigation's redirect() (used by requireOrg/requireRole) throws a
// special error carrying a `NEXT_REDIRECT` digest that the framework relies on
// to actually perform the redirect. Every action below wraps its body in
// try/catch to turn thrown errors into ActionResult — without this guard that
// catch would swallow the redirect and silently turn it into a normal error
// return instead of navigating. Always call this first in a catch block.
// ---------------------------------------------------------------------------
function rethrowIfRedirect(err: unknown): void {
  if (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  ) {
    throw err
  }
}

function errMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

// ---------------------------------------------------------------------------
// Search — customer picker + item builder on the New Order form
// ---------------------------------------------------------------------------

export interface CustomerSearchResult {
  id: string
  name: string
  phone: string
  email: string | null
  total_spent: number
  orders_count: number
  is_blocked: boolean
}

export async function searchCustomersAction(query: string): Promise<ActionResult<CustomerSearchResult[]>> {
  try {
    const ctx = await requireOrg()
    const q = query.trim().replace(/[%,]/g, ' ').trim()
    if (!q) return { ok: true, data: [] }

    const supabase = await getServerClient()
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, email, total_spent, orders_count, is_blocked')
      .eq('org_id', ctx.org.id)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order('last_order_at', { ascending: false, nullsFirst: false })
      .limit(10)

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: (data ?? []) as CustomerSearchResult[] }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to search customers') }
  }
}

export interface ProductSearchVariant {
  id: string
  name: string
  sku: string | null
  price: number
  stock_qty: number
}

export interface ProductSearchResult {
  id: string
  name: string
  sku: string | null
  price: number
  stock_qty: number
  track_stock: boolean
  allow_backorder: boolean
  variants: ProductSearchVariant[]
}

interface ProductSearchRow {
  id: string
  name: string
  sku: string | null
  price: number
  stock_qty: number
  track_stock: boolean
  allow_backorder: boolean
  product_variants: ProductSearchVariant[] | null
}

export async function searchProductsAction(query: string): Promise<ActionResult<ProductSearchResult[]>> {
  try {
    const ctx = await requireOrg()
    const q = query.trim().replace(/[%,]/g, ' ').trim()

    const supabase = await getServerClient()
    let builder = supabase
      .from('products')
      .select(
        'id, name, sku, price, stock_qty, track_stock, allow_backorder, product_variants(id, name, sku, price, stock_qty)',
      )
      .eq('org_id', ctx.org.id)
      .eq('status', 'active')
      .order('name')
      .limit(20)

    if (q) {
      builder = builder.or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
    }

    const { data, error } = await builder
    if (error) return { ok: false, error: error.message }

    const rows = (data ?? []) as unknown as ProductSearchRow[]
    const results: ProductSearchResult[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      price: row.price,
      stock_qty: row.stock_qty,
      track_stock: row.track_stock,
      allow_backorder: row.allow_backorder,
      variants: row.product_variants ?? [],
    }))

    return { ok: true, data: results }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to search products') }
  }
}

// ---------------------------------------------------------------------------
// Manual order creation
// ---------------------------------------------------------------------------

interface ResolvedItems {
  resolvedItems: CreateOrderItemInput[]
  productIds: string[]
  categoryIds: string[]
}

/** Re-prices catalog-linked lines from the DB — never trusts the client's unit_price
 *  for a product/variant it can still resolve. Custom lines (no product_id, or an id
 *  that no longer resolves) keep the staff-entered price since there's no catalog
 *  price to verify against. */
async function resolveServerVerifiedItems(
  admin: SupabaseClient,
  orgId: string,
  items: CreateManualOrderInput['items'],
): Promise<ResolvedItems> {
  const resolvedItems: CreateOrderItemInput[] = []
  const productIds: string[] = []
  const categoryIds: string[] = []

  for (const item of items) {
    if (item.variant_id) {
      const { data: variant } = await admin
        .from('product_variants')
        .select('id, name, sku, price, product_id, products(name, category_id)')
        .eq('org_id', orgId)
        .eq('id', item.variant_id)
        .maybeSingle()

      if (variant) {
        const productRow = variant.products as unknown as { name: string; category_id: string | null } | null
        resolvedItems.push({
          product_id: variant.product_id as string,
          variant_id: variant.id as string,
          product_name: productRow?.name ?? item.product_name,
          variant_name: variant.name as string,
          sku: (variant.sku as string | null) ?? null,
          unit_price: variant.price as number,
          qty: item.qty,
        })
        productIds.push(variant.product_id as string)
        if (productRow?.category_id) categoryIds.push(productRow.category_id)
        continue
      }
    }

    if (item.product_id) {
      const { data: product } = await admin
        .from('products')
        .select('id, name, sku, price, category_id')
        .eq('org_id', orgId)
        .eq('id', item.product_id)
        .maybeSingle()

      if (product) {
        resolvedItems.push({
          product_id: product.id as string,
          variant_id: null,
          product_name: product.name as string,
          sku: (product.sku as string | null) ?? null,
          unit_price: product.price as number,
          qty: item.qty,
        })
        productIds.push(product.id as string)
        if (product.category_id) categoryIds.push(product.category_id as string)
        continue
      }
    }

    // No catalog link (or it no longer resolves) — a free-text/custom line; trust
    // the staff-entered price, there is nothing server-side to verify it against.
    resolvedItems.push({
      product_id: null,
      variant_id: null,
      product_name: item.product_name,
      variant_name: item.variant_name || null,
      sku: item.sku || null,
      unit_price: item.unit_price,
      qty: item.qty,
    })
  }

  return { resolvedItems, productIds, categoryIds }
}

async function resolveDeliveryCharge(
  admin: SupabaseClient,
  orgId: string,
  deliveryZoneId: string | undefined,
  manualCharge: number | undefined,
): Promise<number> {
  if (deliveryZoneId) {
    const { data: zone } = await admin
      .from('delivery_zones')
      .select('charge')
      .eq('org_id', orgId)
      .eq('id', deliveryZoneId)
      .maybeSingle()
    if (zone) return zone.charge as number
  }
  return manualCharge ?? 0
}

export async function createManualOrderAction(
  input: CreateManualOrderInput,
): Promise<ActionResult<{ orderId: string; orderNo: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = CreateManualOrderSchema.parse(input)

    const admin = getAdminClient()

    const { resolvedItems, productIds, categoryIds } = await resolveServerVerifiedItems(
      admin,
      ctx.org.id,
      parsed.items,
    )

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.unit_price * item.qty, 0)

    let discountAmount = 0
    let discountCode: string | undefined
    if (parsed.discount_code) {
      const result = await validateDiscountCode(ctx.org.id, parsed.discount_code, subtotal, productIds, categoryIds)
      if (!result.ok) {
        return { ok: false, error: result.reason }
      }
      discountAmount = result.amount
      discountCode = parsed.discount_code
    }

    const deliveryCharge = await resolveDeliveryCharge(
      admin,
      ctx.org.id,
      parsed.delivery_zone_id,
      parsed.manual_delivery_charge,
    )

    const advanceDue = parsed.advance_amount ? toMinor(parsed.advance_amount) : 0

    const result = await createOrderCore({
      org_id: ctx.org.id,
      channel: 'manual',
      status: 'pending',
      payment_status: 'unpaid',
      customer: {
        id: parsed.customer.id,
        name: parsed.customer.name,
        phone: parsed.customer.phone,
        email: parsed.customer.email,
      },
      address: {
        line1: parsed.address.line1,
        area: parsed.address.area ?? null,
        district: parsed.address.district,
        postcode: parsed.address.postcode ?? null,
      },
      delivery_zone_id: parsed.delivery_zone_id ?? null,
      delivery_charge: deliveryCharge,
      items: resolvedItems,
      discount_code: discountCode ?? null,
      discount_amount: discountAmount,
      tax_amount: 0,
      advance_due: advanceDue,
      advance_paid: 0,
      payment_method: parsed.payment_method,
      risk_level: null,
      risk_note: null,
      note_customer: null,
      note_internal: parsed.note_internal ?? null,
      source_meta: null,
      actor_id: ctx.user.id,
      decrement_stock: false,
    })

    audit(ctx, 'order.create', 'order', result.orderId, undefined, {
      order_no: result.orderNo,
      total: result.total,
      channel: 'manual',
    })

    await notify(ctx.org.id, 'order_placed', {
      title: `새 주문 ${result.orderNo}`,
      body: `${formatMoney(result.total)} — ${parsed.customer.name}`,
      link: `/admin/orders/${result.orderId}`,
    })

    if (parsed.confirm_immediately) {
      await transitionOrderStatus(ctx, result.orderId, 'confirmed')
    }

    revalidatePath('/admin/orders')

    return { ok: true, data: { orderId: result.orderId, orderNo: result.orderNo } }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to create order') }
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const STATUS_STAMP_FIELD: Partial<Record<OrderStatus, string>> = {
  confirmed: 'confirmed_at',
  dispatched: 'dispatched_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
}

/** Shared by updateOrderStatusAction and the return-refund "close out the order"
 *  step. Guards against illegal transitions via ORDER_STATUS_FLOW, stamps the
 *  matching timestamp column, writes a timeline event, applies inventory
 *  side-effects (confirm -> 'out', cancel-from-confirmed/packed -> 'restore'),
 *  audits, and notifies on dispatch/delivery. */
async function transitionOrderStatus(
  ctx: OrgContext,
  orderId: string,
  nextStatus: OrderStatus,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', orderId)
    .single()

  if (error || !data) return { ok: false, error: '주문을 찾을 수 없습니다' }
  const order = data as Order

  const allowed = ORDER_STATUS_FLOW[order.status] ?? []
  if (!allowed.includes(nextStatus)) {
    return { ok: false, error: `주문 상태를 ${order.status}에서 ${nextStatus}(으)로 바꿀 수 없습니다` }
  }

  const nowIso = new Date().toISOString()
  const updatePayload: Record<string, unknown> = { status: nextStatus }
  const stampField = STATUS_STAMP_FIELD[nextStatus]
  if (stampField) updatePayload[stampField] = nowIso

  const { error: updateError } = await admin.from('orders').update(updatePayload).eq('id', orderId)
  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('order_events').insert({
    org_id: ctx.org.id,
    order_id: orderId,
    type: 'status',
    message: `상태 변경: ${order.status} -> ${nextStatus}`,
    data: { from: order.status, to: nextStatus },
    actor_id: ctx.user.id,
  })

  if (nextStatus === 'confirmed') {
    await applyOrderInventory(orderId, 'out', ctx.user.id)
  } else if (nextStatus === 'cancelled' && order.status !== 'pending') {
    await applyOrderInventory(orderId, 'restore', ctx.user.id)
  }

  audit(ctx, 'order.status_change', 'order', orderId, { status: order.status }, { status: nextStatus })

  if (nextStatus === 'dispatched') {
    await notify(ctx.org.id, 'order_dispatched', {
      title: `주문 ${order.order_no} 출고됨`,
      link: `/admin/orders/${orderId}`,
    })
  } else if (nextStatus === 'delivered') {
    await notify(ctx.org.id, 'order_delivered', {
      title: `주문 ${order.order_no} 배송 완료`,
      link: `/admin/orders/${orderId}`,
    })
  }

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')

  return { ok: true, data: { status: nextStatus } }
}

/** Best-effort variant for callers (returns refund flow) that shouldn't fail their
 *  own action just because the order's current status makes the target transition
 *  illegal (e.g. already 'completed'). */
async function tryTransitionOrderStatus(ctx: OrgContext, orderId: string, nextStatus: OrderStatus): Promise<void> {
  const result = await transitionOrderStatus(ctx, orderId, nextStatus)
  if (!result.ok) {
    console.warn('[orders] non-fatal: could not transition order status', orderId, nextStatus, result.error)
  }
}

export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput,
): Promise<ActionResult<{ status: OrderStatus }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = UpdateOrderStatusSchema.parse(input)
    return await transitionOrderStatus(ctx, parsed.orderId, parsed.nextStatus)
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to update order status') }
  }
}

// ---------------------------------------------------------------------------
// Payments — recordPayment (staff) / verifyPayment (THE chokepoint, manager+) /
// rejectPayment (manager+)
// ---------------------------------------------------------------------------

export async function recordPaymentAction(input: RecordPaymentInput): Promise<ActionResult<{ paymentId: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = RecordPaymentSchema.parse(input)

    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id')
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.orderId)
      .maybeSingle()
    if (!order) return { ok: false, error: '주문을 찾을 수 없습니다' }

    const amountMinor = toMinor(parsed.amount)
    if (amountMinor <= 0) return { ok: false, error: '금액은 0보다 커야 합니다' }

    const { data: payment, error } = await admin
      .from('payments')
      .insert({
        org_id: ctx.org.id,
        order_id: parsed.orderId,
        method: parsed.method,
        kind: parsed.kind,
        amount: amountMinor,
        status: 'pending',
        provider_ref: parsed.provider_ref ?? null,
        sender_number: parsed.sender_number ?? null,
        note: parsed.note ?? null,
      })
      .select('id')
      .single()

    if (error || !payment) return { ok: false, error: error?.message ?? '결제를 기록하지 못했습니다' }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: parsed.orderId,
      type: 'payment',
      message: `결제 기록: ${parsed.kind} ${formatMoney(amountMinor)} · ${parsed.method} (확인 대기)`,
      data: { paymentId: payment.id, kind: parsed.kind, method: parsed.method, amount: amountMinor },
      actor_id: ctx.user.id,
    })

    audit(ctx, 'payment.record', 'payment', payment.id as string, undefined, {
      orderId: parsed.orderId,
      amount: amountMinor,
      kind: parsed.kind,
      method: parsed.method,
    })

    revalidatePath(`/admin/orders/${parsed.orderId}`)
    return { ok: true, data: { paymentId: payment.id as string } }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, '결제를 기록하지 못했습니다') }
  }
}

/**
 * THE chokepoint (docs/architecture.md §3, payments table comment): only this
 * action ever flips a payment to 'verified' and recomputes orders.advance_paid /
 * orders.payment_status. Manager+ only — a staff member should not be able to
 * both record and self-verify a payment. Always re-reads the payment/order
 * server-side; never trusts anything the client claims about amounts/status.
 */
export async function verifyPaymentAction(paymentId: string): Promise<ActionResult<{ orderId: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'manager')

    const admin = getAdminClient()

    const { data: paymentData, error: paymentError } = await admin
      .from('payments')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('id', paymentId)
      .single()

    if (paymentError || !paymentData) return { ok: false, error: '결제 내역을 찾을 수 없습니다' }
    const payment = paymentData as Payment
    if (payment.status !== 'pending') return { ok: false, error: `이미 처리된 결제입니다 (${payment.status})` }

    const { data: orderData, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('id', payment.order_id)
      .single()

    if (orderError || !orderData) return { ok: false, error: '주문을 찾을 수 없습니다' }
    const order = orderData as Order

    const nowIso = new Date().toISOString()

    const { error: updatePaymentError } = await admin
      .from('payments')
      .update({ status: 'verified', verified_by: ctx.user.id, verified_at: nowIso })
      .eq('id', paymentId)

    if (updatePaymentError) return { ok: false, error: updatePaymentError.message }

    // Recompute from verified payments only — never from what the client sent.
    const { data: verifiedRows } = await admin
      .from('payments')
      .select('kind, amount, status')
      .eq('order_id', order.id)
      .eq('status', 'verified')

    const rows = (verifiedRows ?? []) as { kind: string; amount: number }[]
    const verifiedAdvance = rows.filter((p) => p.kind === 'advance').reduce((s, p) => s + p.amount, 0)
    const verifiedNonRefund = rows.filter((p) => p.kind !== 'refund').reduce((s, p) => s + p.amount, 0)

    let paymentStatus: PaymentStatus = order.payment_status
    if (verifiedNonRefund >= order.total) {
      paymentStatus = 'paid'
    } else if (verifiedAdvance > 0 && verifiedAdvance < order.total) {
      paymentStatus = 'advance_paid'
    }

    const { error: updateOrderError } = await admin
      .from('orders')
      .update({ advance_paid: verifiedAdvance, payment_status: paymentStatus })
      .eq('id', order.id)

    if (updateOrderError) return { ok: false, error: updateOrderError.message }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: order.id,
      type: 'payment',
      message: `결제 확인: ${payment.kind} ${formatMoney(payment.amount)} via ${payment.method}`,
      data: { paymentId, amount: payment.amount, kind: payment.kind },
      actor_id: ctx.user.id,
    })

    audit(ctx, 'payment.verify', 'payment', paymentId, { status: 'pending' }, { status: 'verified' })

    await notify(ctx.org.id, 'payment_received', {
      title: `${order.order_no} 결제 확인됨`,
      body: `${formatMoney(payment.amount)} via ${payment.method}`,
      link: `/admin/orders/${order.id}`,
    })

    revalidatePath(`/admin/orders/${order.id}`)
    return { ok: true, data: { orderId: order.id } }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to verify payment') }
  }
}

export async function rejectPaymentAction(input: RejectPaymentInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'manager')
    const parsed = RejectPaymentSchema.parse(input)

    const admin = getAdminClient()
    const { data: paymentData } = await admin
      .from('payments')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.paymentId)
      .maybeSingle()

    if (!paymentData) return { ok: false, error: '결제 내역을 찾을 수 없습니다' }
    const payment = paymentData as Payment
    if (payment.status !== 'pending') return { ok: false, error: `이미 처리된 결제입니다 (${payment.status})` }

    const { error } = await admin
      .from('payments')
      .update({
        status: 'failed',
        note: parsed.note ? [payment.note, parsed.note].filter(Boolean).join('\n') : payment.note,
      })
      .eq('id', parsed.paymentId)

    if (error) return { ok: false, error: error.message }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: payment.order_id,
      type: 'payment',
      message: `결제 거절: ${payment.kind} ${formatMoney(payment.amount)}${parsed.note ? ` — ${parsed.note}` : ''}`,
      data: { paymentId: parsed.paymentId },
      actor_id: ctx.user.id,
    })

    audit(ctx, 'payment.reject', 'payment', parsed.paymentId, { status: 'pending' }, { status: 'failed' })
    revalidatePath(`/admin/orders/${payment.order_id}`)
    return { ok: true }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to reject payment') }
  }
}

// ---------------------------------------------------------------------------
// Risk / fraud
// ---------------------------------------------------------------------------

export async function updateRiskAction(input: UpdateRiskInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = UpdateRiskSchema.parse(input)

    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, risk_level')
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.orderId)
      .maybeSingle()
    if (!order) return { ok: false, error: '주문을 찾을 수 없습니다' }

    const { error } = await admin
      .from('orders')
      .update({ risk_level: parsed.risk_level, risk_note: parsed.risk_note ?? null })
      .eq('id', parsed.orderId)

    if (error) return { ok: false, error: error.message }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: parsed.orderId,
      type: 'note',
      message: `위험도 변경: ${parsed.risk_level}`,
      data: { risk_level: parsed.risk_level, risk_note: parsed.risk_note ?? null },
      actor_id: ctx.user.id,
    })

    audit(ctx, 'order.risk_update', 'order', parsed.orderId, { risk_level: order.risk_level }, {
      risk_level: parsed.risk_level,
    })
    revalidatePath(`/admin/orders/${parsed.orderId}`)
    return { ok: true }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to update risk') }
  }
}

export async function checkBlocklistAction(
  orderId: string,
): Promise<ActionResult<{ matched: boolean; risk_level: RiskLevel | null }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')

    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, customer_phone, address, risk_level')
      .eq('org_id', ctx.org.id)
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return { ok: false, error: '주문을 찾을 수 없습니다' }

    const { data: blocklistRows } = await admin.from('blocklist').select('kind, value').eq('org_id', ctx.org.id)

    const rows = (blocklistRows ?? []) as { kind: string; value: string }[]
    const phoneMatch = rows.some((r) => r.kind === 'phone' && r.value === order.customer_phone)

    const addressText = order.address ? JSON.stringify(order.address).toLowerCase() : ''
    const addressMatch = rows.some((r) => r.kind === 'address' && addressText.includes(r.value.toLowerCase()))

    const matched = phoneMatch || addressMatch

    if (matched) {
      const note = `Blocklist match: ${[phoneMatch && 'phone', addressMatch && 'address'].filter(Boolean).join(', ')}`
      await admin.from('orders').update({ risk_level: 'high', risk_note: note }).eq('id', orderId)
      await admin.from('order_events').insert({
        org_id: ctx.org.id,
        order_id: orderId,
        type: 'note',
        message: note,
        data: { phoneMatch, addressMatch },
        actor_id: ctx.user.id,
      })
      audit(ctx, 'order.blocklist_check', 'order', orderId, { risk_level: order.risk_level }, {
        risk_level: 'high',
      })
    }

    revalidatePath(`/admin/orders/${orderId}`)
    return {
      ok: true,
      data: { matched, risk_level: matched ? 'high' : ((order.risk_level as RiskLevel | null) ?? null) },
    }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to check blocklist') }
  }
}

// ---------------------------------------------------------------------------
// Notes / tags
// ---------------------------------------------------------------------------

export async function updateOrderNoteAction(input: UpdateOrderNoteInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = UpdateOrderNoteSchema.parse(input)

    const admin = getAdminClient()
    const { error } = await admin
      .from('orders')
      .update({ note_internal: parsed.note_internal })
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.orderId)

    if (error) return { ok: false, error: error.message }

    audit(ctx, 'order.note_update', 'order', parsed.orderId, undefined, { note_internal: parsed.note_internal })
    revalidatePath(`/admin/orders/${parsed.orderId}`)
    return { ok: true }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to update note') }
  }
}

export async function updateOrderTagsAction(input: UpdateOrderTagsInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = UpdateOrderTagsSchema.parse(input)

    const admin = getAdminClient()
    const { error } = await admin
      .from('orders')
      .update({ tags: parsed.tags })
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.orderId)

    if (error) return { ok: false, error: error.message }

    audit(ctx, 'order.tags_update', 'order', parsed.orderId, undefined, { tags: parsed.tags })
    revalidatePath(`/admin/orders/${parsed.orderId}`)
    return { ok: true }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to update tags') }
  }
}

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

export async function createReturnAction(
  input: CreateReturnInput,
): Promise<ActionResult<{ returnId: string; returnNo: string }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = CreateReturnSchema.parse(input)

    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, order_no')
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.orderId)
      .maybeSingle()
    if (!order) return { ok: false, error: '주문을 찾을 수 없습니다' }

    const { data: returnNo, error: rpcError } = await admin.rpc('next_doc_number', {
      p_org: ctx.org.id,
      p_doc_type: 'return',
      p_prefix: 'RET-',
    })
    if (rpcError || !returnNo) return { ok: false, error: rpcError?.message ?? '반품 번호를 만들지 못했습니다' }

    const { data: ret, error: retError } = await admin
      .from('returns')
      .insert({
        org_id: ctx.org.id,
        order_id: parsed.orderId,
        return_no: returnNo,
        status: 'requested',
        reason: parsed.reason ?? null,
      })
      .select('id, return_no')
      .single()

    if (retError || !ret) return { ok: false, error: retError?.message ?? '반품을 만들지 못했습니다' }

    const itemRows = parsed.items.map((item) => ({
      org_id: ctx.org.id,
      return_id: ret.id,
      order_item_id: item.order_item_id,
      qty: item.qty,
      condition: item.condition ?? null,
    }))

    const { error: itemsError } = await admin.from('return_items').insert(itemRows)
    if (itemsError) return { ok: false, error: itemsError.message }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: parsed.orderId,
      type: 'note',
      message: `반품 ${ret.return_no} 요청됨`,
      data: { returnId: ret.id },
      actor_id: ctx.user.id,
    })

    audit(ctx, 'return.create', 'return', ret.id as string, undefined, {
      orderId: parsed.orderId,
      items: parsed.items,
    })

    await notify(ctx.org.id, 'return_requested', {
      title: `반품 ${ret.return_no} 요청됨`,
      link: `/admin/returns/${ret.id}`,
    })

    revalidatePath('/admin/returns')
    revalidatePath(`/admin/orders/${parsed.orderId}`)
    return { ok: true, data: { returnId: ret.id as string, returnNo: ret.return_no as string } }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, '반품을 만들지 못했습니다') }
  }
}

/** Restocks inline (per the brief — not via applyOrderInventory, which is keyed to
 *  a whole order's idempotence marker; a return is a partial-qty subset of an
 *  order's items and gets its own 'return'-type inventory_movements here). */
async function restockReturnItems(admin: SupabaseClient, ctx: OrgContext, returnId: string): Promise<void> {
  const { data: returnItems } = await admin
    .from('return_items')
    .select('order_item_id, qty')
    .eq('return_id', returnId)

  for (const ri of (returnItems ?? []) as { order_item_id: string; qty: number }[]) {
    const { data: orderItem } = await admin
      .from('order_items')
      .select('product_id, variant_id')
      .eq('id', ri.order_item_id)
      .maybeSingle()

    if (!orderItem?.product_id) continue

    const { data: product } = await admin
      .from('products')
      .select('id, track_stock, stock_qty')
      .eq('org_id', ctx.org.id)
      .eq('id', orderItem.product_id)
      .maybeSingle()

    if (!product || !product.track_stock) continue

    await admin.from('inventory_movements').insert({
      org_id: ctx.org.id,
      product_id: orderItem.product_id,
      variant_id: orderItem.variant_id ?? null,
      qty_delta: ri.qty,
      type: 'return',
      reference: returnId,
      actor_id: ctx.user.id,
    })

    if (orderItem.variant_id) {
      const { data: variant } = await admin
        .from('product_variants')
        .select('stock_qty')
        .eq('org_id', ctx.org.id)
        .eq('id', orderItem.variant_id)
        .maybeSingle()
      if (variant) {
        await admin
          .from('product_variants')
          .update({ stock_qty: (variant.stock_qty ?? 0) + ri.qty })
          .eq('id', orderItem.variant_id)
      }
    } else {
      await admin
        .from('products')
        .update({ stock_qty: (product.stock_qty ?? 0) + ri.qty })
        .eq('id', orderItem.product_id)
    }
  }
}

export async function updateReturnStatusAction(
  input: UpdateReturnStatusInput,
): Promise<ActionResult<{ status: ReturnStatus }>> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'staff')
    const parsed = UpdateReturnStatusSchema.parse(input)

    if (parsed.nextStatus === 'refunded') {
      return { ok: false, error: '환불 완료는 환불 버튼으로 처리하세요.' }
    }

    const admin = getAdminClient()
    const { data } = await admin
      .from('returns')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.returnId)
      .single()
    if (!data) return { ok: false, error: '반품을 찾을 수 없습니다' }
    const ret = data as { id: string; order_id: string; status: ReturnStatus; return_no: string }

    const allowed = RETURN_STATUS_FLOW[ret.status] ?? []
    if (!allowed.includes(parsed.nextStatus)) {
      return { ok: false, error: `반품 상태를 ${ret.status}에서 ${parsed.nextStatus}(으)로 바꿀 수 없습니다` }
    }

    const { error } = await admin.from('returns').update({ status: parsed.nextStatus }).eq('id', parsed.returnId)
    if (error) return { ok: false, error: error.message }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: ret.order_id,
      type: 'note',
      message: `반품 ${ret.return_no}: ${ret.status} -> ${parsed.nextStatus}`,
      data: { returnId: parsed.returnId, from: ret.status, to: parsed.nextStatus },
      actor_id: ctx.user.id,
    })

    if (parsed.nextStatus === 'received') {
      await restockReturnItems(admin, ctx, parsed.returnId)
    }

    audit(ctx, 'return.status_change', 'return', parsed.returnId, { status: ret.status }, {
      status: parsed.nextStatus,
    })

    revalidatePath(`/admin/returns/${parsed.returnId}`)
    revalidatePath('/admin/returns')
    revalidatePath(`/admin/orders/${ret.order_id}`)

    return { ok: true, data: { status: parsed.nextStatus } }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to update return status') }
  }
}

export async function refundReturnAction(input: RefundReturnInput): Promise<ActionResult> {
  try {
    const ctx = await requireOrg()
    requireRole(ctx, 'manager')
    const parsed = RefundReturnSchema.parse(input)

    const admin = getAdminClient()
    const { data: retData } = await admin
      .from('returns')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('id', parsed.returnId)
      .single()
    if (!retData) return { ok: false, error: '반품을 찾을 수 없습니다' }
    const ret = retData as { id: string; order_id: string; status: ReturnStatus; return_no: string; note: string | null }

    if (ret.status !== 'received') {
      return { ok: false, error: `반품 상품을 받은 뒤에 환불할 수 있습니다 (현재: ${ret.status})` }
    }

    const { data: orderData } = await admin
      .from('orders')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('id', ret.order_id)
      .single()
    if (!orderData) return { ok: false, error: '주문을 찾을 수 없습니다' }
    const order = orderData as Order

    const refundAmountMinor = toMinor(parsed.refund_amount)
    if (refundAmountMinor <= 0) return { ok: false, error: '환불 금액은 0보다 커야 합니다' }

    const nowIso = new Date().toISOString()

    const { error: returnUpdateError } = await admin
      .from('returns')
      .update({
        status: 'refunded',
        resolution: parsed.resolution,
        refund_amount: refundAmountMinor,
        note: parsed.note ?? ret.note,
      })
      .eq('id', parsed.returnId)

    if (returnUpdateError) return { ok: false, error: returnUpdateError.message }

    // Refund payment row is created already-verified — the pending/verify chokepoint
    // governs incoming advance/full/balance payments, not staff-initiated refunds.
    const { error: paymentError } = await admin.from('payments').insert({
      org_id: ctx.org.id,
      order_id: order.id,
      method: parsed.method,
      kind: 'refund',
      amount: refundAmountMinor,
      status: 'verified',
      verified_by: ctx.user.id,
      verified_at: nowIso,
      note: parsed.note ?? null,
    })

    if (paymentError) return { ok: false, error: paymentError.message }

    const { data: verifiedRows } = await admin
      .from('payments')
      .select('kind, amount')
      .eq('order_id', order.id)
      .eq('status', 'verified')

    const rows = (verifiedRows ?? []) as { kind: string; amount: number }[]
    const verifiedIntake = rows.filter((p) => p.kind !== 'refund').reduce((s, p) => s + p.amount, 0)
    const verifiedRefunds = rows.filter((p) => p.kind === 'refund').reduce((s, p) => s + p.amount, 0)

    const newPaymentStatus: PaymentStatus =
      verifiedIntake > 0 && verifiedRefunds >= verifiedIntake ? 'refunded' : 'partial_refund'

    const { error: orderUpdateError } = await admin
      .from('orders')
      .update({ payment_status: newPaymentStatus })
      .eq('id', order.id)

    if (orderUpdateError) return { ok: false, error: orderUpdateError.message }

    await admin.from('order_events').insert({
      org_id: ctx.org.id,
      order_id: order.id,
      type: 'payment',
      message: `환불 처리: ${formatMoney(refundAmountMinor)} via ${parsed.method} (return ${ret.return_no})`,
      data: { returnId: parsed.returnId, amount: refundAmountMinor, method: parsed.method },
      actor_id: ctx.user.id,
    })

    audit(ctx, 'return.refund', 'return', parsed.returnId, { status: 'received' }, {
      status: 'refunded',
      refund_amount: refundAmountMinor,
    })

    // Order status -> 'returned' only when the full amount taken in has now been
    // refunded, and only if legal per ORDER_STATUS_FLOW (only from 'delivered');
    // best-effort — never blocks the refund itself.
    if (newPaymentStatus === 'refunded') {
      await tryTransitionOrderStatus(ctx, order.id, 'returned')
    }

    revalidatePath(`/admin/returns/${parsed.returnId}`)
    revalidatePath('/admin/returns')
    revalidatePath(`/admin/orders/${order.id}`)

    return { ok: true }
  } catch (err) {
    rethrowIfRedirect(err)
    return { ok: false, error: errMessage(err, 'Failed to process refund') }
  }
}
