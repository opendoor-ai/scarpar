'use client'

// 쇼츠 영상 줄 — 썸네일을 누르면 그 자리에서 유튜브 영상이 소리와 함께 재생돼요.

import { useState } from 'react'
import { Play } from 'lucide-react'

import { HScroller } from './h-scroller'

export interface ShortItem {
  id: string
  title: string
  videoId: string
  thumb: string
}

export function ShortsRow({ items }: { items: ShortItem[] }) {
  const [playing, setPlaying] = useState<string | null>(null)
  return (
    <HScroller label="쇼츠 영상">
      {items.map((s) => (
        <div key={s.id} className="flex w-40 shrink-0 snap-start flex-col gap-2 sm:w-48">
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
            {playing === s.id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${s.videoId}?autoplay=1&playsinline=1`}
                title={s.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            ) : (
              <button type="button" onClick={() => setPlaying(s.id)} className="group absolute inset-0" aria-label={`${s.title} 재생`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumb} alt="" loading="lazy" className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white">
                    <Play className="size-6 fill-white" />
                  </span>
                </span>
              </button>
            )}
          </div>
          <p className="line-clamp-2 text-sm">{s.title}</p>
        </div>
      ))}
    </HScroller>
  )
}
