'use client'

import { Checkbox } from '@/components/ui/checkbox'

interface CategoryOption {
  id: string
  name: string
}

interface CategoriesPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
  categories: CategoryOption[]
}

export function CategoriesPicker({ value, onChange, categories }: CategoriesPickerProps) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  if (categories.length === 0) {
    return <p className="text-muted-foreground rounded-md border p-3 text-xs">아직 카테고리가 없습니다.</p>
  }

  return (
    <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-3">
      {categories.map((category) => (
        <label
          key={category.id}
          className="hover:bg-accent flex items-center gap-2 rounded px-1 py-1 text-sm"
        >
          <Checkbox checked={value.includes(category.id)} onCheckedChange={() => toggle(category.id)} />
          {category.name}
        </label>
      ))}
    </div>
  )
}
