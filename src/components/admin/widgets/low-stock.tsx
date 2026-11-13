import Link from 'next/link'
import { PackageX } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

interface ProductRow {
  id: string
  name: string
  stock_qty: number
  low_stock_threshold: number
}

/**
 * Products at or below their low-stock threshold, limit 8. PostgREST filters
 * can't compare two columns directly, so this fetches tracked/active products
 * ordered by stock ascending and applies the threshold comparison in JS.
 */
export async function LowStockWidget() {
  const ctx = await requireOrg()

  let lowStock: ProductRow[] = []

  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_qty, low_stock_threshold')
      .eq('org_id', ctx.org.id)
      .eq('track_stock', true)
      .eq('status', 'active')
      .order('stock_qty', { ascending: true })
      .limit(50)

    const rows = (data ?? []) as ProductRow[]
    lowStock = rows.filter((row) => row.stock_qty <= row.low_stock_threshold).slice(0, 8)
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">재고 부족</CardTitle>
        <Link href="/admin/inventory" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {lowStock.length === 0 ? (
          <EmptyState icon={PackageX} title="재고 부족 상품이 없습니다" className="py-8" />
        ) : (
          <ul className="flex flex-col gap-1">
            {lowStock.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent"
                >
                  <span className="truncate text-foreground">{product.name}</span>
                  <Badge variant={product.stock_qty === 0 ? 'destructive' : 'warning'}>
                    {product.stock_qty} left
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
