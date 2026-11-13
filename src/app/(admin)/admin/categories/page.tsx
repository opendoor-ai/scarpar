import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { AlertTriangle } from 'lucide-react'

import { CategoryManager, type CategoryRow } from '@/modules/catalog/components/category-manager'

export const dynamic = 'force-dynamic'

interface RawCategoryRow {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
  products: { count: number }[]
}

export default async function CategoriesPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order, products(count)')
    .eq('org_id', ctx.org.id)
    .order('sort_order', { ascending: true })

  const raw = (data ?? []) as unknown as RawCategoryRow[]
  const byId = new Map(raw.map((r) => [r.id, r]))

  const categories: CategoryRow[] = raw.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    parentId: r.parent_id,
    parentName: r.parent_id ? (byId.get(r.parent_id)?.name ?? null) : null,
    sortOrder: r.sort_order,
    productCount: r.products?.[0]?.count ?? 0,
  }))

  return (
    <div>
      <PageHeader title="카테고리" description="고객이 종류별로 찾아볼 수 있게 상품을 분류합니다." />
      {error ? (
        <EmptyState icon={AlertTriangle} title="카테고리를 불러오지 못했습니다" description={error.message} />
      ) : (
        <CategoryManager categories={categories} />
      )}
    </div>
  )
}
