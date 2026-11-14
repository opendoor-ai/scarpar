// Report aggregates for the reports module (docs/architecture.md §11, docs/conventions.md).
// Every fn: org-scoped, optional {from,to} date range (default last 30 days), try/catch -> empty
// result on any error. Aggregation happens in JS over plain (non-embedded) Supabase queries —
// kept deliberately simple/predictable over PostgREST nested-embed filtering/aliasing.

import { addDays, eachDayOfInterval, format, isValid, parseISO, subDays } from 'date-fns'

import { getServerClient } from '@/lib/supabase/server'
import type { Delivery, Expense, Order, OrderItem, OrderStatus, Payment, Product } from '@/types/db'

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

export interface DateRange {
  from: string // yyyy-MM-dd, inclusive
  to: string // yyyy-MM-dd, inclusive
}

function isValidDateStr(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return isValid(parseISO(value))
}

/** Fills in a default last-30-days range and normalizes a reversed input range. */
export function resolveRange(input?: { from?: string; to?: string }): DateRange {
  const today = new Date()
  const defaultTo = format(today, 'yyyy-MM-dd')
  const defaultFrom = format(subDays(today, 29), 'yyyy-MM-dd')

  const inputFrom = input?.from
  const inputTo = input?.to

  let from = isValidDateStr(inputFrom) ? inputFrom : defaultFrom
  let to = isValidDateStr(inputTo) ? inputTo : defaultTo

  if (from > to) [from, to] = [to, from]

  return { from, to }
}

/**
 * [gte, lt) UTC instant bounds for a timestamptz column, from a yyyy-mm-dd range (inclusive).
 * Per docs/conventions.md ("Timezone = org.timezone display only") queries stay UTC-naive —
 * org timezone is applied at display time only, never here.
 */
function timestampBounds(range: DateRange): { gte: string; lt: string } {
  const gte = `${range.from}T00:00:00.000Z`
  const lt = `${format(addDays(parseISO(range.to), 1), 'yyyy-MM-dd')}T00:00:00.000Z`
  return { gte, lt }
}

const MAX_CHART_DAYS = 366

function eachDayInRange(range: DateRange): string[] {
  const days = eachDayOfInterval({ start: parseISO(range.from), end: parseISO(range.to) }).map((d) =>
    format(d, 'yyyy-MM-dd'),
  )
  return days.length > MAX_CHART_DAYS ? days.slice(-MAX_CHART_DAYS) : days
}

/** Orders that don't represent a real/live sale — excluded from sales-facing aggregates. */
const DEAD_ORDER_STATUSES: OrderStatus[] = ['cancelled', 'failed']

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export interface SalesByDayRow {
  date: string
  revenue: number // minor
  orders: number
}

/** Orders placed_at grouped by day, sum total + count. Excludes cancelled/failed orders. */
export async function salesByDay(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<SalesByDayRow[]> {
  const r = resolveRange(range)
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)
    const { data, error } = await supabase
      .from('orders')
      .select('placed_at, total, status')
      .eq('org_id', orgId)
      .gte('placed_at', gte)
      .lt('placed_at', lt)
      .not('status', 'in', `(${DEAD_ORDER_STATUSES.join(',')})`)
    if (error) throw error

    const rows = (data ?? []) as Pick<Order, 'placed_at' | 'total' | 'status'>[]
    const byDate = new Map<string, { revenue: number; orders: number }>()
    for (const row of rows) {
      const day = row.placed_at.slice(0, 10)
      const bucket = byDate.get(day) ?? { revenue: 0, orders: 0 }
      bucket.revenue += row.total
      bucket.orders += 1
      byDate.set(day, bucket)
    }

    return eachDayInRange(r).map((date) => ({
      date,
      revenue: byDate.get(date)?.revenue ?? 0,
      orders: byDate.get(date)?.orders ?? 0,
    }))
  } catch (error) {
    console.error('[reports] salesByDay failed', error)
    return []
  }
}

export interface OrdersByStatusRow {
  status: OrderStatus
  count: number
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'packed',
  'dispatched',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'failed',
]

