'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { updateCustomerTags } from '../actions'

export function CustomerTagsEditor({ customerId, tags }: { customerId: string; tags: string[] }) {
  const [current, setCurrent] = React.useState<string[]>(tags)
  const [draft, setDraft] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function persist(next: string[]) {
    setSaving(true)
    const result = await updateCustomerTags(customerId, next)
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setCurrent(next)
  }

  function handleAdd() {
    const tag = draft.trim()
    if (!tag || current.includes(tag)) {
      setDraft('')
      return
    }
    setDraft('')
    void persist([...current, tag])
  }

  function handleRemove(tag: string) {
    void persist(current.filter((t) => t !== tag))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>태그</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {current.length === 0 ? <span className="text-muted-foreground text-xs">아직 태그가 없습니다.</span> : null}
          {current.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button type="button" onClick={() => handleRemove(tag)} disabled={saving} aria-label={`Remove ${tag}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
            placeholder="태그 추가..."
            disabled={saving}
            className="h-8"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={saving || !draft.trim()}>
            <Plus /> 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
