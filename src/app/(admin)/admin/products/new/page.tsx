import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getPlatformCategories } from '@/lib/platform-categories'

import { ProductForm } from '@/modules/catalog/components/product-form'
import { toCategoryOptions } from '@/modules/catalog/category-options'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')

  // 플랫폼 공통 카테고리에서 고름 (모든 공급사 공통)
  const categories = toCategoryOptions(await getPlatformCategories())

  return (
    <div>
      <PageHeader title="새 상품 등록" backHref="/admin/products" />
      <ProductForm mode="create" categories={categories} />
    </div>
  )
}
