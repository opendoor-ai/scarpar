export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { OrdersFilterBar } from '@/modules/orders/components/orders-filter-bar'
import { OrdersTable, type OrderRow } from '@/modules/orders/components/orders-table'

// Hand-rolled rather than the shared PageProps<TParams, TSearchParams> helper: every
// field here is optional, and an all-optional object literal type doesn't satisfy
// PageProps' `TSearchParams extends Record<string, string | string[] | undefined>`
// constraint (TS2344) the way `{ id: string }`-style required-key params do.
interface OrdersPageProps {
  searchParams: Promise<{
    status?: string
    q?: string
    from?: string
    to?: string
  }>
}

interface OrderListRow {
  id: string
  order_no: string
  placed_at: string
  customer_name: string
  customer_phone: string
  channel: string
  status: string
  payment_status: string
  risk_level: string | null
  total: number
  order_items?: { count: number }[]
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'orders')

  const sp = await searchParams
  const status = sp.status ?? ''
  const q = (sp.q ?? '').trim()
  const from = sp.from ?? ''
  const to = sp.to ?? ''

  const supabase = await getServerClient()
  let query = supabase
    .from('orders')
    .select(
      'id, order_no, placed_at, customer_name, customer_phone, channel, status, payment_status, risk_level, total, order_items(count)',
    )
    .eq('org_id', ctx.org.id)
    .order('placed_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)

  const safeQ = q.replace(/[%,]/g, ' ').trim()
  if (safeQ) query = query.or(`order_no.ilike.%${safeQ}%,customer_phone.ilike.%${safeQ}%`)

  if (from) query = query.gte('placed_at', from)
  if (to) query = query.lte('placed_at', `${to}T23:59:59`)

  const { data } = await query
  const rows = (data ?? []) as unknown as OrderListRow[]

  const orderRows: OrderRow[] = rows.map((row) => ({
    id: row.id,
    order_no: row.order_no,
    placed_at: row.placed_at,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    channel: row.channel,
    status: row.status,
    payment_status: row.payment_status,
    risk_level: row.risk_level,
    total: row.total,
    items_count: row.order_items?.[0]?.count ?? 0,
  }))

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="주문관리"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/orders/new">
              <Plus className="size-4" />
새 주문
            </Link>
          </Button>
        }
      />
      <OrdersFilterBar status={status} q={q} from={from} to={to} />
      <OrdersTable data={orderRows} />
    </div>
  )
}
