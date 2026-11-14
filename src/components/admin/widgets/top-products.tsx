import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { truncate } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MiniBarChart } from '@/components/ui/mini-chart'

interface OrderItemRow {
  product_name: string
  line_total: number
}

/** Top 5 products by order_items revenue over the last 30 days. */
export async function TopProductsWidget() {
  const ctx = await requireOrg()

  let top5: { label: string; value: number }[] = []

  try {
    const supabase = await getServerClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data } = await supabase
      .from('order_items')
      .select('product_name, line_total')
      .eq('org_id', ctx.org.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1000)

    const totals = new Map<string, number>()
    for (const row of (data ?? []) as OrderItemRow[]) {
      totals.set(row.product_name, (totals.get(row.product_name) ?? 0) + (row.line_total ?? 0))
    }

    top5 = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label: truncate(label, 8), value }))
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">인기 상품 (최근 30일)</CardTitle>
        <Link href="/admin/reports" className="text-xs text-primary hover:underline">
보고서
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {top5.length === 0 ? (
          <EmptyState icon={BarChart3} title="아직 판매 내역이 없습니다" className="py-8" />
        ) : (
          <MiniBarChart data={top5} height={120} valueFormat="compactWon" />
        )}
      </CardContent>
    </Card>
  )
}
