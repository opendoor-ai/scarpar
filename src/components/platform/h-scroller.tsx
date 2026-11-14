'use client'

// 가로로 넘기는 칸 (좌우 화살표 + 손가락으로 밀기 + 선택: 자동 넘김)

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'

export function HScroller({
  children,
  className,
  autoPlayMs,
  label,
}: {
  children: React.ReactNode
  className?: string
  /** 자동 넘김 간격 (없으면 자동 넘김 없음) */
  autoPlayMs?: number
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(Boolean(autoPlayMs))
  const [hover, setHover] = useState(false)
  const [progress, setProgress] = useState(0)

  function scroll(dir: -1 | 1) {
    const el = ref.current
    if (!el) return
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!autoPlayMs || !playing || hover) return
    const t = setInterval(() => scroll(1), autoPlayMs)
    return () => clearInterval(t)
  }, [autoPlayMs, playing, hover])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth
      setProgress(max > 0 ? el.scrollLeft / max : 0)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
    >
      <div
        ref={ref}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-0.5 flex-1 overflow-hidden rounded bg-border">
          <div className="h-full bg-foreground transition-all" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => scroll(-1)} className="rounded p-1 hover:bg-accent" aria-label="이전">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => scroll(1)} className="rounded p-1 hover:bg-accent" aria-label="다음">
            <ChevronRight className="size-4" />
          </button>
          {autoPlayMs ? (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded p-1 hover:bg-accent"
              aria-label={playing ? '자동 넘김 멈춤' : '자동 넘김 시작'}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
