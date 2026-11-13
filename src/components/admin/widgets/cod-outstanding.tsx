import Link from 'next/link'
import { Banknote } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { formatCompact } from '@/lib/money'
import { Card } from '@/components/ui/card'

/** COD not yet collected (excluding failed/returned deliveries) + cash currently held by riders. */
export async function CodOutstandingWidget() {
  const ctx = await requireOrg()

  let outstanding = 0
  let withRiders = 0

  try {
    const supabase = await getServerClient()

    const [deliveriesResult, ridersResult] = await Promise.all([
      supabase
        .from('deliveries')
        .select('cod_amount')
        .eq('org_id', ctx.org.id)
        .eq('cod_collected', false)
        .not('status', 'in', '(failed,returned)'),
      supabase.from('riders').select('cash_on_hand').eq('org_id', ctx.org.id),
    ])

    outstanding = ((deliveriesResult.data ?? []) as { cod_amount: number }[]).reduce(
      (sum, row) => sum + (row.cod_amount ?? 0),
      0,
    )
    withRiders = ((ridersResult.data ?? []) as { cash_on_hand: number }[]).reduce(
      (sum, row) => sum + (row.cash_on_hand ?? 0),
      0,
    )
  } catch {
    // placeholder-env safety — zeros on failure
  }

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">미정산 착불금</span>
        <Banknote className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">미수금</span>
          <span className="text-[16px] font-semibold text-foreground tabular-nums">
            {formatCompact(outstanding, { symbol: true })}
          </span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">배송기사 보유</span>
          <span className="text-[16px] font-semibold text-foreground tabular-nums">
            {formatCompact(withRiders, { symbol: true })}
          </span>
        </div>
      </div>

      <Link href="/admin/cod" className="text-xs text-primary hover:underline">
        착불 정산 보기
      </Link>
    </Card>
  )
}
