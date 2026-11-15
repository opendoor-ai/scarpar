'use client'

// PC 머리글 "전체 카테고리" 펼침 메뉴
// 왼쪽: 1차 분류(아이콘·제품 수) — 마우스를 올리면 오른쪽에 그 분류의 2차 분류를 "전부" 보여줘요 (더보기 없이)
// 위쪽: 분류 이름 찾기 — 글자를 치면 모든 분류에서 바로 걸러 보여줘요
// 오른쪽: [전체메뉴] 배너 / 아래: 바로가기
// 관리자 → 카테고리에서 추가·수정·삭제·순서 변경하면 자동으로 따라와요.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown, ChevronRight, Menu, MessageSquareText, Search, Store, X } from 'lucide-react'

import { CategoryIcon } from '@/components/platform/category-icon'
import { OPEN_PANEL_EVENT } from '@/components/platform/mobile-bottom-nav'
import { cn } from '@/lib/utils'

export interface MegaSub {
  id: string
  name: string
  href: string
  count: number
}
export interface MegaRoot extends MegaSub {
  slug: string
  icon: string | null
  children: MegaSub[]
}

/** 이름을 · 뒤에서 줄바꿈할 수 있게 */
const soft = (s: string) => s.replaceAll('·', '·​')
const norm = (s: string) => s.toLowerCase().replace(/[\s·.()/]/g, '')

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{soft(text)}</>
  const i = text.toLowerCase().indexOf(term.toLowerCase())
  if (i < 0) return <>{soft(text)}</>
  return (
    <>
      {soft(text.slice(0, i))}
      <mark className="rounded-sm bg-amber-200/80 px-0.5 text-foreground dark:bg-amber-500/40">{text.slice(i, i + term.length)}</mark>
      {soft(text.slice(i + term.length))}
    </>
  )
}

