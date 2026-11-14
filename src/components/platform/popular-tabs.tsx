'use client'

// 현장에서 많이 찾는 제품 모음 — 오늘주목 / 실시간픽 / 거래핫픽 / 스페셜픽 탭

import { useState } from 'react'

import { ProductCard, type ProductCardData } from '@/components/store/product-card'
import { cn } from '@/lib/utils'

export interface PopularTab {
  key: string
  label: string
  description: string
  items: { card: ProductCardData; orgSlug: string; orgName: string }[]
}

export function PopularTabs({ tabs }: { tabs: PopularTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key)
  const current = tabs.find((t) => t.key === active) ?? tabs[0]
  if (!current) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === current.key}
            onClick={() => setActive(t.key)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              t.key === current.key ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-accent',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{current.description}</p>
      {current.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 모인 기록이 없어요. 고객 방문이 쌓이면 자동으로 채워져요.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {current.items.map((i) => (
            <ProductCard key={i.card.id} orgSlug={i.orgSlug} product={i.card} supplierName={i.orgName} />
          ))}
        </div>
      )}
    </div>
  )
}
