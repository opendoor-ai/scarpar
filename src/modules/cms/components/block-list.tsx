'use client'

import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { CmsBlock } from '@/types/db'
import { Button } from '@/components/ui/button'
import { BLOCK_LABELS, blockSummary } from './block-meta'

interface BlockListProps {
  blocks: CmsBlock[]
  selectedKey: string | null
  onSelect: (key: string) => void
  onMove: (key: string, direction: -1 | 1) => void
  onDuplicate: (key: string) => void
  onDelete: (key: string) => void
}

function BlockList({ blocks, selectedKey, onSelect, onMove, onDuplicate, onDelete }: BlockListProps) {
  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
아직 블록이 없습니다. 아래에서 추가하세요.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => (
        <div
          key={block._key}
          onClick={() => onSelect(block._key)}
          className={cn(
            'flex cursor-pointer flex-col gap-1.5 rounded-md border bg-card p-2.5 transition-colors',
            selectedKey === block._key ? 'border-primary' : 'hover:border-ring',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium">{BLOCK_LABELS[block._type]}</span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(block._key, -1)
                }}
              >
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={index === blocks.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(block._key, 1)
                }}
              >
                <ChevronDown className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(block._key)
                }}
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(block._key)
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <p className="truncate text-xs text-muted-foreground">{blockSummary(block)}</p>
        </div>
      ))}
    </div>
  )
}

export { BlockList }
