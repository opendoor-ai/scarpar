// CSV export endpoint for the reports module (docs/architecture.md §11, docs/conventions.md).
// GET /api/export/{sales|products|delivery|mushak}?from=yyyy-mm-dd&to=yyyy-mm-dd

import type { NextRequest } from 'next/server'

import { requireOrg } from '@/lib/auth'
import { csvResponse, toCsv } from '@/lib/csv'
import { requireModule } from '@/lib/modules'
import { fromPaisa } from '@/lib/money'
import { codSuccessByDistrict, mushakSalesRegister, resolveRange, salesByDay, topProducts } from '@/modules/reports/queries'

export const dynamic = 'force-dynamic'

const VALID_REPORTS = ['sales', 'products', 'delivery', 'mushak'] as const
type ReportKey = (typeof VALID_REPORTS)[number]

function isReportKey(value: string): value is ReportKey {
  return (VALID_REPORTS as readonly string[]).includes(value)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params

  if (!isReportKey(report)) {
    return new Response('Not found', { status: 404 })
  }

  const ctx = await requireOrg()
  requireModule(ctx.org, 'reports')

  const { searchParams } = new URL(request.url)
  const range = resolveRange({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  })
  const filename = `scarpar-${report}-${range.from}-${range.to}.csv`

  switch (report) {
    case 'sales': {
      const rows = await salesByDay(ctx.org.id, range)
      const csv = toCsv(
        rows.map((row) => ({ date: row.date, revenue: fromPaisa(row.revenue), orders: row.orders })),
        [
          { key: 'date', label: '날짜' },
          { key: 'revenue', label: '매출(원)' },
          { key: 'orders', label: '주문 수' },
        ],
      )
      return csvResponse(filename, csv)
    }
    case 'products': {
      const rows = await topProducts(ctx.org.id, range)
      const csv = toCsv(
        rows.map((row) => ({ product: row.productName, revenue: fromPaisa(row.revenue), units: row.units })),
        [
          { key: 'product', label: '상품' },
          { key: 'revenue', label: '매출(원)' },
          { key: 'units', label: '수량' },
        ],
      )
      return csvResponse(filename, csv)
    }
    case 'delivery': {
      const rows = await codSuccessByDistrict(ctx.org.id, range)
      const csv = toCsv(
        rows.map((row) => ({
          district: row.district,
          delivered: row.delivered,
          failed: row.failed,
          rate: row.rate.toFixed(1),
        })),
        [
          { key: 'district', label: '지역' },
          { key: 'delivered', label: '완료' },
          { key: 'failed', label: '실패' },
          { key: 'rate', label: '성공률(%)' },
        ],
      )
      return csvResponse(filename, csv)
    }
    case 'mushak': {
      const rows = await mushakSalesRegister(ctx.org.id, range)
      const csv = toCsv(
        rows.map((row) => ({
          date: row.date,
          invoiceNo: row.invoiceNo,
          customer: row.customer,
          subtotal: fromPaisa(row.subtotal),
          vat: fromPaisa(row.vat),
          total: fromPaisa(row.total),
        })),
        [
          { key: 'date', label: '날짜' },
          { key: 'invoiceNo', label: '명세서/주문번호' },
          { key: 'customer', label: '고객' },
          { key: 'subtotal', label: '공급가액(원)' },
          { key: 'vat', label: '부가세(원)' },
          { key: 'total', label: '합계(원)' },
        ],
      )
      return csvResponse(filename, csv)
    }
    default: {
      return new Response('Not found', { status: 404 })
    }
  }
}
