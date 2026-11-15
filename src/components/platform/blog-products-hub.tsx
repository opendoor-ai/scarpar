'use client'

// 메인 "인기 기계 블로그와 함께 찾는 제품" — 블로그 카드(흐린 배경·by 작성자·제목·썸네일) + 함께 보는 제품 3개
// 블로그가 한 개씩 옆으로 흘러가요 (자동 스크롤 · ‹ › 버튼 · 손가락으로 밀기).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

import { formatMoney, formatPrice } from '@/lib/money'
import { cn } from '@/lib/utils'

export interface BlogHubItem {
  id: string
  title: string
  url: string
  thumb: string | null
  author: string | null
  products: {
    id: string
    href: string
    name: string
    image: string | null
    price: number
    compareAt: number | null
    supplier: string
  }[]
}

export function BlogProductsHub({ items }: { items: BlogHubItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0) // 맨 왼쪽에 보이는 블로그 번호
  const [visible, setVisible] = useState(3) // 한 화면에 보이는 블로그 수 (PC 3 · 모바일 1)
  const [playing, setPlaying] = useState(true)
  const [hover, setHover] = useState(false)
  const lastStart = Math.max(0, items.length - visible)

  /** 블로그 한 칸 너비(간격 포함) */
  function step() {
    const el = trackRef.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return 0
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0
    return first.offsetWidth + gap
  }

  /** n번째 블로그가 맨 왼쪽에 오도록 한 칸씩 부드럽게 이동 (끝에서 다음 → 처음으로) */
  function go(n: number) {
    const el = trackRef.current
    if (!el) return
    const target = n > lastStart ? 0 : n < 0 ? lastStart : n
    el.scrollTo({ left: target * step(), behavior: 'smooth' })
  }

  // 지금 위치 · 화면 크기에 따라 보이는 개수 계산
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => {
      const w = step()
      if (w > 0) {
        setIndex(Math.round(el.scrollLeft / w))
        setVisible(Math.max(1, Math.round((el.clientWidth + 20) / w)))
      }
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // 자동 스크롤: 4초마다 블로그 한 개씩 (마우스를 올리거나 멈춤 버튼을 누르면 멈춤)
  useEffect(() => {
    if (!playing || hover || items.length <= visible) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => go(index + 1), 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, hover, index, visible, items.length])

  return (
    <div className="flex flex-col gap-6" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((b) => (
          <div key={b.id} className="flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card md:w-[calc((100%-2.5rem)/3)]">
            {/* 블로그 카드 */}
            <a
              href={b.url}
              target="_blank"
              rel="noopener"
              className="group relative flex h-40 items-center gap-4 overflow-hidden bg-neutral-700 p-6 text-white sm:h-44"
            >
              {b.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.thumb} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-2xl" />
              ) : null}
              <span className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/10" />
              <span className="relative flex min-w-0 flex-1 flex-col gap-2.5">
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  <span className="shrink-0 rounded-full bg-[#03c75a] px-2.5 py-0.5 font-bold">blog</span>
                  {b.author ? <span className="truncate text-white/80">by. {b.author}</span> : null}
                </span>
                <span className="line-clamp-3 text-[15px] leading-snug font-bold group-hover:underline sm:text-base">{b.title}</span>
              </span>
              {b.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.thumb} alt="" className="relative size-24 shrink-0 rounded-lg object-cover shadow-lg sm:size-28" loading="lazy" />
              ) : null}
            </a>

            {/* 함께 보는 제품 */}
            <ul className="flex flex-col divide-y divide-border px-4">
              {b.products.slice(0, 3).map((p) => {
                const off = p.compareAt && p.compareAt > p.price && p.price > 0 ? Math.round((1 - p.price / p.compareAt) * 100) : 0
                return (
                  <li key={p.id} className="py-3.5">
                    <Link href={p.href} className="group flex gap-3.5">
                      <span className="size-24 shrink-0 overflow-hidden rounded-lg bg-[#e9e9e9] sm:size-28">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="size-full object-contain transition-transform group-hover:scale-105" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1 pt-1">
                        <span className="line-clamp-2 text-sm leading-snug group-hover:underline">{p.name}</span>
                        {off > 0 ? <span className="text-xs text-muted-foreground line-through tabular-nums">{formatMoney(p.compareAt as number)}</span> : null}
                        <span className="flex items-baseline gap-1">
                          {off > 0 ? <b className="text-red-600 tabular-nums">{off}%</b> : null}
                          <b className={cn('text-lg tabular-nums', p.price > 0 ? '' : 'text-red-600')}>{formatPrice(p.price)}</b>
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{p.supplier}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {items.length > visible ? (
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="flex h-11 w-24 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
            aria-label="이전 블로그"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="flex items-center gap-2 text-sm tabular-nums">
            <b>{Math.min(index + 1, items.length)}</b>
            <span className="text-muted-foreground"> / {items.length}</span>
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={playing ? '자동 넘김 멈추기' : '자동 넘김 켜기'}
              title={playing ? '자동 넘김 멈추기' : '자동 넘김 켜기'}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          </span>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="flex h-11 w-24 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
            aria-label="다음 블로그"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
