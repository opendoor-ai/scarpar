import Link from 'next/link'
import { Search } from 'lucide-react'

import { CategoryIcon } from '@/components/platform/category-icon'
import { t, type Lang } from '@/lib/i18n'
import { mediaUrl } from '@/lib/media-url'
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

/** 휴대폰: 옆으로 밀어서 보는 한 줄 / 태블릿·PC: 칸을 맞춘 바둑판 */
const ROW_1 =
  'flex gap-1.5 overflow-x-auto [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden'
const ROW_2 =
  'flex gap-1 overflow-x-auto [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-x-2 sm:gap-y-0.5 sm:overflow-visible lg:grid-cols-5 [&::-webkit-scrollbar]:hidden'
const ITEM_1 =
  'flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors sm:min-w-0'
const ITEM_2 =
  'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] whitespace-nowrap transition-colors sm:min-w-0 sm:whitespace-normal'

function Count({ n, on }: { n?: number; on?: boolean }) {
  if (!n) return null
  return <span className={cn('ml-auto shrink-0 pl-1 text-[11px] tabular-nums', on ? 'opacity-80' : 'text-muted-foreground')}>{n.toLocaleString()}</span>
}

type PillCategory = Pick<PlatformCategory, 'id' | 'name' | 'slug' | 'parent_id' | 'cate_no'> & { icon_image?: string | null }

/**
 * 카테고리 고르기 표 — [1차 카테고리] 줄과, 1차를 고르면 그 아래 [2차 카테고리] 줄.
 * 칸을 맞춰 바둑판으로 보여줘서 긴 이름도 한눈에 읽혀요. (휴대폰은 옆으로 밀어서 보기)
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
  categories: PillCategory[]
  activeSlug?: string
  /** 카테고리 id → 상품 수 (주면 이름 옆에 표시) */
  counts?: Record<string, number>
  query?: string
  lang?: Lang
  basePath?: string
}) {
  if (categories.length === 0) return null

  const ko = lang === 'ko'
  const ids = new Set(categories.map((c) => c.id))
  // 부모가 없거나(1차) 부모를 찾을 수 없는 카테고리는 1차로 취급
  const roots = categories.filter((c) => !c.parent_id || !ids.has(c.parent_id))
  const active = activeSlug ? categories.find((c) => categoryKey(c) === activeSlug) : undefined
  const activeRoot = active
    ? roots.find((r) => r.id === active.id) ?? roots.find((r) => r.id === active.parent_id)
    : undefined
  const subs = activeRoot ? categories.filter((c) => c.parent_id === activeRoot.id) : []
  const href = (c?: PillCategory) => productsHref(orgSlug, { category: c ? categoryKey(c) : undefined, query, basePath })
  const showIcons = roots.some((r) => 'icon_image' in r)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {/* 1차 카테고리 */}
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 items-center gap-1.5 bg-muted/60 px-4 py-2 text-xs font-bold text-foreground/80 sm:w-32 sm:flex-col sm:items-start sm:justify-center sm:gap-0.5 sm:py-3">
          {ko ? '1차 카테고리' : 'Category'}
          <span className="font-normal text-muted-foreground">{roots.length}개</span>
        </div>
        <div className={cn(ROW_1, 'min-w-0 flex-1 p-2.5 sm:p-3')}>
          <Link
            href={href()}
            className={cn(ITEM_1, !activeSlug ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border hover:border-primary/50 hover:bg-primary/5')}
          >
            {showIcons ? <CategoryIcon slug="all" className={cn('size-6 shrink-0 shadow-none', !activeSlug && 'from-white/90 to-white/70')} /> : null}
            <span className="truncate">{t('all_products', lang)}</span>
          </Link>
          {roots.map((c) => {
            const on = activeRoot?.id === c.id
            return (
              <Link
                key={c.id}
                href={href(c)}
                title={c.name}
                className={cn(ITEM_1, on ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border hover:border-primary/50 hover:bg-primary/5')}
              >
                {showIcons ? (
                  <CategoryIcon slug={c.slug} image={c.icon_image ? mediaUrl(c.icon_image) : null} className="size-6 shrink-0 shadow-none" />
                ) : null}
                <span className="truncate">{c.name}</span>
                <Count n={counts?.[c.id]} on={on} />
              </Link>
            )
          })}
        </div>
      </div>

      {/* 2차 카테고리 */}
      {activeRoot ? (
        <div className="flex flex-col border-t border-border sm:flex-row">
          <div className="flex shrink-0 items-center gap-1.5 bg-muted/60 px-4 py-2 text-xs font-bold text-foreground/80 sm:w-32 sm:flex-col sm:items-start sm:justify-center sm:gap-0.5 sm:py-3">
            {ko ? '2차 카테고리' : 'Subcategory'}
            <span className="font-normal text-muted-foreground">{subs.length}개</span>
          </div>
          {subs.length > 0 ? (
            <div className={cn(ROW_2, 'min-w-0 flex-1 p-2 sm:p-3')}>
              <Link
                href={href(activeRoot)}
                className={cn(ITEM_2, active?.id === activeRoot.id ? 'bg-primary/10 font-bold text-primary ring-1 ring-primary/30' : 'font-semibold hover:bg-muted')}
              >
                <span className="truncate">{ko ? `${activeRoot.name} 전체` : `All ${activeRoot.name}`}</span>
              </Link>
              {subs.map((c) => {
                const on = active?.id === c.id
                return (
                  <Link
                    key={c.id}
                    href={href(c)}
                    className={cn(ITEM_2, on ? 'bg-primary/10 font-bold text-primary ring-1 ring-primary/30' : 'text-foreground/80 hover:bg-muted hover:text-foreground')}
                  >
                    <span className={cn('hidden size-1 shrink-0 rounded-full sm:block', on ? 'bg-primary' : 'bg-muted-foreground/40')} />
                    <span className="leading-snug break-keep">{c.name.replaceAll('·', '·​')}</span>
                    <Count n={counts?.[c.id]} on={false} />
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="flex-1 p-3 text-sm text-muted-foreground">{ko ? '2차 카테고리가 없어요.' : 'No subcategories.'}</p>
          )}
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