/** Order counts per status in range (zero-filled for every status, stable order). */
export async function ordersByStatus(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<OrdersByStatusRow[]> {
  const r = resolveRange(range)
  const zeroed = () => ORDER_STATUSES.map((status) => ({ status, count: 0 }))
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('org_id', orgId)
      .gte('placed_at', gte)
      .lt('placed_at', lt)
    if (error) throw error

    const rows = (data ?? []) as Pick<Order, 'status'>[]
    const counts = new Map<OrderStatus, number>()
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1)

    return ORDER_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }))
  } catch (error) {
    console.error('[reports] ordersByStatus failed', error)
    return zeroed()
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface TopProductRow {
  productName: string
  revenue: number // minor
  units: number
}

/**
 * Top 10 products by revenue: order_items joined to orders in range. Applies the same
 * cancelled/failed exclusion as salesByDay (spec didn't restate it here, kept consistent
 * across the Sales/Products tabs so "top products" doesn't count dead orders).
 */
export async function topProducts(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<TopProductRow[]> {
  const r = resolveRange(range)
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)

    const ordersRes = await supabase
      .from('orders')
      .select('id')
      .eq('org_id', orgId)
      .gte('placed_at', gte)
      .lt('placed_at', lt)
      .not('status', 'in', `(${DEAD_ORDER_STATUSES.join(',')})`)
    if (ordersRes.error) throw ordersRes.error
    const orderIds = ((ordersRes.data ?? []) as Pick<Order, 'id'>[]).map((o) => o.id)
    if (orderIds.length === 0) return []

    const itemsRes = await supabase
      .from('order_items')
      .select('product_name, qty, line_total')
      .eq('org_id', orgId)
      .in('order_id', orderIds)
    if (itemsRes.error) throw itemsRes.error
    const items = (itemsRes.data ?? []) as Pick<OrderItem, 'product_name' | 'qty' | 'line_total'>[]

    const totals = new Map<string, { revenue: number; units: number }>()
    for (const item of items) {
      const bucket = totals.get(item.product_name) ?? { revenue: 0, units: 0 }
      bucket.revenue += item.line_total
      bucket.units += item.qty
      totals.set(item.product_name, bucket)
    }

    return [...totals.entries()]
      .map(([productName, { revenue, units }]) => ({ productName, revenue, units }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  } catch (error) {
    console.error('[reports] topProducts failed', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export interface CodDistrictRow {
  district: string
  delivered: number
  failed: number
  rate: number // 0-100
}

/**
 * COD success by district: deliveries (range on deliveries.created_at — the spec doesn't name
 * an anchor for this table, created_at is the only date column guaranteed present) joined to
 * orders.address->>'district'. Delivered vs failed counts + rate only (spec-literal — other
 * delivery statuses like in_transit/returned are not counted in either bucket).
 */
export async function codSuccessByDistrict(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<CodDistrictRow[]> {
  const r = resolveRange(range)
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)

    const deliveriesRes = await supabase
      .from('deliveries')
      .select('order_id, status')
      .eq('org_id', orgId)
      .gte('created_at', gte)
      .lt('created_at', lt)
      .in('status', ['delivered', 'failed'])
    if (deliveriesRes.error) throw deliveriesRes.error
    const deliveryRows = (deliveriesRes.data ?? []) as Pick<Delivery, 'order_id' | 'status'>[]
    if (deliveryRows.length === 0) return []

    const orderIds = [...new Set(deliveryRows.map((d) => d.order_id))]
    const ordersRes = await supabase.from('orders').select('id, address').eq('org_id', orgId).in('id', orderIds)
    if (ordersRes.error) throw ordersRes.error

    const districtByOrder = new Map<string, string>()
    for (const o of (ordersRes.data ?? []) as Pick<Order, 'id' | 'address'>[]) {
      const district = (o.address as { district?: string } | null)?.district
      districtByOrder.set(o.id, district && district.trim() ? district : '알 수 없음')
    }

    const tally = new Map<string, { delivered: number; failed: number }>()
    for (const d of deliveryRows) {
      const district = districtByOrder.get(d.order_id) ?? '알 수 없음'
      const bucket = tally.get(district) ?? { delivered: 0, failed: 0 }
      if (d.status === 'delivered') bucket.delivered += 1
      else bucket.failed += 1
      tally.set(district, bucket)
    }

    return [...tally.entries()]
      .map(([district, { delivered, failed }]) => ({
        district,
        delivered,
        failed,
        rate: delivered + failed > 0 ? (delivered / (delivered + failed)) * 100 : 0,
      }))
      .sort((a, b) => b.delivered + b.failed - (a.delivered + a.failed))
  } catch (error) {
    console.error('[reports] codSuccessByDistrict failed', error)
    return []
  }
}

export interface DeliveryPerfGroup {
  label: string
  avgHours: number | null
  failureRate: number // 0-100
  delivered: number
  failed: number
}

export interface DeliveryPerformanceResult {
  avgHours: number | null
  failureRate: number
  byRider: DeliveryPerfGroup[]
  byCourier: DeliveryPerfGroup[]
}

/**
 * Avg hours assigned_at->delivered_at + failure rate, overall and per rider/courier.
 * Range applies to deliveries.created_at (see codSuccessByDistrict note above).
 */
export async function deliveryPerformance(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<DeliveryPerformanceResult> {
  const r = resolveRange(range)
  const empty: DeliveryPerformanceResult = { avgHours: null, failureRate: 0, byRider: [], byCourier: [] }
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)

    const deliveriesRes = await supabase
      .from('deliveries')
      .select('status, assigned_at, delivered_at, rider_id, courier')
      .eq('org_id', orgId)
      .gte('created_at', gte)
      .lt('created_at', lt)
      .in('status', ['delivered', 'failed'])
    if (deliveriesRes.error) throw deliveriesRes.error
    const rows = (deliveriesRes.data ?? []) as Pick<
      Delivery,
      'status' | 'assigned_at' | 'delivered_at' | 'rider_id' | 'courier'
    >[]
    if (rows.length === 0) return empty

    const riderIds = [...new Set(rows.map((d) => d.rider_id).filter((id): id is string => Boolean(id)))]
    const riderNames = new Map<string, string>()
    if (riderIds.length > 0) {
      const ridersRes = await supabase.from('riders').select('id, name').eq('org_id', orgId).in('id', riderIds)
      if (ridersRes.error) throw ridersRes.error
      for (const rider of (ridersRes.data ?? []) as { id: string; name: string }[]) {
        riderNames.set(rider.id, rider.name)
      }
    }

    function hoursBetween(startISO: string | null, endISO: string | null): number | null {
      if (!startISO || !endISO) return null
      const ms = new Date(endISO).getTime() - new Date(startISO).getTime()
      return ms > 0 ? ms / (1000 * 60 * 60) : null
    }

    function summarize(
      groupRows: typeof rows,
    ): { avgHours: number | null; failureRate: number; delivered: number; failed: number } {
      const delivered = groupRows.filter((d) => d.status === 'delivered').length
      const failed = groupRows.filter((d) => d.status === 'failed').length
      const hourSamples = groupRows
        .filter((d) => d.status === 'delivered')
        .map((d) => hoursBetween(d.assigned_at, d.delivered_at))
        .filter((h): h is number => h !== null)
      const avgHours =
        hourSamples.length > 0 ? hourSamples.reduce((a, b) => a + b, 0) / hourSamples.length : null
      const failureRate = delivered + failed > 0 ? (failed / (delivered + failed)) * 100 : 0
      return { avgHours, failureRate, delivered, failed }
    }

    const overall = summarize(rows)

    const riderGroups = new Map<string, typeof rows>()
    for (const row of rows) {
      if (!row.rider_id) continue
      const list = riderGroups.get(row.rider_id) ?? []
      list.push(row)
      riderGroups.set(row.rider_id, list)
    }
    const byRider: DeliveryPerfGroup[] = [...riderGroups.entries()]
      .map(([riderId, groupRows]) => ({
        label: riderNames.get(riderId) ?? '알 수 없는 배송기사',
        ...summarize(groupRows),
      }))
      .sort((a, b) => b.delivered + b.failed - (a.delivered + a.failed))

    const courierGroups = new Map<string, typeof rows>()
    for (const row of rows) {
      if (!row.courier) continue
      const list = courierGroups.get(row.courier) ?? []
      list.push(row)
      courierGroups.set(row.courier, list)
    }
    const byCourier: DeliveryPerfGroup[] = [...courierGroups.entries()]
      .map(([courier, groupRows]) => ({ label: courier, ...summarize(groupRows) }))
      .sort((a, b) => b.delivered + b.failed - (a.delivered + a.failed))

    return { avgHours: overall.avgHours, failureRate: overall.failureRate, byRider, byCourier }
  } catch (error) {
    console.error('[reports] deliveryPerformance failed', error)
    return empty
  }
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export interface ExpenseCategoryRow {
  category: string
  total: number // minor
}

/** Expense sum per category in range (expenses.spent_at is a plain `date` column). */
export async function expensesByCategory(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<ExpenseCategoryRow[]> {
  const r = resolveRange(range)
  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('org_id', orgId)
      .gte('spent_at', r.from)
      .lte('spent_at', r.to)
    if (error) throw error

    const rows = (data ?? []) as Pick<Expense, 'category' | 'amount'>[]
    const totals = new Map<string, number>()
    for (const row of rows) totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount)

    return [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  } catch (error) {
    console.error('[reports] expensesByCategory failed', error)
    return []
  }
}

export interface PnlResult {
  revenue: number // minor
  cogs: number
  expenses: number
  net: number
}

/**
 * revenue = verified payments (kind != refund) minus verified refunds, in range (payments has
 * no order-status filter — the payments.status='verified' chokepoint per architecture.md §7 is
 * the trust boundary). cogs = qty * products.cost_price (null -> 0) for delivered/completed
 * orders in range. expenses = expenses total in range. net = revenue - cogs - expenses.
 */
export async function pnl(orgId: string, range?: { from?: string; to?: string }): Promise<PnlResult> {
  const r = resolveRange(range)
  const empty: PnlResult = { revenue: 0, cogs: 0, expenses: 0, net: 0 }
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)

    const paymentsRes = await supabase
      .from('payments')
      .select('amount, kind')
      .eq('org_id', orgId)
      .eq('status', 'verified')
      .gte('created_at', gte)
      .lt('created_at', lt)
    if (paymentsRes.error) throw paymentsRes.error
    const paymentRows = (paymentsRes.data ?? []) as Pick<Payment, 'amount' | 'kind'>[]
    const revenue = paymentRows.reduce((sum, p) => sum + (p.kind === 'refund' ? -p.amount : p.amount), 0)

    const ordersRes = await supabase
      .from('orders')
      .select('id')
      .eq('org_id', orgId)
      .in('status', ['delivered', 'completed'])
      .gte('placed_at', gte)
      .lt('placed_at', lt)
    if (ordersRes.error) throw ordersRes.error
    const orderIds = ((ordersRes.data ?? []) as Pick<Order, 'id'>[]).map((o) => o.id)

    let cogs = 0
    if (orderIds.length > 0) {
      const itemsRes = await supabase
        .from('order_items')
        .select('product_id, qty')
        .eq('org_id', orgId)
        .in('order_id', orderIds)
      if (itemsRes.error) throw itemsRes.error
      const items = (itemsRes.data ?? []) as Pick<OrderItem, 'product_id' | 'qty'>[]

      const productIds = [...new Set(items.map((i) => i.product_id).filter((id): id is string => Boolean(id)))]
      const costByProduct = new Map<string, number>()
      if (productIds.length > 0) {
        const productsRes = await supabase
          .from('products')
          .select('id, cost_price')
          .eq('org_id', orgId)
          .in('id', productIds)
        if (productsRes.error) throw productsRes.error
        for (const p of (productsRes.data ?? []) as Pick<Product, 'id' | 'cost_price'>[]) {
          costByProduct.set(p.id, p.cost_price ?? 0)
        }
      }

      cogs = items.reduce((sum, item) => {
        const cost = item.product_id ? (costByProduct.get(item.product_id) ?? 0) : 0
        return sum + cost * item.qty
      }, 0)
    }

    const expensesRes = await supabase
      .from('expenses')
      .select('amount')
      .eq('org_id', orgId)
      .gte('spent_at', r.from)
      .lte('spent_at', r.to)
    if (expensesRes.error) throw expensesRes.error
    const expensesTotal = ((expensesRes.data ?? []) as Pick<Expense, 'amount'>[]).reduce(
      (sum, e) => sum + e.amount,
      0,
    )

    return { revenue, cogs, expenses: expensesTotal, net: revenue - cogs - expensesTotal }
  } catch (error) {
    console.error('[reports] pnl failed', error)
    return empty
  }
}

export interface VatSalesRow {
  date: string
  invoiceNo: string
  customer: string
  subtotal: number // minor
  vat: number // minor
  total: number // minor
}

/** 부가세 매출 내역: delivered/completed orders in range, flat rows for CSV. */
export async function vatSalesRegister(
  orgId: string,
  range?: { from?: string; to?: string },
): Promise<VatSalesRow[]> {
  const r = resolveRange(range)
  try {
    const supabase = await getServerClient()
    const { gte, lt } = timestampBounds(r)
    const { data, error } = await supabase
      .from('orders')
      .select('order_no, placed_at, customer_name, subtotal, tax_amount, total')
      .eq('org_id', orgId)
      .in('status', ['delivered', 'completed'])
      .gte('placed_at', gte)
      .lt('placed_at', lt)
      .order('placed_at', { ascending: true })
    if (error) throw error

    const rows = (data ?? []) as Pick<
      Order,
      'order_no' | 'placed_at' | 'customer_name' | 'subtotal' | 'tax_amount' | 'total'
    >[]

    return rows.map((o) => ({
      date: o.placed_at.slice(0, 10),
      invoiceNo: o.order_no,
      customer: o.customer_name,
      subtotal: o.subtotal,
      vat: o.tax_amount,
      total: o.total,
    }))
  } catch (error) {
    console.error('[reports] vatSalesRegister failed', error)
    return []
  }
}
