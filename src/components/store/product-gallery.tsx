'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: string[]
  name: string
  /** 사진 왼쪽 위 배지 — 예: { label: '중고', className: 'bg-amber-500 text-white' } */
  badge?: { label: string; className: string } | null
}) {
  const [active, setActive] = useState(0)
  const hasImages = images.length > 0
  const src = hasImages ? images[Math.min(active, images.length - 1)] : null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
        {badge ? (
          <span
            className={cn('absolute top-3 left-3 z-10 rounded px-2.5 py-1 text-sm font-bold shadow', badge.className)}
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

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${i + 1}번째 사진 보기`}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-md border transition-colors',
                i === active ? 'border-primary' : 'border-border hover:border-foreground/30',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
