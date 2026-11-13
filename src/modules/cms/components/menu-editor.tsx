'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

import { saveMenuAction } from '@/modules/cms/actions'
import type { MenuHandle, MenuItem } from '@/types/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface MenuEditorProps {
  header: MenuItem[]
  footer: MenuItem[]
  linkSuggestions: string[]
}

function MenuEditor({ header, footer, linkSuggestions }: MenuEditorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <datalist id="cms-link-suggestions">
        {linkSuggestions.map((href) => (
          <option key={href} value={href} />
        ))}
      </datalist>
      <MenuCard handle="header" title="상단 메뉴" initialItems={header} allowChildren />
      <MenuCard handle="footer" title="하단 메뉴" initialItems={footer} allowChildren={false} />
    </div>
  )
}

interface MenuCardProps {
  handle: MenuHandle
  title: string
  initialItems: MenuItem[]
  allowChildren: boolean
}

function MenuCard({ handle, title, initialItems, allowChildren }: MenuCardProps) {
  const [items, setItems] = React.useState<MenuItem[]>(initialItems)
  const [saving, setSaving] = React.useState(false)

  function updateItem(index: number, patch: Partial<MenuItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItems((prev) => [...prev, { label: '', href: '' }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next
    })
  }

  function addChild(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, children: [...(item.children ?? []), { label: '', href: '' }] } : item,
      ),
    )
  }

  function updateChild(index: number, childIndex: number, patch: Partial<MenuItem>) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              children: (item.children ?? []).map((child, ci) => (ci === childIndex ? { ...child, ...patch } : child)),
            }
          : item,
      ),
    )
  }

  function removeChild(index: number, childIndex: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, children: (item.children ?? []).filter((_, ci) => ci !== childIndex) } : item,
      ),
    )
  }

  async function handleSave() {
    setSaving(true)
    const result = await saveMenuAction({ handle, items })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${title}가 저장되었습니다.`)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
          {saving ? '저장 중...' : '저장'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">아직 메뉴 항목이 없습니다.</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-md border p-2.5">
              <div className="flex items-center gap-1.5">
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                  placeholder="메뉴 이름"
                  className="flex-1"
                />
                <Input
                  value={item.href}
                  onChange={(e) => updateItem(index, { href: e.target.value })}
                  placeholder="/products"
                  list="cms-link-suggestions"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveItem(index, -1)}>
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {allowChildren ? (
                <div className="ml-4 flex flex-col gap-1.5 border-l pl-3">
                  {(item.children ?? []).map((child, childIndex) => (
                    <div key={childIndex} className="flex items-center gap-1.5">
                      <Input
                        value={child.label}
                        onChange={(e) => updateChild(index, childIndex, { label: e.target.value })}
                        placeholder="메뉴 이름"
                        className="h-7 flex-1 text-xs"
                      />
                      <Input
                        value={child.href}
                        onChange={(e) => updateChild(index, childIndex, { href: e.target.value })}
                        placeholder="/products"
                        list="cms-link-suggestions"
                        className="h-7 flex-1 text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => removeChild(index, childIndex)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => addChild(index)}>
                    <Plus className="size-3" />
하위 항목 추가
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
        <Button type="button" variant="outline" onClick={addItem}>
          <Plus className="size-4" />
항목 추가
        </Button>
      </CardContent>
    </Card>
  )
}

export { MenuEditor }
