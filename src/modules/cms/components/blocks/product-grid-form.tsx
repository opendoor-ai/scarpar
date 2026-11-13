'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import type { ProductGridBlock } from '@/types/db'
import { getProductsByIdsAction, searchProductsAction } from '@/modules/cms/actions'
import type { ProductLite } from '@/modules/cms/schemas'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CategoryOption } from '../block-meta'
import { Field } from './field'

interface ProductGridFormProps {
  block: ProductGridBlock
  categories: CategoryOption[]
  onChange: (next: ProductGridBlock) => void
}

function ProductGridForm({ block, categories, onChange }: ProductGridFormProps) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<ProductLite[]>([])
  const [selectedNames, setSelectedNames] = React.useState<Record<string, string>>({})

  const productIds = React.useMemo(() => block.productIds ?? [], [block.productIds])

  React.useEffect(() => {
    if (block.mode !== 'manual' || productIds.length === 0) return
    const missing = productIds.filter((id) => !selectedNames[id])
    if (missing.length === 0) return
    void getProductsByIdsAction(missing).then((result) => {
      if (!result.ok) return
      setSelectedNames((prev) => {
        const next = { ...prev }
        for (const product of result.data ?? []) next[product.id] = product.name
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.mode, productIds])

  React.useEffect(() => {
    if (block.mode !== 'manual') return
    const handle = setTimeout(() => {
      void searchProductsAction(query).then((result) => {
        if (result.ok) setResults(result.data ?? [])
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [query, block.mode])

  function addProduct(product: ProductLite) {
    if (productIds.includes(product.id)) return
    setSelectedNames((prev) => ({ ...prev, [product.id]: product.name }))
    onChange({ ...block, productIds: [...productIds, product.id] })
  }

  function removeProduct(id: string) {
    onChange({ ...block, productIds: productIds.filter((pid) => pid !== id) })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="제목">
        <Input value={block.title ?? ''} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </Field>

      <Field label="가져올 곳">
        <Select
          value={block.mode}
          onValueChange={(value) => onChange({ ...block, mode: value as ProductGridBlock['mode'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">추천 상품</SelectItem>
            <SelectItem value="category">특정 카테고리</SelectItem>
            <SelectItem value="manual">직접 고른 상품</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {block.mode === 'category' ? (
        <Field label="카테고리">
          <Select
            value={block.categoryId ?? ''}
            onValueChange={(value) => onChange({ ...block, categoryId: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {block.mode === 'manual' ? (
        <Field label="상품" help="보여줄 상품을 검색해서 순서대로 추가하세요.">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="상품 검색..." />
          {results.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-md border p-1.5">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={productIds.includes(product.id)}
                  className="flex items-center justify-between rounded px-2 py-1 text-left text-[13px] hover:bg-accent disabled:opacity-40"
                >
                  <span>{product.name}</span>
                  {product.sku ? <span className="text-xs text-muted-foreground">{product.sku}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          {productIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {productIds.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  {selectedNames[id] ?? id}
                  <button type="button" onClick={() => removeProduct(id)}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </Field>
      ) : null}

      <Field label="표시 개수">
        <Input
          type="number"
          min={1}
          value={block.limit ?? ''}
          onChange={(e) => onChange({ ...block, limit: e.target.value ? Number(e.target.value) : undefined })}
        />
      </Field>
    </div>
  )
}

export { ProductGridForm }
