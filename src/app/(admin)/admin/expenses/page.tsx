import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { formatMoney } from '@/lib/money'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import { ExpenseFormDialog, type ExpenseWithReceipt } from '@/modules/expenses/components/expense-form-dialog'
import { ExpensesTable } from '@/modules/expenses/components/expenses-table'
import { MonthPicker } from '@/modules/expenses/components/month-picker'
import type { Expense } from '@/types/db'

export const dynamic = 'force-dynamic'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isValidMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value))
}

function monthBounds(month: string): { gte: string; lt: string } {
  const [year, mon] = month.split('-').map(Number)
  const gte = `${month}-01`
  const lt = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, '0')}-01`
  return { gte, lt }
}

export default async function ExpensesPage({
  searchParams,
}: PageProps<Record<string, never>, { month?: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'expenses')

  const sp = await searchParams
  const month = isValidMonth(sp.month) ? sp.month : currentMonth()
  const { gte, lt } = monthBounds(month)

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('org_id', ctx.org.id)
    .gte('spent_at', gte)
    .lt('spent_at', lt)
    .order('spent_at', { ascending: false })

  if (error) console.error('[expenses] page list failed', error)
  const expenses = (data ?? []) as Expense[]

  // expenses only stores media_id (the FK); MediaPicker needs the path too, so resolve it here
  // once and attach it to each row rather than teaching the table/dialog about the media table.
  const mediaIds = [...new Set(expenses.map((e) => e.media_id).filter((id): id is string => Boolean(id)))]
  const pathByMedia = new Map<string, string>()
  if (mediaIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await supabase
      .from('media')
      .select('id, path')
      .eq('org_id', ctx.org.id)
      .in('id', mediaIds)
    if (mediaError) console.error('[expenses] receipt media lookup failed', mediaError)
    for (const m of (mediaRows ?? []) as { id: string; path: string }[]) pathByMedia.set(m.id, m.path)
  }
  const expensesWithReceipt: ExpenseWithReceipt[] = expenses.map((e) => ({
    ...e,
    receiptPath: e.media_id ? (pathByMedia.get(e.media_id) ?? null) : null,
  }))

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = new Map<string, number>()
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount)
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <div>
      <PageHeader
        title="지출관리"
        description="분류별로 지출을 기록합니다."
        actions={
          <>
            <MonthPicker month={month} />
            <ExpenseFormDialog
              trigger={
                <Button type="button">
                  <Plus className="size-4" />
                  새 지출
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="이번 달" value={formatMoney(total)} />
        <StatCard label="가장 큰 분류" value={topCategory ? topCategory[0] : '—'} />
        <StatCard label="건수" value={expenses.length} />
      </div>

      <ExpensesTable expenses={expensesWithReceipt} />
    </div>
  )
}
