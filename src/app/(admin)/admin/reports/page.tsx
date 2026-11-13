import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import type { PageProps } from '@/lib/types'
import { DateRangePicker } from '@/modules/reports/components/date-range-picker'
import { DeliveryTab } from '@/modules/reports/components/delivery-tab'
import { ExportButton } from '@/modules/reports/components/export-button'
import { FinanceTab } from '@/modules/reports/components/finance-tab'
import { ProductsTab } from '@/modules/reports/components/products-tab'
import { SalesTab } from '@/modules/reports/components/sales-tab'
import {
  codSuccessByDistrict,
  deliveryPerformance,
  expensesByCategory,
  ordersByStatus,
  pnl,
  resolveRange,
  salesByDay,
  topProducts,
} from '@/modules/reports/queries'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: PageProps<Record<string, never>, { from?: string; to?: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'reports')

  const sp = await searchParams
  const range = resolveRange({ from: sp.from, to: sp.to })

  const [sales, statuses, products, codDistrict, delivery, expensesCat, pnlResult] = await Promise.all([
    salesByDay(ctx.org.id, range),
    ordersByStatus(ctx.org.id, range),
    topProducts(ctx.org.id, range),
    codSuccessByDistrict(ctx.org.id, range),
    deliveryPerformance(ctx.org.id, range),
    expensesByCategory(ctx.org.id, range),
    pnl(ctx.org.id, range),
  ])

  return (
    <div>
      <PageHeader
        title="보고서"
        description="매출, 배송, 재무 현황"
        actions={<DateRangePicker from={range.from} to={range.to} />}
      />

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">매출</TabsTrigger>
          <TabsTrigger value="products">상품</TabsTrigger>
          <TabsTrigger value="delivery">배송</TabsTrigger>
          <TabsTrigger value="finance">재무</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="flex flex-col gap-4 pt-4">
          <div className="flex justify-end">
            <ExportButton report="sales" from={range.from} to={range.to} />
          </div>
          <SalesTab salesByDay={sales} ordersByStatus={statuses} />
        </TabsContent>

        <TabsContent value="products" className="flex flex-col gap-4 pt-4">
          <div className="flex justify-end">
            <ExportButton report="products" from={range.from} to={range.to} />
          </div>
          <ProductsTab topProducts={products} />
        </TabsContent>

        <TabsContent value="delivery" className="flex flex-col gap-4 pt-4">
          <div className="flex justify-end">
            <ExportButton report="delivery" from={range.from} to={range.to} />
          </div>
          <DeliveryTab performance={delivery} codByDistrict={codDistrict} />
        </TabsContent>

        <TabsContent value="finance" className="pt-4">
          <FinanceTab pnl={pnlResult} expensesByCategory={expensesCat} from={range.from} to={range.to} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
