export const dynamic = 'force-dynamic'

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { ReturnsTable, type ReturnRow } from '@/modules/orders/components/returns-table'

interface ReturnListRow {
  id: string
  return_no: string
  order_id: string
  status: string
  resolution: string | null
  refund_amount: number | null
  created_at: string
  orders: { order_no: string } | { order_no: string }[] | null
}

export default async function ReturnsPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'orders')

  const supabase = await getServerClient()
  const { data } = await supabase
    .from('returns')
    .select('id, return_no, order_id, status, resolution, refund_amount, created_at, orders(order_no)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as unknown as ReturnListRow[]

  const returnRows: ReturnRow[] = rows.map((row) => {
    const orderJoin = row.orders
    const orderNo = Array.isArray(orderJoin) ? orderJoin[0]?.order_no : orderJoin?.order_no
    return {
      id: row.id,
      return_no: row.return_no,
      order_id: row.order_id,
      order_no: orderNo ?? '—',
      status: row.status,
      resolution: row.resolution,
      refund_amount: row.refund_amount,
      created_at: row.created_at,
    }
  })

  return (
    <div className="px-6 py-6">
      <PageHeader title="반품관리" />
      <ReturnsTable data={returnRows} />
    </div>
  )
}
