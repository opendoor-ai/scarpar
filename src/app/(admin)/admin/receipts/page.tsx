import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RecentOrdersTable, type RecentOrderRow } from '@/modules/receipts/components/recent-orders-table'
import {
  RecentDeliveriesTable,
  type RecentDeliveryRow,
} from '@/modules/receipts/components/recent-deliveries-table'

export const dynamic = 'force-dynamic'

export default async function ReceiptsPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'receipts')

  const supabase = await getServerClient()

  const [{ data: orders }, { data: deliveries }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_no, customer_name, total, payment_status, placed_at')
      .eq('org_id', ctx.org.id)
      .order('placed_at', { ascending: false })
      .limit(25),
    supabase
      .from('deliveries')
      .select('id, delivery_no, recipient_name, cod_amount, status, created_at')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  return (
    <div>
      <PageHeader
        title="영수증·출력"
        description="거래명세서, 영수증, 배송 라벨을 출력합니다."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>출력 방법</CardTitle>
            <CardDescription>
출력 화면에서 브라우저 인쇄(Ctrl+P)를 누르면 PDF로 저장하거나 프린터로 출력할 수 있습니다.
              거래명세서 번호(INV-…)는 처음 출력할 때 정해지고 이후에는 바뀌지 않습니다.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">최근 주문</h2>
          <RecentOrdersTable orders={(orders ?? []) as RecentOrderRow[]} />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">최근 배송</h2>
          <RecentDeliveriesTable deliveries={(deliveries ?? []) as RecentDeliveryRow[]} />
        </div>
      </div>
    </div>
  )
}
