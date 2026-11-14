'use client'

// 배너 광고 슬라이드 — PC/모바일 이미지, 5초마다 자동 넘김, 노출·클릭 기록

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { LiveBanner } from '../live'
import { sendAdEvent } from '../track'


/**
 * track: 광고 배너(banner_ads)만 노출·클릭을 기록. 공급사 미니샵 배너는 false.
 * label: 왼쪽 위 "광고" 표시 여부.
 */
export function BannerCarousel({
  banners,
  className,
  track = true,
  label = true,
}: {
  banners: LiveBanner[]
  className?: string
  track?: boolean
  label?: boolean
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const seen = useRef(new Set<string>())
  const rootRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const count = banners.length

  // 화면에 보일 때만 노출로 셈
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const b = banners[index]
    if (!track || !visible || !b || seen.current.has(b.id)) return
    seen.current.add(b.id)
    sendAdEvent(b.id, 'impression')
  }, [index, visible, banners, track])

  useEffect(() => {
    if (count < 2 || paused) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000)
    return () => clearInterval(t)
  }, [count, paused])

  if (count === 0) return null
  const go = (i: number) => setIndex((i + count) % count)

  return (
    <div
      ref={rootRef}
      className={cn('group relative overflow-hidden rounded-lg border border-border bg-muted', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={label ? '광고 배너' : '배너'}
    >
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((b, i) => {
          const external = /^https?:\/\//i.test(b.link_url)
          const picture = (
            <picture>
              <source media="(max-width: 639px)" srcSet={b.image_mobile} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image_pc}
                alt={b.title}
                className="aspect-[15/8] w-full object-cover sm:aspect-[4/1]"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </picture>
          )
          if (!b.link_url) {
            return (
              <div key={b.id} className="w-full shrink-0" aria-hidden={i !== index}>
                {picture}
              </div>
            )
          }
          return (
            <a
              key={b.id}
              href={b.link_url}
              target={external ? '_blank' : undefined}
              rel={external ? (track ? 'noopener sponsored' : 'noopener') : track ? 'sponsored' : undefined}
              className="block w-full shrink-0"
              onClick={() => track && sendAdEvent(b.id, 'click')}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
            >
              {picture}
            </a>
          )
        })}
      </div>

      {label ? (
        <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
          광고
        </span>
      ) : null}

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white group-hover:block"
            aria-label="이전 배너"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white group-hover:block"
            aria-label="다음 배너"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => go(i)}
                className={cn('size-2 rounded-full', i === index ? 'bg-white' : 'bg-white/50')}
                aria-label={`${i + 1}번째 배너`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
