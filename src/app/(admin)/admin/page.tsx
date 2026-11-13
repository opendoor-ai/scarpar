import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { LayoutDashboard } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { widgetsForOrg } from '@/lib/modules'
import type { DashboardWidgetId } from '@/modules/types'
import { EmptyState } from '@/components/ui/empty-state'

import { SalesTodayWidget } from '@/components/admin/widgets/sales-today'
import { OrdersRecentWidget } from '@/components/admin/widgets/orders-recent'
import { LowStockWidget } from '@/components/admin/widgets/low-stock'
import { DeliveriesPendingWidget } from '@/components/admin/widgets/deliveries-pending'
import { CodOutstandingWidget } from '@/components/admin/widgets/cod-outstanding'
import { TopProductsWidget } from '@/components/admin/widgets/top-products'
import { EnrollmentsRecentWidget } from '@/components/admin/widgets/enrollments-recent'
import { JobsTodayWidget } from '@/components/admin/widgets/jobs-today'
import { ListingsActiveWidget } from '@/components/admin/widgets/listings-active'
import { InquiriesNewWidget } from '@/components/admin/widgets/inquiries-new'
import { ExpensesMonthWidget } from '@/components/admin/widgets/expenses-month'
import { ReviewsPendingWidget } from '@/components/admin/widgets/reviews-pending'

export const dynamic = 'force-dynamic'

// Visual hierarchy for the grid — independent of widgetsForOrg()'s module-list-derived
// order, which optimizes for config simplicity rather than dashboard scannability.
const DISPLAY_ORDER: DashboardWidgetId[] = [
  'sales-today',
  'orders-recent',
  'low-stock',
  'deliveries-pending',
  'cod-outstanding',
  'top-products',
  'expenses-month',
  'reviews-pending',
  'enrollments-recent',
  'jobs-today',
  'listings-active',
  'inquiries-new',
]

const WIDGET_SPAN: Record<DashboardWidgetId, string> = {
  'sales-today': 'col-span-12 md:col-span-6 lg:col-span-3',
  'orders-recent': 'col-span-12 md:col-span-6 lg:col-span-6',
  'low-stock': 'col-span-12 md:col-span-6 lg:col-span-3',
  'deliveries-pending': 'col-span-12 md:col-span-6 lg:col-span-6',
  'cod-outstanding': 'col-span-12 md:col-span-6 lg:col-span-3',
  'top-products': 'col-span-12 md:col-span-6 lg:col-span-3',
  'expenses-month': 'col-span-12 md:col-span-6 lg:col-span-4',
  'reviews-pending': 'col-span-12 md:col-span-6 lg:col-span-4',
  'enrollments-recent': 'col-span-12 md:col-span-6 lg:col-span-4',
  'jobs-today': 'col-span-12 md:col-span-6 lg:col-span-4',
  'listings-active': 'col-span-12 md:col-span-6 lg:col-span-6',
  'inquiries-new': 'col-span-12 md:col-span-6 lg:col-span-6',
}

function renderWidget(id: DashboardWidgetId): ReactNode {
  switch (id) {
    case 'sales-today':
      return <SalesTodayWidget />
    case 'orders-recent':
      return <OrdersRecentWidget />
    case 'low-stock':
      return <LowStockWidget />
    case 'deliveries-pending':
      return <DeliveriesPendingWidget />
    case 'cod-outstanding':
      return <CodOutstandingWidget />
    case 'top-products':
      return <TopProductsWidget />
    case 'enrollments-recent':
      return <EnrollmentsRecentWidget />
    case 'jobs-today':
      return <JobsTodayWidget />
    case 'listings-active':
      return <ListingsActiveWidget />
    case 'inquiries-new':
      return <InquiriesNewWidget />
    case 'expenses-month':
      return <ExpensesMonthWidget />
    case 'reviews-pending':
      return <ReviewsPendingWidget />
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

function greetingFor(hour: number): string {
  if (hour < 12) return '좋은 아침입니다'
  if (hour < 17) return '안녕하세요'
  return '좋은 저녁입니다'
}

export default async function AdminDashboardPage() {
  const ctx = await requireOrg()

  let firstName = ctx.user.email?.split('@')[0] ?? '관리자'
  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', ctx.user.id)
      .maybeSingle()

    const fullName = (data as { full_name: string | null } | null)?.full_name
    if (fullName) firstName = fullName.split(' ')[0]
  } catch {
    // keep the email-derived fallback
  }

  const enabledWidgetIds = widgetsForOrg(ctx.org)
  const orderedIds = DISPLAY_ORDER.filter((id) => enabledWidgetIds.includes(id))

  const greeting = greetingFor(new Date().getHours())
  const today = format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          {greeting}, {firstName}님
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {orderedIds.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="표시할 항목이 없습니다"
          description="설정에서 기능을 켜면 여기에 현황이 표시됩니다."
        />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {orderedIds.map((id) => (
            <div key={id} className={WIDGET_SPAN[id]}>
              {renderWidget(id)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