export function CategoryMegaMenu({ roots, banner }: { roots: MegaRoot[]; banner?: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(roots[0]?.id ?? '')
  const [term, setTerm] = useState('')
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const clear = (r: React.RefObject<ReturnType<typeof setTimeout> | null>) => {
    if (r.current) clearTimeout(r.current)
    r.current = null
  }
  const show = () => {
    clear(closeTimer)
    if (!open) openTimer.current = setTimeout(() => setOpen(true), 80)
  }
  const hide = () => {
    clear(openTimer)
    closeTimer.current = setTimeout(() => setOpen(false), 180)
  }

  // 다른 화면으로 가면 닫기 · Esc 로 닫기
  useEffect(() => {
    setOpen(false)
    setTerm('')
  }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const active = roots.find((r) => r.id === activeId) ?? roots[0]
  const q = term.trim()
  const nq = norm(q)

  // 찾기 결과: 1차 이름이 맞으면 하위 전부, 아니면 맞는 2차만
  const results = useMemo(() => {
    if (!nq) return []
    return roots
      .map((r) => {
        const rootHit = norm(r.name).includes(nq)
        const subs = rootHit ? r.children : r.children.filter((c) => norm(c.name).includes(nq))
        return { root: r, rootHit, subs }
      })
      .filter((x) => x.rootHit || x.subs.length > 0)
  }, [roots, nq])
  const resultCount = results.reduce((n, x) => n + x.subs.length, 0)

  const hoverRoot = (id: string) => {
    clear(hoverTimer)
    // 대각선으로 지나갈 때 엉뚱한 분류로 바뀌지 않게 아주 잠깐 기다려요
    hoverTimer.current = setTimeout(() => setActiveId(id), 70)
  }

  return (
    <div className="relative shrink-0" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        onClick={() => {
          // 휴대폰: 아래에서 올라오는 카테고리 창 열기
          if (window.matchMedia('(max-width: 767px)').matches) {
            window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail: 'category' }))
            return
          }
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-t-md px-3 font-semibold transition-colors',
          open ? 'bg-primary text-primary-foreground' : 'hover:text-primary',
        )}
      >
        <Menu className="size-4" />
        전체 카테고리
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="전체 카테고리"
          // 메뉴 안의 분류·바로가기를 누르면 바로 닫기 (같은 제품 화면 안에서 분류만 바뀔 때도)
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest('a')) {
              clear(openTimer)
              setOpen(false)
              setTerm('')
            }
          }}
          className="absolute top-full left-0 z-40 hidden w-[min(96vw,1152px)] overflow-hidden rounded-b-xl rounded-tr-xl border border-border bg-background shadow-2xl md:block"
        >
          <div className="flex">
            {/* 왼쪽: 1차 분류 */}
            <ul className="w-[300px] shrink-0 border-r border-border bg-muted/40 py-2" role="menu">
              {roots.map((r) => {
                const on = !q && r.id === active?.id
                const hits = q ? results.find((x) => x.root.id === r.id) : undefined
                return (
                  <li key={r.id} role="none">
                    <Link
                      role="menuitem"
                      href={r.href}
                      onMouseEnter={() => hoverRoot(r.id)}
                      onMouseLeave={() => clear(hoverTimer)}
                      onFocus={() => {
                        setActiveId(r.id)
                        setTerm('')
                      }}
                      className={cn(
                        'group relative flex items-center gap-2.5 py-1.5 pr-3 pl-4 text-[13px] transition-colors',
                        on ? 'bg-background font-semibold text-primary' : 'text-foreground/85 hover:bg-background/70',
                        q && !hits && 'opacity-35',
                      )}
                    >
                      {on ? <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-primary" /> : null}
                      <CategoryIcon slug={r.slug} image={r.icon} className="size-8 shrink-0 shadow-none" />
                      <span className="min-w-0 flex-1 truncate leading-tight" title={r.name}>{r.name}</span>
                      {q && hits ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          {hits.subs.length}
                        </span>
                      ) : r.count > 0 ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{r.count.toLocaleString()}</span>
                      ) : null}
                      <ChevronRight className={cn('size-3.5 shrink-0', on ? 'text-primary' : 'text-muted-foreground/60')} />
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* 가운데: 찾기 + 2차 분류 */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-3 border-b border-border px-6 py-3">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="카테고리 이름으로 바로 찾기 (예: 지게차, 레이저, 컴프레샤)"
                    aria-label="카테고리 이름으로 찾기"
                    className="h-10 w-full rounded-full border border-input bg-muted/40 pr-9 pl-9 text-sm outline-none focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
                  />
                  {term ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTerm('')
                        inputRef.current?.focus()
                      }}
                      aria-label="지우기"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </label>
                <span className="hidden text-xs text-muted-foreground lg:inline">
                  1차 {roots.length}개 · 2차 {roots.reduce((n, r) => n + r.children.length, 0)}개 카테고리
                </span>
              </div>

              <div className="max-h-[min(62vh,520px)] min-h-[360px] overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
                {q ? (
                  results.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
                      “{q}” 이름의 카테고리가 없어요.
                      <Link href={`/products?q=${encodeURIComponent(q)}`} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground">
                        “{q}” 제품으로 검색하기 <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      <p className="text-xs text-muted-foreground">
                        카테고리 {resultCount}개를 찾았어요 ·{' '}
                        <Link href={`/products?q=${encodeURIComponent(q)}`} className="font-semibold text-primary hover:underline">
                          “{q}” 제품 검색 결과 보기 →
                        </Link>
                      </p>
                      {results.map(({ root, subs }) => (
                        <section key={root.id}>
                          <Link href={root.href} className="mb-2 inline-flex items-center gap-2 text-sm font-bold hover:text-primary">
                            <CategoryIcon slug={root.slug} image={root.icon} className="size-6 shadow-none" />
                            <Highlight text={root.name} term={q} />
                          </Link>
                          <SubGrid subs={subs} term={q} />
                        </section>
                      ))}
                    </div>
                  )
                ) : active ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-end justify-between gap-4 border-b border-dashed border-border pb-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon slug={active.slug} image={active.icon} className="size-12 shadow-none" />
                        <div>
                          <h3 className="text-lg leading-tight font-bold">{active.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            2차 카테고리 {active.children.length}개
                            {active.count > 0 ? ` · 등록 제품 ${active.count.toLocaleString()}개` : ''}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={active.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {active.name} 전체 보기 <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                    {active.children.length > 0 ? (
                      <SubGrid subs={active.children} term="" />
                    ) : (
                      <p className="py-10 text-center text-sm text-muted-foreground">2차 카테고리가 없어요. 위 “전체 보기”로 제품을 확인하세요.</p>
                    )}
                  </div>
                ) : null}
              </div>

              {/* 아래: 바로가기 */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-6 py-2.5 text-xs">
                <Link href="/products" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold hover:bg-background hover:text-primary">
                  <Menu className="size-3.5" /> 전체 제품 보기
                </Link>
                <Link href="/requests" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold hover:bg-background hover:text-primary">
                  <MessageSquareText className="size-3.5" /> 원하는 기계가 없나요? 구매문의 남기기
                </Link>
                <Link href="/suppliers" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold hover:bg-background hover:text-primary">
                  <Store className="size-3.5" /> 공급사 미니샵
                </Link>
                <span className="ml-auto hidden text-muted-foreground 2xl:inline">숫자는 지금 등록된 제품 수예요</span>
              </div>
            </div>

            {/* 오른쪽: [전체메뉴] 배너 */}
            {banner ? <div className="hidden w-[230px] shrink-0 flex-col gap-3 border-l border-border p-4 xl:flex">{banner}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SubGrid({ subs, term }: { subs: MegaSub[]; term: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
      {subs.map((c) => (
        <li key={c.id}>
          <Link
            href={c.href}
            title={c.name}
            className="group flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground/80 transition-colors hover:bg-primary/5 hover:text-primary"
          >
            <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
              <Highlight text={c.name} term={term} />
            </span>
            {c.count > 0 ? (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary tabular-nums">{c.count}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
