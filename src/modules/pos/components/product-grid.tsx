'use client'

import * as React from 'react'
import { Package, Search as SearchIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { PosCategory, PosProduct, PosVariant } from '@/modules/pos/components/pos-terminal'

interface ProductGridProps {
  products: PosProduct[]
  categories: PosCategory[]
  search: string
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  categoryId: string | null
  onCategoryChange: (id: string | null) => void
  onAdd: (product: PosProduct, variant?: PosVariant) => void
}

export function ProductGrid({
  products,
  categories,
  search,
  onSearchChange,
  onSearchKeyDown,
  searchRef,
  categoryId,
  onCategoryChange,
  onAdd,
}: ProductGridProps) {
  const query = search.trim().toLowerCase()

  const filtered = products.filter((product) => {
    if (categoryId && product.categoryId !== categoryId) return false
    if (!query) return true
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="상품명·SKU 검색 또는 바코드 스캔... (/ 키로 바로 입력)"
          className="h-9 pl-8"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
            categoryId === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-background hover:bg-accent',
          )}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              categoryId === category.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent',
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="상품을 찾을 수 없습니다" description="다른 검색어나 카테고리를 선택해 보세요." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) =>
            product.variants.length > 0 ? (
              <Popover key={product.id}>
                <PopoverTrigger asChild>
                  <ProductCard product={product} />
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start">
                  <div className="flex flex-col">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => onAdd(product, variant)}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <span>{variant.name}</span>
                        <span className="tabular-nums text-muted-foreground">{formatMoney(variant.price)}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <ProductCard key={product.id} product={product} onClick={() => onAdd(product)} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

const ProductCard = React.forwardRef<HTMLButtonElement, { product: PosProduct; onClick?: () => void }>(
  function ProductCard({ product, onClick }, ref) {
    const outOfStock = product.trackStock && product.stockQty <= 0

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="flex flex-col items-start gap-1.5 rounded-lg border bg-background p-2 text-left transition-colors hover:bg-accent"
      >
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, not in next/image's remotePatterns
            <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
          ) : (
            <Package className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="line-clamp-2 text-xs font-medium">{product.name}</div>
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-semibold tabular-nums">{formatMoney(product.price)}</span>
          {outOfStock ? (
            <Badge variant="warning" className="text-[10px]">
              품절
            </Badge>
          ) : null}
        </div>
      </button>
    )
  },
)
