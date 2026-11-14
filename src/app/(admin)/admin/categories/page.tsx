// 상품분류 관리 — 모든 공급사가 함께 쓰는 플랫폼 공통 분류 (1차 → 2차)
// 전자동(플랫폼 관리자)은 추가·수정·삭제·이동, 공급사는 보기만 합니다.

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getPlatformOrgId, normalizeCategory, type PlatformCategory } from '@/lib/platform-categories'
import { getAdminClient } from '@/lib/supabase/admin'
import { CategoryTreeManager, type CategoryItem } from '@/modules/catalog/components/category-tree-manager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')

  const [canEdit, platformOrgId] = await Promise.all([isPlatformAdmin(), getPlatformOrgId()])
  const admin = getAdminClient()

  let items: CategoryItem[] = []
  let needsSql = false
  if (platformOrgId) {
    const { data } = await admin
      .from('categories')
      .select('*')
      .eq('org_id', platformOrgId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    const rows = ((data ?? []) as Parameters<typeof normalizeCategory>[0][]).map(normalizeCategory)
    needsSql = (data ?? []).length > 0 && !('is_visible' in ((data ?? [])[0] as object))

    // 분류별 상품 수 (모든 공급사, 보관함 제외) — 공급사는 자기 상품 수만
    let countQuery = admin.from('products').select('category_id').not('category_id', 'is', null).neq('status', 'archived')
    if (!canEdit) countQuery = countQuery.eq('org_id', ctx.org.id)
    const { data: productRows } = await countQuery.limit(50000)
    const counts = new Map<string, number>()
    for (const p of (productRows ?? []) as { category_id: string }[]) {
      counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1)
    }
    items = rows.map((c: PlatformCategory) => ({ ...c, productCount: counts.get(c.id) ?? 0 }))
  }

  return (
    <div>
      <PageHeader
        title="상품분류 관리"
        description={
          canEdit
            ? '모든 공급사가 함께 쓰는 공통 분류입니다. 분류를 추가·수정·삭제하고, 끌어서 순서를 바꿀 수 있어요.'
            : '전자동이 관리하는 공통 분류입니다. 숫자는 우리 공급사 상품 수예요.'
        }
      />
      {needsSql && canEdit ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          표시 상태·SEO 같은 상세 설정을 저장하려면 Supabase SQL 편집기에서 <code>0015_category_settings.sql</code>을
          먼저 실행해 주세요.
        </p>
      ) : null}
      <CategoryTreeManager initial={items} canEdit={canEdit} />
    </div>
  )
}
