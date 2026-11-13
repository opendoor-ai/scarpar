'use client'

import { Plus, Trash2 } from 'lucide-react'

import type { FaqBlock } from '@/types/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from './field'

interface FaqFormProps {
  block: FaqBlock
  onChange: (next: FaqBlock) => void
}

function FaqForm({ block, onChange }: FaqFormProps) {
  function updateItem(index: number, patch: Partial<{ q: string; a: string }>) {
    onChange({ ...block, items: block.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) })
  }

  function addItem() {
    onChange({ ...block, items: [...block.items, { q: '', a: '' }] })
  }

  function removeItem(index: number) {
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-4">
      {block.items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Field label="질문">
                <Input value={item.q} onChange={(e) => updateItem(index, { q: e.target.value })} />
              </Field>
              <Field label="답변">
                <Textarea rows={2} value={item.a} onChange={(e) => updateItem(index, { a: e.target.value })} />
              </Field>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem}>
        <Plus className="size-4" />
질문 추가
      </Button>
    </div>
  )
}

export { FaqForm }
