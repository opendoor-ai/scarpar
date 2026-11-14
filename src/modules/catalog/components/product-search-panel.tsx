'use client'

// 상품 목록 검색 조건 (카페24식 표) — 검색분류·상품분류·등록일·판매상태·상품상태

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ProductSearchValues {
  field: string
  q: string
  cate1: string
  cate2: string
  from: string
  to: string
  status: string
  cond: string
}

export interface CategoryLite {
  id: string
  name: string
  parentId: string | null
  sort: number
}

const EMPTY: ProductSearchValues = { field: 'all', q: '', cate1: '', cate2: '', from: '', to: '', status: 'all', cond: 'all' }

/** 오늘(한국 시간) YYYY-MM-DD */
function todayKst(offsetDays = 0, offsetMonths = 0, offsetYears = 0) {
  const now = new Date(Date.now() + 9 * 3600_000)
  now.setUTCFullYear(now.getUTCFullYear() - offsetYears)
  now.setUTCMonth(now.getUTCMonth() - offsetMonths)
  now.setUTCDate(now.getUTCDate() - offsetDays)
  return now.toISOString().slice(0, 10)
}

const QUICK: { label: string; from: () => string }[] = [
  { label: '오늘', from: () => todayKst(0) },
  { label: '3일', from: () => todayKst(2) },
  { label: '7일', from: () => todayKst(6) },
  { label: '1개월', from: () => todayKst(0, 1) },
  { label: '3개월', from: () => todayKst(0, 3) },
  { label: '1년', from: () => todayKst(0, 0, 1) },
]

export function buildProductsUrl(values: Record<string, string>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(values)) {
    if (!v) continue
    if ((k === 'field' || k === 'status' || k === 'cond') && v === 'all') continue
    if (k === 'sort' && v === 'display_desc') continue
    if (k === 'size' && v === '20') continue
    if (k === 'page' && v === '1') continue
    qs.set(k, v)
  }
  const s = qs.toString()
  return s ? `/admin/products?${s}` : '/admin/products'
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border-b border-border last:border-b-0 sm:flex-row">
      <div className="flex items-center bg-muted/60 px-4 py-2 text-sm font-medium sm:w-32 sm:shrink-0">{label}</div>
      <div className="flex flex-1 flex-wrap items-center gap-2 px-4 py-2.5">{children}</div>
    </div>
  )
}

function Radio({ name, value, current, label, onChange }: { name: string; value: string; current: string; label: string; onChange: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="size-3.5 accent-primary" />
      {label}
    </label>
  )
}

const selectCls = 'h-8 rounded-md border border-input bg-background px-2 text-sm'

export function ProductSearchPanel({
  values,
  categories,
  keep,
}: {
  values: ProductSearchValues
  categories: CategoryLite[]
  keep: { sort: string; size: string }
}) {
  const router = useRouter()
  const [v, setV] = useState<ProductSearchValues>(values)
  const set = (patch: Partial<ProductSearchValues>) => setV((prev) => ({ ...prev, ...patch }))

  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort)
  const subs = v.cate1 ? categories.filter((c) => c.parentId === v.cate1).sort((a, b) => a.sort - b.sort) : []
  const today = todayKst(0)
  const activeQuick = v.to === today ? QUICK.find((x) => x.from() === v.from)?.label : undefined

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    router.push(buildProductsUrl({ ...v, ...keep, page: '1' }))
  }

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-lg border border-border bg-card">
      <Row label="검색분류">
        <select value={v.field} onChange={(e) => set({ field: e.target.value })} className={selectCls} aria-label="검색 항목">
          <option value="all">전체</option>
          <option value="name">상품명</option>
          <option value="code">상품코드</option>
          <option value="model">모델명</option>
          <option value="brand">제조사</option>
        </select>
        <input
          value={v.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="검색어를 입력하세요"
          className="h-8 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
        />
      </Row>
      <Row label="상품분류">
        <select value={v.cate1} onChange={(e) => set({ cate1: e.target.value, cate2: '' })} className={selectCls} aria-label="1차 분류">
          <option value="">- 1차 분류 전체 -</option>
          {roots.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={v.cate2}
          onChange={(e) => set({ cate2: e.target.value })}
          className={selectCls}
          disabled={subs.length === 0}
          aria-label="2차 분류"
        >
          <option value="">- 2차 분류 전체 -</option>
          {subs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Row>
      <Row label="상품등록일">
        <div className="flex overflow-hidden rounded-md border border-input">
          {QUICK.map((x) => (
            <button
              key={x.label}
              type="button"
              onClick={() => set({ from: x.from(), to: today })}
              className={cn(
                'h-8 border-r border-input px-3 text-xs',
                activeQuick === x.label ? 'bg-foreground text-background' : 'bg-background hover:bg-muted',
              )}
            >
              {x.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => set({ from: '', to: '' })}
            className={cn('h-8 px-3 text-xs', !v.from && !v.to ? 'bg-foreground text-background' : 'bg-background hover:bg-muted')}
          >
            전체
          </button>
        </div>
        <input type="date" value={v.from} onChange={(e) => set({ from: e.target.value })} className={selectCls} aria-label="시작일" />
        <span className="text-muted-foreground">~</span>
        <input type="date" value={v.to} onChange={(e) => set({ to: e.target.value })} className={selectCls} aria-label="종료일" />
      </Row>
      <div className="grid sm:grid-cols-2">
        <div className="sm:border-r sm:border-border">
          <Row label="판매상태">
            {[
              ['all', '전체'],
              ['active', '판매중'],
              ['draft', '임시저장'],
              ['archived', '보관'],
              ['soldout', '품절'],
            ].map(([value, label]) => (
              <Radio key={value} name="status" value={value} current={v.status} label={label} onChange={(x) => set({ status: x })} />
            ))}
          </Row>
        </div>
        <Row label="상품상태">
          {[
            ['all', '전체'],
            ['new', '신품'],
            ['used', '중고'],
          ].map(([value, label]) => (
            <Radio key={value} name="cond" value={value} current={v.cond} label={label} onChange={(x) => set({ cond: x })} />
          ))}
        </Row>
      </div>
      <div className="flex justify-center gap-2 border-t border-border bg-muted/30 py-3">
        <Button type="submit" className="w-28">
          <Search className="size-4" />
          검색
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-28"
          onClick={() => {
            setV(EMPTY)
            router.push('/admin/products')
          }}
        >
          <RotateCcw className="size-4" />
          초기화
        </Button>
      </div>
    </form>
  )
}
