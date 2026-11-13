'use client'

import { Plus, Trash2 } from 'lucide-react'

import type { TestimonialsBlock } from '@/types/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field } from './field'

interface TestimonialsFormProps {
  block: TestimonialsBlock
  onChange: (next: TestimonialsBlock) => void
}

function TestimonialsForm({ block, onChange }: TestimonialsFormProps) {
  const mode: 'reviews' | 'manual' = block.mode === 'reviews' ? 'reviews' : 'manual'
  const items = block.items ?? []

  function setMode(next: 'reviews' | 'manual') {
    if (next === 'reviews') {
      onChange({ ...block, mode: 'reviews' })
    } else {
      onChange({ _key: block._key, _type: 'testimonials', items })
    }
  }

  function updateItem(index: number, patch: Partial<{ name: string; quote: string }>) {
    onChange({ ...block, items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)) })
  }

  function addItem() {
    onChange({ ...block, items: [...items, { name: '', quote: '' }] })
  }

  function removeItem(index: number) {
    onChange({ ...block, items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="가져올 곳">
        <Select value={mode} onValueChange={(value) => setMode(value as 'reviews' | 'manual')}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reviews">게시된 상품 리뷰</SelectItem>
            <SelectItem value="manual">직접 입력한 후기</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {mode === 'manual' ? (
        <>
          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <Field label="이름">
                    <Input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} />
                  </Field>
                  <Field label="후기 내용">
                    <Textarea
                      rows={2}
                      value={item.quote}
                      onChange={(e) => updateItem(index, { quote: e.target.value })}
                    />
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
후기 추가
          </Button>
        </>
      ) : null}
    </div>
  )
}

export { TestimonialsForm }
