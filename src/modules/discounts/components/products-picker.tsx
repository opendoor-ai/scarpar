'use client'

import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchInput } from '@/components/ui/search-input'

import { searchProducts } from '../actions'

interface ProductOption {
  id: string
  name: string
}

interface ProductsPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
  initialProducts?: ProductOption[]
}

export function ProductsPicker({ value, onChange, initialProducts = [] }: ProductsPickerProps) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<ProductOption[]>(initialProducts)
  const [loading, setLoading] = React.useState(false)
  const [labels, setLabels] = React.useState<Map<string, string>>(
    () => new Map(initialProducts.map((p) => [p.id, p.name])),
  )

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    searchProducts(query).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.ok) {
        const found = result.data ?? []
        setResults(found)
        setLabels((prev) => {
          const next = new Map(prev)
          for (const p of found) next.set(p.id, p.name)
          return next
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [query])

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <SearchInput value={query} onChange={setQuery} placeholder="상품명으로 검색..." />

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {labels.get(id) ?? id}
              <button type="button" onClick={() => toggle(id)} className="opacity-70 hover:opacity-100" aria-label="삭제">
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {loading ? (
          <p className="text-muted-foreground py-2 text-xs">검색 중...</p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground py-2 text-xs">상품을 찾을 수 없습니다.</p>
        ) : (
          results.map((product) => (
            <label
              key={product.id}
              className="hover:bg-accent flex items-center gap-2 rounded px-1 py-1 text-sm"
            >
              <Checkbox checked={value.includes(product.id)} onCheckedChange={() => toggle(product.id)} />
              {product.name}
            </label>
          ))
        )}
      </div>
    </div>
  )
}
