'use client'

import * as React from 'react'
import { Search, Trash2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/money'
import { randomKey } from '@/lib/utils'
import { searchProductsAction, type ProductSearchResult } from '@/modules/orders/actions'

export interface OrderLineItem {
  key: string
  product_id?: string
  variant_id?: string
  product_name: string
  variant_name?: string
  sku?: string
  unit_price: number // minor, display only — server re-verifies from catalog
  qty: number
}

interface ItemBuilderProps {
  value: OrderLineItem[]
  onChange: (value: OrderLineItem[]) => void
}

function ItemBuilder({ value, onChange }: ItemBuilderProps) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<ProductSearchResult[]>([])
  const [open, setOpen] = React.useState(false)
  const [searching, setSearching] = React.useState(false)

  React.useEffect(() => {
    setSearching(true)
    const handle = setTimeout(async () => {
      const result = await searchProductsAction(query)
      if (result.ok) setResults(result.data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  function addLine(line: Omit<OrderLineItem, 'key' | 'qty'>) {
    const existing = value.find(
      (item) => item.product_id === line.product_id && item.variant_id === line.variant_id,
    )
    if (existing) {
      onChange(value.map((item) => (item.key === existing.key ? { ...item, qty: item.qty + 1 } : item)))
    } else {
      onChange([...value, { ...line, key: randomKey(8), qty: 1 }])
    }
    setOpen(false)
    setQuery('')
  }

  function addProduct(product: ProductSearchResult) {
    addLine({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku ?? undefined,
      unit_price: product.price,
    })
  }

  function addVariant(product: ProductSearchResult, variant: ProductSearchResult['variants'][number]) {
    addLine({
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_name: variant.name,
      sku: variant.sku ?? undefined,
      unit_price: variant.price,
    })
  }

  function setQty(key: string, qty: number) {
    onChange(value.map((item) => (item.key === key ? { ...item, qty: Math.max(1, Math.floor(qty) || 1) } : item)))
  }

  function removeLine(key: string) {
    onChange(value.filter((item) => item.key !== key))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder="상품명 또는 SKU로 검색"
          className="pl-8"
        />
        {open ? (
          <div className="bg-popover text-popover-foreground absolute z-10 mt-1 w-full rounded-md border shadow-xs">
            {searching ? (
              <div className="text-muted-foreground p-3 text-[13px]">검색 중…</div>
            ) : results.length === 0 ? (
              <div className="text-muted-foreground p-3 text-[13px]">일치하는 상품이 없습니다</div>
            ) : (
              <ul className="max-h-72 overflow-y-auto p-1">
                {results.map((product) =>
                  product.variants.length === 0 ? (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        disabled={product.track_stock && !product.allow_backorder && product.stock_qty <= 0}
                        className="hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>{product.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatMoney(product.price)}
                          {product.track_stock ? ` · 재고 ${product.stock_qty}개` : ''}
                        </span>
                      </button>
                    </li>
                  ) : (
                    <li key={product.id}>
                      <div className="text-muted-foreground px-2 pt-1.5 text-xs font-medium">{product.name}</div>
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => addVariant(product, variant)}
                          className="hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px]"
                        >
                          <span className="pl-2">{variant.name}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatMoney(variant.price)} · {variant.stock_qty} in stock
                          </span>
                        </button>
                      ))}
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {value.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상품</TableHead>
              <TableHead className="text-right">단가</TableHead>
              <TableHead className="w-20 text-right">수량</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.map((item) => (
              <TableRow key={item.key}>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{item.product_name}</span>
                    {item.variant_name ? (
                      <span className="text-muted-foreground text-xs">{item.variant_name}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(item.unit_price)}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => setQty(item.key, Number(e.target.value))}
                    className="h-7 w-16 text-right tabular-nums"
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(item.unit_price * item.qty)}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => removeLine(item.key)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="상품 삭제"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-[13px]">아직 추가한 상품이 없습니다.</p>
      )}
    </div>
  )
}

export { ItemBuilder }
