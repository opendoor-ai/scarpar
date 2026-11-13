import { Package } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { MiniBarChart } from '@/components/ui/mini-chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/money'
import type { TopProductRow } from '@/modules/reports/queries'

interface ProductsTabProps {
  topProducts: TopProductRow[]
}

function ProductsTab({ topProducts }: ProductsTabProps) {
  if (topProducts.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="이 기간에 판매된 상품이 없습니다"
        description="주문이 들어오면 여기에 표시됩니다."
      />
    )
  }

  const chartData = topProducts.map((p) => ({
    label: p.productName.length > 10 ? `${p.productName.slice(0, 9)}…` : p.productName,
    value: p.revenue,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium text-foreground">매출 상위 상품</p>
        <MiniBarChart data={chartData} formatValue={(v) => formatMoney(v)} height={160} />
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상품</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">매출</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProducts.map((p) => (
              <TableRow key={p.productName}>
                <TableCell className="font-medium">{p.productName}</TableCell>
                <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(p.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export { ProductsTab }
