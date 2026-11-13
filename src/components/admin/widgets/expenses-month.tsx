import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { format } from 'date-fns'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { formatCompact } from '@/lib/money'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface ExpenseRow {
  amount: number
  category: string
}

/** Current-month expense sum + top 3 categories. */
export async function ExpensesMonthWidget() {
  const ctx = await requireOrg()

  let total = 0
  let topCategories: [string, number][] = []

  try {
    const supabase = await getServerClient()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)

    const { data } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('org_id', ctx.org.id)
      .gte('spent_at', format(startOfMonth, 'yyyy-MM-dd'))

    const rows = (data ?? []) as ExpenseRow[]
    total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)

    const byCategory = new Map<string, number>()
    for (const row of rows) {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + (row.amount ?? 0))
    }
    topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  } catch {
    // placeholder-env safety — zeros on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">이번 달 지출</CardTitle>
        <Link href="/admin/expenses" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        <span className="text-[20px] font-semibold text-foreground tabular-nums">
          {formatCompact(total, { symbol: true })}
        </span>
        {topCategories.length === 0 ? (
          <EmptyState icon={Wallet} title="아직 기록된 지출이 없습니다" className="py-4" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {topCategories.map(([category, amount]) => (
              <li key={category} className="flex items-center justify-between text-[13px]">
                <span className="truncate text-muted-foreground capitalize">{category}</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCompact(amount, { symbol: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
