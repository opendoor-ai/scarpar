import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PosTerminal } from '@/modules/pos/components/pos-terminal'
import type { PosCategory, PosProduct, PosVariant } from '@/modules/pos/components/pos-terminal'
import type { Category, Product, ProductImage, ProductVariant } from '@/types/db'

export const dynamic = 'force-dynamic'

export default async function PosPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'pos')

  const supabase = await getServerClient()

  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, price, sku, barcode, stock_qty, track_stock, category_id')
    .eq('org_id', ctx.org.id)
    .eq('status', 'active')
    .order('position', { ascending: true })
    .limit(300)

  const products = (productsData ?? []) as Pick<
    Product,
    'id' | 'name' | 'price' | 'sku' | 'barcode' | 'stock_qty' | 'track_stock' | 'category_id'
  >[]
  const productIds = products.map((product) => product.id)

  const [variantsResult, imagesResult, categoriesResult] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from('product_variants')
          .select('id, product_id, name, sku, price, stock_qty, options, is_default, position')
          .in('product_id', productIds)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [] as ProductVariant[] }),
    productIds.length > 0
      ? supabase
          .from('product_images')
          .select('id, product_id, variant_id, media_id, position')
          .in('product_id', productIds)
          .is('variant_id', null)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [] as ProductImage[] }),
    supabase.from('categories').select('id, name').eq('org_id', ctx.org.id).order('sort_order', { ascending: true }),
  ])

  const variants = (variantsResult.data ?? []) as ProductVariant[]
  const images = (imagesResult.data ?? []) as ProductImage[]
  const categories = (categoriesResult.data ?? []) as Pick<Category, 'id' | 'name'>[]

  const mediaIds = Array.from(new Set(images.map((image) => image.media_id)))
  const mediaPathById = new Map<string, string>()
  if (mediaIds.length > 0) {
    const { data: media } = await supabase.from('media').select('id, path').in('id', mediaIds)
    for (const row of (media ?? []) as { id: string; path: string }[]) {
      mediaPathById.set(row.id, row.path)
    }
  }

  const firstImageByProduct = new Map<string, string>()
  for (const image of images) {
    if (!firstImageByProduct.has(image.product_id)) {
      const path = mediaPathById.get(image.media_id)
      if (path) firstImageByProduct.set(image.product_id, path)
    }
  }

  const variantsByProduct = new Map<string, PosVariant[]>()
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.product_id) ?? []
    list.push({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stockQty: variant.stock_qty,
      options: variant.options,
      isDefault: variant.is_default,
    })
    variantsByProduct.set(variant.product_id, list)
  }

  const posProducts: PosProduct[] = products.map((product) => {
    const path = firstImageByProduct.get(product.id)
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      sku: product.sku,
      barcode: product.barcode,
      stockQty: product.stock_qty,
      trackStock: product.track_stock,
      categoryId: product.category_id,
      imageUrl: path ? supabase.storage.from('media').getPublicUrl(path).data.publicUrl : null,
      variants: variantsByProduct.get(product.id) ?? [],
    }
  })

  const posCategories: PosCategory[] = categories.map((category) => ({ id: category.id, name: category.name }))

  return (
    <div className="flex min-h-[70vh] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">POS</h1>
        <p className="text-sm text-muted-foreground">
          상품을 검색하거나 스캔해 장바구니에 담고 결제하세요.
        </p>
      </div>
      <PosTerminal products={posProducts} categories={posCategories} />
    </div>
  )
}
