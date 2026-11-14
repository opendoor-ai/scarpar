'use client'

// 상품 카테고리 선택: 1차 → 2차 두 칸.
// 2차를 고르면 그 2차가, "1차 전체(2차 없음)"를 고르면 1차가 상품 카테고리로 저장됩니다.

import { useMemo } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { CategoryOption } from '../category-options'

const NONE = '__none__'

interface CategoryTwoLevelSelectProps {
  categories: CategoryOption[]
  value: string | null
  onChange: (value: string | null) => void
}

export function CategoryTwoLevelSelect({ categories, value, onChange }: CategoryTwoLevelSelectProps) {
  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories])
  const selected = value ? categories.find((c) => c.id === value) : undefined
  // 고른 카테고리가 2차면 그 부모가 1차, 1차면 자기 자신
  const rootId = selected ? (selected.parentId ?? selected.id) : null
  const subs = useMemo(
    () => (rootId ? categories.filter((c) => c.parentId === rootId) : []),
    [categories, rootId],
  )
  const subValue = selected?.parentId ? selected.id : NONE

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Select value={rootId ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger className="w-full" aria-label="1차 카테고리">
          <SelectValue placeholder="1차 카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>카테고리 없음</SelectItem>
          {roots.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={subValue}
        onValueChange={(v) => onChange(v === NONE ? rootId : v)}
        disabled={!rootId || subs.length === 0}
      >
        <SelectTrigger className="w-full" aria-label="2차 카테고리">
          <SelectValue placeholder="2차 카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{rootId && subs.length === 0 ? '2차 카테고리 없음' : '2차 선택 안 함'}</SelectItem>
          {subs.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
