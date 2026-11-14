import { PageHeader } from '@/components/ui/page-header'
import { requireOrg, requireRole } from '@/lib/auth'
import { requireModule } from '@/lib/modules'

import { ProductImport } from '@/modules/catalog/components/product-import'

export const dynamic = 'force-dynamic'

export default async function ProductImportPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')
  requireRole(ctx, 'manager')

  return (
    <div>
      <PageHeader
        title="상품 대량 등록"
        description="엑셀(CSV) 파일로 여러 상품을 한 번에 등록합니다."
        backHref="/admin/products"
      />
      <ProductImport />
    </div>
  )
}
