'use client'

import { FileIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media-url'
import type { Media } from '@/types/db'

interface MediaGridProps {
  items: Media[]
  loading?: boolean
  selectedId?: string
  onSelect: (media: Media) => void
}

/** Shared thumbnail grid — used by MediaPicker's Library tab and the Media admin page. */
function MediaGrid({ items, loading, selectedId, onSelect }: MediaGridProps) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
        <p>아직 등록된 미디어가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {items.map((item) => {
        const isImage = item.mime?.startsWith('image/')
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            title={item.name ?? item.path}
            className={cn(
              'flex aspect-square flex-col items-center justify-center overflow-hidden rounded-md border bg-muted transition-colors hover:border-ring',
              selectedId === item.id && 'border-primary ring-1 ring-primary',
            )}
          >
            {isImage ? (
              <img src={mediaUrl(item.path)} alt={item.alt ?? ''} className="size-full object-cover" />
            ) : (
              <FileIcon className="size-6 text-muted-foreground" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export { MediaGrid }
