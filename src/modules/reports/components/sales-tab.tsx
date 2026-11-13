import { BarChart3, Receipt, ShoppingCart } from 'lucide-react'

import { MiniBarChart } from '@/components/ui/mini-chart'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'
import type { OrdersByStatusRow, SalesByDayRow } from '@/modules/reports/queries'

interface SalesTabProps {
  salesByDay: SalesByDayRow[]
  ordersByStatus: OrdersByStatusRow[]
}

function SalesTab({ salesByDay, ordersByStatus }: SalesTabProps) {
  const revenue = salesByDay.reduce((sum, d) => sum + d.revenue, 0)
  const orders = salesByDay.reduce((sum, d) => sum + d.orders, 0)
  const aov = orders > 0 ? Math.round(revenue / orders) : 0
  const chartData = salesByDay.map((d) => ({ label: d.date.slice(5), value: d.revenue }))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="매출" value={formatMoney(revenue)} icon={BarChart3} />
        <StatCard label="주문 수" value={orders.toLocaleString('ko-KR')} icon={ShoppingCart} />
        <StatCard label="평균 주문액" value={formatMoney(aov)} icon={Receipt} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium text-foreground">일별 매출</p>
        <MiniBarChart data={chartData} formatValue={(v) => formatMoney(v)} height={160} />
      </div>

      <div className="flex flex-wrap gap-3">
        {ordersByStatus.map((row) => (
          <div key={row.status} className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5">
            <StatusBadge kind="order" value={row.status} />
            <span className="text-[13px] font-medium tabular-nums text-foreground">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { SalesTab }
