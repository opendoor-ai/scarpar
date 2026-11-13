import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { formatCompact } from '@/lib/money'
import { Card } from '@/components/ui/card'

interface OrderRow {
  total: number
  status: string
}

/** Today's revenue (status != cancelled) + order count + pending count. */
export async function SalesTodayWidget() {
  const ctx = await requireOrg()

  let revenue = 0
  let orderCount = 0
  let pendingCount = 0

  try {
    const supabase = await getServerClient()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    const { data } = await supabase
      .from('orders')
      .select('total, status')
      .eq('org_id', ctx.org.id)
      .gte('placed_at', startOfToday.toISOString())
      .lt('placed_at', startOfTomorrow.toISOString())
      .neq('status', 'cancelled')

    const rows = (data ?? []) as OrderRow[]
    revenue = rows.reduce((sum, row) => sum + (row.total ?? 0), 0)
    orderCount = rows.length
    pendingCount = rows.filter((row) => row.status === 'pending').length
  } catch {
    // placeholder-env safety — zeros on failure
  }

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">오늘 매출</span>
        <TrendingUp className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-2">
        <StatRow label="매출" value={formatCompact(revenue, { symbol: true })} first />
        <StatRow label="주문" value={String(orderCount)} />
        <StatRow label="대기" value={String(pendingCount)} />
      </div>

      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        View orders <ArrowRight className="size-3" />
      </Link>
    </Card>
  )
}

function StatRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div
      className={
        first
          ? 'flex items-baseline justify-between'
          : 'flex items-baseline justify-between border-t border-border pt-2'
      }
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-[16px] font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  )
}
