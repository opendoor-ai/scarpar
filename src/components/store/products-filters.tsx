import Link from 'next/link'
import { Search } from 'lucide-react'

import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { categoryKey, type PlatformCategory } from '@/lib/platform-categories'

import { storePath } from './store-links'

/** basePath를 주면 그 주소(예: 통합 검색 '/products')를, 없으면 공급사 미니샵 목록 주소를 씁니다. */
function productsHref(orgSlug: string, opts: { category?: string; query?: string; basePath?: string }): string {
  const params = new URLSearchParams()
  if (opts.category) params.set('cate_no', opts.category)
  if (opts.query) params.set('q', opts.query)
  const qs = params.toString()
  const base = opts.basePath ?? storePath(orgSlug, '/products')
  return `${base}${qs ? `?${qs}` : ''}`
}

const PILL = 'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'
/** 휴대폰: 옆으로 밀어서 보는 한 줄 / PC: 여러 줄로 감싸기 */
const PILL_ROW =
  '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden'
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
  counts,
  query,
  lang = 'ko',
  basePath,
}: {
  orgSlug: string
  categories: Pick<PlatformCategory, 'id' | 'name' | 'slug' | 'parent_id' | 'cate_no'>[]
  activeSlug?: string
  /** 분류 id → 상품 수 (주면 이름 옆에 표시) */
  counts?: Record<string, number>
  query?: string
  lang?: Lang
  basePath?: string
}) {
  if (categories.length === 0) return null

  const ids = new Set(categories.map((c) => c.id))
  // 부모가 없거나(1차) 부모를 찾을 수 없는 카테고리는 1차로 취급
  const roots = categories.filter((c) => !c.parent_id || !ids.has(c.parent_id))
  const active = activeSlug ? categories.find((c) => categoryKey(c) === activeSlug) : undefined
  const activeRoot = active
    ? roots.find((r) => r.id === active.id) ?? roots.find((r) => r.id === active.parent_id)
    : undefined
  const subs = activeRoot ? categories.filter((c) => c.parent_id === activeRoot.id) : []

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className={PILL_ROW}>
        <Link href={productsHref(orgSlug, { query, basePath })} className={cn(PILL, !activeSlug ? PILL_ACTIVE : PILL_IDLE)}>
          {t('all_products', lang)}
        </Link>
        {roots.map((c) => (
          <Link
            key={c.id}
            href={productsHref(orgSlug, { category: categoryKey(c), query, basePath })}
            className={cn(PILL, activeRoot?.id === c.id ? PILL_ACTIVE : PILL_IDLE)}
          >
            {c.name}
            {counts?.[c.id] ? <span className="ml-1 opacity-70">{counts[c.id]}</span> : null}
          </Link>
        ))}
      </div>

      {activeRoot && subs.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto rounded-lg bg-muted/50 p-2 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
          <Link
            href={productsHref(orgSlug, { category: categoryKey(activeRoot), query, basePath })}
            className={cn(PILL, active?.id === activeRoot.id ? 'border-foreground bg-background' : 'border-transparent hover:bg-background')}
          >
            {activeRoot.name} 전체
          </Link>
          {subs.map((c) => (
            <Link
              key={c.id}
              href={productsHref(orgSlug, { category: categoryKey(c), query, basePath })}
              className={cn(PILL, active?.id === c.id ? 'border-foreground bg-background' : 'border-transparent hover:bg-background')}
            >
              {c.name}
              {counts?.[c.id] ? <span className="ml-1 opacity-70">{counts[c.id]}</span> : null}
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
  basePath,
  placeholder,
  className,
}: {
  orgSlug: string
  query?: string
  category?: string
  lang?: Lang
  basePath?: string
  placeholder?: string
  className?: string
}) {
  return (
    <form action={basePath ?? storePath(orgSlug, '/products')} method="GET" role="search" className={cn('relative w-full sm:w-96', className)}>
      {category ? <input type="hidden" name="cate_no" value={category} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder={placeholder ?? t('search', lang)}
        aria-label={placeholder ?? t('search', lang)}
        className="h-11 w-full rounded-full border-2 border-primary/70 bg-background pr-12 pl-5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 sm:text-sm"
      />
      <button type="submit" aria-label={t('search', lang)} className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-primary hover:bg-primary/10">
        <Search className="size-[18px]" strokeWidth={2.25} />
      </button>
    </form>
  )
}
