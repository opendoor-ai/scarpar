'use client'

// 모바일 하단 떠 있는 네비게이션 바 — 마이 · 최근본상품 · HOME(가운데 큰 버튼) · 검색 · 카테고리
// 최근본상품·검색·카테고리는 아래에서 올라오는 창으로 열려요. (PC 화면에서는 숨김)
// 위쪽 머리글의 메뉴 버튼도 'jadong:open-panel' 신호로 같은 창을 열어요.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Clock, Home, LayoutGrid, Search, Trash2, UserRound, X } from 'lucide-react'

import { CategoryIcon } from '@/components/platform/category-icon'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { clearRecent, readRecent, RECENT_EVENT, type RecentProduct } from '@/lib/recent-products'
import { cn } from '@/lib/utils'

export interface NavCategory {
  id: string
  slug: string
  name: string
  href: string
  iconImage: string | null
  children: { id: string; name: string; href: string }[]
}

type Panel = 'recent' | 'search' | 'category' | null
export const OPEN_PANEL_EVENT = 'jadong:open-panel'

export function MobileBottomNav({ categories, popular }: { categories: NavCategory[]; popular: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const [panel, setPanel] = useState<Panel>(null)
  const [recent, setRecent] = useState<RecentProduct[]>([])
  const [q, setQ] = useState('')
  const [openCat, setOpenCat] = useState<string | null>(null)

  useEffect(() => {
    const load = () => setRecent(readRecent())
    load()
    window.addEventListener(RECENT_EVENT, load)
    const open = (e: Event) => setPanel(((e as CustomEvent).detail as Panel) ?? 'category')
    window.addEventListener(OPEN_PANEL_EVENT, open)
    return () => {
      window.removeEventListener(RECENT_EVENT, load)
      window.removeEventListener(OPEN_PANEL_EVENT, open)
    }
  }, [])

  // 다른 화면으로 가면 창 닫기
  useEffect(() => setPanel(null), [pathname])

  function search(term: string) {
    const t = term.trim()
    if (!t) return
    setPanel(null)
    router.push(`/products?q=${encodeURIComponent(t)}`)
  }

  const item = 'flex flex-1 flex-col items-center gap-1 pt-2 pb-1 text-[11px] font-medium text-muted-foreground active:text-foreground'

  return (
    <>
      {/* 하단 바 */}
      <nav
        aria-label="모바일 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative mx-auto flex h-16 max-w-lg items-end rounded-t-3xl border-t border-border bg-background/95 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
          <Link href="/login" className={item}>
            <UserRound className="size-6" />
            마이
          </Link>
          <button type="button" onClick={() => setPanel('recent')} className={cn(item, panel === 'recent' && 'text-primary')}>
            <span className="relative">
              <Clock className="size-6" />
              {recent.length > 0 ? (
                <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-red-600 px-1 text-[9px] leading-4 font-bold text-white">
                  {recent.length > 9 ? '9+' : recent.length}
                </span>
              ) : null}
            </span>
            최근본상품
          </button>
          {/* 가운데 HOME — 바 위로 솟은 큰 원 */}
          <div className="flex flex-1 justify-center">
            <Link
              href="/"
              aria-label="홈"
              className={cn(
                'absolute -top-7 flex size-[70px] flex-col items-center justify-center rounded-full border-4 border-background bg-primary text-[11px] font-bold text-primary-foreground shadow-lg',
                pathname === '/' && 'ring-2 ring-primary/30',
              )}
            >
              <Home className="size-6" />
              HOME
            </Link>
          </div>
          <button type="button" onClick={() => setPanel('search')} className={cn(item, panel === 'search' && 'text-primary')}>
            <Search className="size-6" />
            검색
          </button>
          <button type="button" onClick={() => setPanel('category')} className={cn(item, panel === 'category' && 'text-primary')}>
            <LayoutGrid className="size-6" />
            카테고리
          </button>
        </div>
      </nav>

      {/* 최근 본 상품 */}
      <Sheet open={panel === 'recent'} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side="bottom" className="max-h-[80dvh] gap-0 rounded-t-2xl p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
            <SheetTitle className="text-base">최근 본 상품</SheetTitle>
            <SheetDescription className="sr-only">이 기기에서 최근에 본 상품이에요</SheetDescription>
            {recent.length > 0 ? (
              <button type="button" onClick={clearRecent} className="ml-auto mr-8 flex items-center gap-1 text-xs text-muted-foreground">
                <Trash2 className="size-3.5" />
                모두 지우기
              </button>
            ) : null}
          </div>
          <div className="overflow-y-auto p-4">
            {recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">아직 본 상품이 없어요.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-3">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link href={p.href} onClick={() => setPanel(null)} className="flex flex-col gap-1">
                      <span className="aspect-square overflow-hidden rounded-lg bg-[#e9e9e9]">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="size-full object-contain" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-xs leading-snug">{p.name}</span>
                      <span className="text-xs font-bold text-red-600">{p.price}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 검색 */}
      <Sheet open={panel === 'search'} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side="top" className="gap-0 p-0">
          <SheetTitle className="sr-only">검색</SheetTitle>
          <SheetDescription className="sr-only">제품명·모델명·제조사·상품코드로 찾아요</SheetDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              search(q)
            }}
            className="flex items-center gap-2 border-b border-border p-3 pr-12"
            role="search"
          >
            <Search className="size-5 shrink-0 text-primary" />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제품명·모델명·제조사·상품코드"
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
              aria-label="제품 검색"
            />
            {q ? (
              <button type="button" onClick={() => setQ('')} aria-label="지우기" className="text-muted-foreground">
                <X className="size-4" />
              </button>
            ) : null}
          </form>
          {popular.length > 0 ? (
            <div className="p-4">
              <p className="mb-2 text-xs font-bold text-muted-foreground">인기 검색어</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((k, i) => (
                  <button key={k} type="button" onClick={() => search(k)} className="rounded-full border border-border px-3 py-1.5 text-sm">
                    <b className="mr-1 text-primary">{i + 1}</b>
                    {k}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* 카테고리 */}
      <Sheet open={panel === 'category'} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side="left" className="w-[86vw] max-w-sm gap-0 p-0">
          <div className="border-b border-border px-4 py-3.5">
            <SheetTitle className="text-base">전체 카테고리</SheetTitle>
            <SheetDescription className="sr-only">기계 카테고리를 골라요</SheetDescription>
          </div>
          <div className="overflow-y-auto">
            <Link href="/products" onClick={() => setPanel(null)} className="flex items-center gap-3 border-b border-border px-4 py-3 font-semibold">
              전체 제품 보기
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
            {categories.map((c) => (
              <div key={c.id} className="border-b border-border">
                <div className="flex items-center">
                  <Link href={c.href} onClick={() => setPanel(null)} className="flex flex-1 items-center gap-3 px-4 py-3 text-sm font-medium">
                    <CategoryIcon slug={c.slug} image={c.iconImage} className="size-10 shrink-0" />
                    {c.name}
                  </Link>
                  {c.children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOpenCat(openCat === c.id ? null : c.id)}
                      className="px-4 py-3 text-muted-foreground"
                      aria-label={`${c.name} 2차 카테고리 ${openCat === c.id ? '접기' : '펼치기'}`}
                    >
                      <ChevronRight className={cn('size-4 transition-transform', openCat === c.id && 'rotate-90')} />
                    </button>
                  ) : null}
                </div>
                {openCat === c.id ? (
                  <ul className="grid grid-cols-2 gap-x-2 bg-muted/40 px-4 py-2">
                    {c.children.map((ch) => (
                      <li key={ch.id}>
                        <Link href={ch.href} onClick={() => setPanel(null)} className="block truncate py-2 text-[13px] text-muted-foreground">
                          {ch.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** 위쪽 머리글에서 창 열기 (메뉴·검색 버튼) */
export function OpenPanelButton({ panel, label, children, className }: { panel: Exclude<Panel, null>; label: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-label={label} className={className} onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail: panel }))}>
      {children}
    </button>
  )
}
