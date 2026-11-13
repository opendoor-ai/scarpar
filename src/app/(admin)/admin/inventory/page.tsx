import { History, PackageX, TrendingDown, Warehouse } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import type { InventoryMovementType } from '@/types/db'

import { AdjustStockDialog, type StockAdjustProduct } from '@/modules/catalog/components/adjust-stock-dialog'
import { InventoryMovementsTable, type MovementRow } from '@/modules/catalog/components/inventory-movements-table'

export const dynamic = 'force-dynamic'

interface RawMovementRow {
  id: number
  created_at: string
  qty_delta: number
  type: InventoryMovementType
  reference: string | null
  note: string | null
  actor_id: string | null
  product: { name: string } | null
  variant: { name: string } | null
}

interface RawStockProductRow {
  id: string
  name: string
  sku: string | null
  track_stock: boolean
  stock_qty: number
  product_variants: { id: string; name: string; stock_qty: number }[]
}

export default async function InventoryPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')

  const supabase = await getServerClient()

  const [movementsResult, totalTrackedResult, outOfStockResult, lowStockCandidatesResult, productsResult] =
    await Promise.all([
      supabase
        .from('inventory_movements')
        .select(
          'id, created_at, qty_delta, type, reference, note, actor_id, product:products(name), variant:product_variants(name)',
        )
        .eq('org_id', ctx.org.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', ctx.org.id).eq('track_stock', true),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.org.id)
        .eq('track_stock', true)
        .eq('stock_qty', 0),
      // PostgREST can't compare two columns of the same row, so low-stock
      // (stock_qty <= low_stock_threshold) is filtered client-side below.
      supabase
        .from('products')
        .select('id, stock_qty, low_stock_threshold')
        .eq('org_id', ctx.org.id)
        .eq('track_stock', true)
        .gt('stock_qty', 0),
      supabase
        .from('products')
        .select('id, name, sku, track_stock, stock_qty, product_variants(id, name, stock_qty)')
        .eq('org_id', ctx.org.id)
        .order('name'),
    ])

  const rawMovements = (movementsResult.data ?? []) as unknown as RawMovementRow[]
  const actorIds = [...new Set(rawMovements.map((m) => m.actor_id).filter((v): v is string => Boolean(v)))]

  // inventory_movements.actor_id and profiles.user_id both reference
  // auth.users(id) but there's no direct FK between the two tables, so
  // PostgREST embedding can't resolve actor names — a second query does.
  const actorNames = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', actorIds)
    for (const p of (profiles ?? []) as { user_id: string; full_name: string | null }[]) {
      if (p.full_name) actorNames.set(p.user_id, p.full_name)
    }
  }

  const movements: MovementRow[] = rawMovements.map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    productName: m.product?.name ?? '삭제된 상품',
    variantName: m.variant?.name ?? null,
    type: m.type,
    qtyDelta: m.qty_delta,
    reference: m.reference,
    note: m.note,
    actorName: m.actor_id ? (actorNames.get(m.actor_id) ?? null) : null,
  }))

  const lowStockRows = (lowStockCandidatesResult.data ?? []) as { id: string; stock_qty: number; low_stock_threshold: number }[]
  const lowStockCount = lowStockRows.filter((r) => r.stock_qty <= r.low_stock_threshold).length

  const products: StockAdjustProduct[] = ((productsResult.data ?? []) as unknown as RawStockProductRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    trackStock: p.track_stock,
    stockQty: p.stock_qty,
    variants: (p.product_variants ?? []).map((v) => ({ id: v.id, name: v.name, stockQty: v.stock_qty })),
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="재고관리"
        description="재고 입출고 내역과 수동 조정"
        actions={<AdjustStockDialog products={products} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="재고 관리 상품" value={totalTrackedResult.count ?? 0} icon={Warehouse} />
        <StatCard label="품절" value={outOfStockResult.count ?? 0} icon={PackageX} />
        <StatCard label="재고 부족" value={lowStockCount} icon={TrendingDown} />
      </div>

      {movements.length === 0 ? (
        <EmptyState icon={History} title="아직 재고 변동이 없습니다" description="재고 조정과 판매 내역이 여기에 표시됩니다." />
      ) : (
        <InventoryMovementsTable movements={movements} />
      )}
    </div>
  )
}
