// 상품 카드 — 대표이미지(아이콘: 왼쪽 위 직접거래 등 / 왼쪽 아래 신품·중고) + 상품명 · 모델명 · 공급사 · 가격

import Link from 'next/link'

import { t, type Lang } from '@/lib/i18n'
import { formatMoney, formatPrice } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/db'

import { BADGE_CLASS, BADGE_LABEL, CONDITION_BADGE_CLASS, CONDITION_LABEL, isProductBadge } from './product-detail/labels'
import { productPath } from './store-links'

export interface ProductCardData
  extends Pick<
    Product,
    'id' | 'product_no' | 'slug' | 'name' | 'price' | 'compare_at_price' | 'track_stock' | 'stock_qty' | 'allow_backorder'
  > {
  image: string | null
  condition?: Product['condition']
  model_name?: string | null
  badges?: string[] | null
}

export function ProductCard({
  orgSlug,
  product,
  lang = 'ko',
  supplierName,
}: {
  orgSlug: string
  product: ProductCardData
  lang?: Lang
  /** 통합 검색에서 어느 공급사 상품인지 표시 */
  supplierName?: string
}) {
  const outOfStock = product.track_stock && product.stock_qty <= 0 && !product.allow_backorder
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > product.price && product.price > 0
  const badges = (product.badges ?? []).filter(isProductBadge)

  return (
    <Link
      href={productPath(orgSlug, product.product_no)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#e9e9e9]">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="size-full object-contain transition-transform duration-150 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-2xs flex size-full items-center justify-center text-muted-foreground">이미지 없음</div>
        )}

        {/* 왼쪽 위: 직접거래 등 아이콘 */}
        {badges.length > 0 ? (
          <span data-card-field="badges" className="absolute top-0 left-0 flex flex-wrap gap-0.5">
            {badges.map((b, i) => (
              <span
                key={b}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-bold italic shadow-sm sm:text-xs',
                  i === 0 ? 'rounded-br-md' : 'rounded-b-md',
                  BADGE_CLASS[b],
                )}
              >
                {BADGE_LABEL[b]}
              </span>
            ))}
          </span>
        ) : null}

        {/* 왼쪽 아래: 신품·중고 */}
        {product.condition ? (
          <span
            data-card-field="condition"
            className={cn(
              'absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold shadow-sm',
              CONDITION_BADGE_CLASS[product.condition],
            )}
          >
            {CONDITION_LABEL[product.condition]}
          </span>
        ) : null}

        {outOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-2xs rounded-md bg-foreground px-2 py-1 font-medium text-background">
              {t('out_of_stock', lang)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
        {product.model_name ? (
          <p data-card-field="model" className="truncate text-xs text-muted-foreground">
            {product.model_name}
          </p>
        ) : null}
        {supplierName ? (
          <p data-card-field="supplier" className="mt-1 truncate text-sm font-semibold">
            {supplierName}
          </p>
        ) : null}
        <div data-card-field="price" className="mt-0.5 flex items-baseline gap-2">
          <span className="text-sm font-bold text-red-600 tabular-nums dark:text-red-400">{formatPrice(product.price)}</span>
          {hasDiscount ? (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              {formatMoney(product.compare_at_price as number)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
