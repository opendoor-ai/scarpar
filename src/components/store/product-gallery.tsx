'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

export function ProductGallery({
  images,
  name,
  badge,
  topBadges = [],
}: {
  images: string[]
  name: string
  /** 사진 왼쪽 아래 상태 배지 — 예: { label: '중고', className: 'bg-red-600 text-white' } */
  badge?: { label: string; className: string } | null
  /** 사진 왼쪽 위 아이콘 — 직접거래·급매 등 */
  topBadges?: { label: string; className: string }[]
}) {
  const [active, setActive] = useState(0)
  const hasImages = images.length > 0
  const src = hasImages ? images[Math.min(active, images.length - 1)] : null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-[#e9e9e9]">
        {topBadges.length > 0 ? (
          <span className="absolute top-0 left-0 z-10 flex flex-wrap gap-1">
            {topBadges.map((b, i) => (
              <span
                key={b.label}
                className={cn('px-3 py-1 text-sm font-bold italic shadow', i === 0 ? 'rounded-br-lg' : 'rounded-b-lg', b.className)}
              >
                {b.label}
              </span>
            ))}
          </span>
        ) : null}
        {badge ? (
          <span
            className={cn('absolute bottom-3 left-3 z-10 rounded px-2.5 py-1 text-sm font-bold shadow', badge.className)}
          >
            {badge.label}
          </span>
        ) : null}
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">이미지 없음</div>
        )}
      </div>

      {/* 작은 사진: 한 줄에 5개, 더 많으면 옆으로 밀어서 보기 */}
      {images.length > 1 ? (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${i + 1}번째 사진 보기`}
              className={cn(
                'aspect-square w-[calc((100%-2rem)/5)] shrink-0 snap-start overflow-hidden rounded-md border bg-[#e9e9e9] transition-colors',
                i === active ? 'border-primary' : 'border-border hover:border-foreground/30',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
