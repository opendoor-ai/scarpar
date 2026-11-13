'use client'

import { ArrowLeft, ArrowRight, X } from 'lucide-react'

import { MediaPicker } from '@/components/admin/media-picker'
import { mediaUrl } from '@/lib/media-url'

import type { ListingMedia } from '../schemas'

interface MediaGalleryProps {
  value: ListingMedia[]
  onChange: (value: ListingMedia[]) => void
}

function MediaGallery({ value, onChange }: MediaGalleryProps) {
  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function move(index: number, direction: 'left' | 'right') {
    const target = direction === 'left' ? index - 1 : index + 1
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((item, index) => (
        <div key={item.id} className="relative size-20 shrink-0 overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL */}
          <img src={mediaUrl(item.path)} alt="" className="size-full object-cover" />
          <div className="absolute inset-x-0 top-0 flex justify-end p-0.5">
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="사진 삭제"
              className="bg-background/80 text-foreground flex size-5 items-center justify-center rounded-md border"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 p-0.5">
            <button
              type="button"
              onClick={() => move(index, 'left')}
              disabled={index === 0}
              aria-label="왼쪽으로"
              className="bg-background/80 text-foreground flex size-5 items-center justify-center rounded-md border disabled:opacity-40"
            >
              <ArrowLeft className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 'right')}
              disabled={index === value.length - 1}
              aria-label="오른쪽으로"
              className="bg-background/80 text-foreground flex size-5 items-center justify-center rounded-md border disabled:opacity-40"
            >
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      ))}
      <MediaPicker value={null} onChange={(media) => media && onChange([...value, media])} label="사진 추가" />
    </div>
  )
}

export { MediaGallery }
