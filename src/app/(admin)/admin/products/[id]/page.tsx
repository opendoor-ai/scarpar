import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import type { Product, ProductImage, ProductVariant } from '@/types/db'

import { ProductForm } from '@/modules/catalog/components/product-form'
import { toCategoryOptions } from '@/modules/catalog/category-options'

export const dynamic = 'force-dynamic'

interface RawImageRow extends ProductImage {
  media: { path: string } | null
}

export default async function EditProductPage({ params }: PageProps<{ id: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')
  const { id } = await params

  const supabase = await getServerClient()

  const [productResult, variantsResult, imagesResult, platformCategories] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('product_variants').select('*').eq('product_id', id).order('position'),
    supabase.from('product_images').select('*, media:media(path)').eq('product_id', id).order('position'),
    getPlatformCategories(),
  ])

  if (!productResult.data) {
    notFound()
  }

  const product = productResult.data as Product
  const variants = (variantsResult.data ?? []) as ProductVariant[]
  const images = ((imagesResult.data ?? []) as unknown as RawImageRow[]).map((row) => ({
    ...row,
    path: row.media?.path ?? '',
  }))
  // 플랫폼 공통 카테고리에서 고름 (모든 공급사 공통)
  const categories = toCategoryOptions(platformCategories)

  return (
    <div>
      <PageHeader title={product.name} description="상품 정보, 사진, 옵션을 수정합니다." backHref="/admin/products" />
      <ProductForm mode="edit" product={product} variants={variants} images={images} categories={categories} />
    </div>
  )
}
