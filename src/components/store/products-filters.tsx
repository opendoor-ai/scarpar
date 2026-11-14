import Link from 'next/link'

import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/db'

import { storePath } from './store-links'

function productsHref(orgSlug: string, opts: { category?: string; query?: string }): string {
  const params = new URLSearchParams()
  if (opts.category) params.set('category', opts.category)
  if (opts.query) params.set('q', opts.query)
  const qs = params.toString()
  return storePath(orgSlug, `/products${qs ? `?${qs}` : ''}`)
}

const PILL = 'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'
const PILL_ACTIVE = 'border-primary bg-primary text-primary-foreground'
const PILL_IDLE = 'border-input hover:bg-accent'

/**
 * 카테고리 버튼. 1차 카테고리를 한 줄로 보여주고,
 * 1차(또는 그 아래 2차)를 고른 상태면 바로 아래 줄에 그 1차의 2차 카테고리를 보여줍니다.
 */
export function CategoryPills({
  orgSlug,
  categories,
  activeSlug,
  query,
  lang = 'ko',
}: {
  orgSlug: string
  categories: Pick<Category, 'id' | 'name' | 'slug' | 'parent_id'>[]
  activeSlug?: string
  query?: string
  lang?: Lang
}) {
  if (categories.length === 0) return null

  const ids = new Set(categories.map((c) => c.id))
  // 부모가 없거나(1차) 부모를 찾을 수 없는 카테고리는 1차로 취급
  const roots = categories.filter((c) => !c.parent_id || !ids.has(c.parent_id))
  const active = activeSlug ? categories.find((c) => c.slug === activeSlug) : undefined
  const activeRoot = active
    ? roots.find((r) => r.id === active.id) ?? roots.find((r) => r.id === active.parent_id)
    : undefined
  const subs = activeRoot ? categories.filter((c) => c.parent_id === activeRoot.id) : []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link href={productsHref(orgSlug, { query })} className={cn(PILL, !activeSlug ? PILL_ACTIVE : PILL_IDLE)}>
          {t('all_products', lang)}
        </Link>
        {roots.map((c) => (
          <Link
            key={c.id}
            href={productsHref(orgSlug, { category: c.slug, query })}
            className={cn(PILL, activeRoot?.id === c.id ? PILL_ACTIVE : PILL_IDLE)}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {activeRoot && subs.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg bg-muted/50 p-2">
          <Link
            href={productsHref(orgSlug, { category: activeRoot.slug, query })}
            className={cn(PILL, active?.id === activeRoot.id ? 'border-foreground bg-background' : 'border-transparent hover:bg-background')}
          >
            {activeRoot.name} 전체
          </Link>
          {subs.map((c) => (
            <Link
              key={c.id}
              href={productsHref(orgSlug, { category: c.slug, query })}
              className={cn(PILL, active?.id === c.id ? 'border-foreground bg-background' : 'border-transparent hover:bg-background')}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ProductSearchBox({
  orgSlug,
  query,
  category,
  lang = 'ko',
}: {
  orgSlug: string
  query?: string
  category?: string
  lang?: Lang
}) {
  return (
    <form action={storePath(orgSlug, '/products')} method="GET" className="relative w-full sm:w-72">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder={t('search', lang)}
        className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-[13px] shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </form>
  )
}
