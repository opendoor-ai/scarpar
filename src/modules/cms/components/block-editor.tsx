'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { randomKey } from '@/lib/utils'
import type { CmsBlock } from '@/types/db'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BlockList } from './block-list'
import { BlockForm } from './block-form'
import { BLOCK_LABELS, BLOCK_TYPES, type CategoryOption, createBlock } from './block-meta'

interface BlockEditorProps {
  blocks: CmsBlock[]
  onChange: (blocks: CmsBlock[]) => void
  categories: CategoryOption[]
}

function BlockEditor({ blocks, onChange, categories }: BlockEditorProps) {
  const [selectedKey, setSelectedKey] = React.useState<string | null>(blocks[0]?._key ?? null)

  const selected = blocks.find((b) => b._key === selectedKey) ?? null

  function addBlock(type: CmsBlock['_type']) {
    const block = createBlock(type, randomKey(8))
    onChange([...blocks, block])
    setSelectedKey(block._key)
  }

  function updateBlock(key: string, next: CmsBlock) {
    onChange(blocks.map((b) => (b._key === key ? next : b)))
  }

  function duplicateBlock(key: string) {
    const index = blocks.findIndex((b) => b._key === key)
    if (index === -1) return
    const copy = { ...blocks[index], _key: randomKey(8) } as CmsBlock
    const next = [...blocks]
    next.splice(index + 1, 0, copy)
    onChange(next)
    setSelectedKey(copy._key)
  }

  function deleteBlock(key: string) {
    onChange(blocks.filter((b) => b._key !== key))
    if (selectedKey === key) setSelectedKey(null)
  }

  function moveBlock(key: string, direction: -1 | 1) {
    const index = blocks.findIndex((b) => b._key === key)
    const target = index + direction
    if (index === -1 || target < 0 || target >= blocks.length) return
    const next = [...blocks]
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    onChange(next)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-3">
        <BlockList
          blocks={blocks}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          onMove={moveBlock}
          onDuplicate={duplicateBlock}
          onDelete={deleteBlock}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <Plus className="size-4" />
블록 추가
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {BLOCK_TYPES.map((type) => (
              <DropdownMenuItem key={type} onSelect={() => addBlock(type)}>
                {BLOCK_LABELS[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card p-4">
        {selected ? (
          <BlockForm
            key={selected._key}
            block={selected}
            categories={categories}
            onChange={(next) => updateBlock(selected._key, next)}
          />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
수정할 블록을 고르거나 새 블록을 추가하세요.
          </div>
        )}
      </div>
    </div>
  )
}

export { BlockEditor }
