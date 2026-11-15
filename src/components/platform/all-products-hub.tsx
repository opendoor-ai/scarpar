'use client'

// 메인 "전체제품 허브" — 분류 탭(ALL + 1차 분류 아이콘) · 5×3 상품 · [더보기]로 15개씩 더

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Loader2 } from 'lucide-react'

import { CategoryIcon } from '@/components/platform/category-icon'

import { ProductCard } from '@/components/store/product-card'
import type { PlatformProductCard } from '@/lib/platform-products'
import { cn } from '@/lib/utils'

export interface HubTab {
  id: string
  slug: string
  name: string
  icon: string | null
  href: string
}

const PAGE = 15

export function AllProductsHub({
  tabs,
  initial,
  initialHasMore,
}: {
  tabs: HubTab[]
  initial: PlatformProductCard[]
  initialHasMore: boolean
}) {
  const [active, setActive] = useState('')
  const [items, setItems] = useState(initial)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [cache] = useState(() => new Map<string, { items: PlatformProductCard[]; hasMore: boolean }>([['', { items: initial, hasMore: initialHasMore }]]))

  async function load(cate: string, offset: number) {
    const res = await fetch(`/api/products/feed?cate=${encodeURIComponent(cate)}&offset=${offset}&limit=${PAGE}`)
    if (!res.ok) throw new Error('load failed')
    return (await res.json()) as { items: PlatformProductCard[]; hasMore: boolean }
  }

  async function pick(cate: string) {
    if (cate === active) return
    setActive(cate)
    const hit = cache.get(cate)
    if (hit) {
      setItems(hit.items)
      setHasMore(hit.hasMore)
      return
    }
    setLoading(true)
    try {
      const r = await load(cate, 0)
      cache.set(cate, r)
      setItems(r.items)
      setHasMore(r.hasMore)
    } catch {
      setItems([])
      setHasMore(false)
    }
    setLoading(false)
  }

  async function more() {
    setLoading(true)
    try {
      const r = await load(active, items.length)
      const next = [...items, ...r.items.filter((x) => !items.some((y) => y.card.id === x.card.id))]
      cache.set(active, { items: next, hasMore: r.hasMore })
      setItems(next)
      setHasMore(r.hasMore)
    } catch {
      setHasMore(false)
    }
    setLoading(false)
  }

  const activeTab = tabs.find((t) => t.id === active)

  return (
    <div className="flex flex-col gap-5">
      {/* 분류 탭 */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1 border-b border-border pb-px">
          <button
            type="button"
            onClick={() => pick('')}
            className={cn(
              'flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-t-lg px-1 py-2.5 text-xs font-bold transition-colors',
              active === '' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <CategoryIcon slug="all" className="size-11 shadow-none" />
            전체
          </button>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className={cn(
                'flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-t-lg px-1 py-2.5 text-[11px] leading-tight transition-colors',
                active === t.id ? 'bg-primary font-bold text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              title={t.name}
            >
              <CategoryIcon slug={t.slug} image={t.icon} className="size-11 shadow-none" />
              <span className="line-clamp-3 break-keep">{t.name.replaceAll('·', '·​')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5×3 상품 */}
      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {activeTab ? `${activeTab.name} 분류에 등록된 제품이 아직 없어요.` : '아직 등록된 제품이 없어요.'}
        </p>
      ) : (
        <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5', loading && 'opacity-60')}>
          {items.map((i) => (
            <ProductCard key={i.card.id} orgSlug={i.orgSlug} product={i.card} supplierName={i.orgName} />
          ))}
        </div>
      )}

      {/* 더보기 */}
      <div className="flex justify-center gap-2">
        {hasMore ? (
          <button
            type="button"
            onClick={more}
            disabled={loading}
            className="inline-flex h-11 min-w-48 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-6 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
            더보기
          </button>
        ) : null}
        <Link
          href={activeTab ? activeTab.href : '/products'}
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm text-muted-foreground hover:text-foreground"
        >
          {activeTab ? `${activeTab.name} 전체 보기 →` : '전체 제품 보기 →'}
        </Link>
      </div>
    </div>
  )
}
