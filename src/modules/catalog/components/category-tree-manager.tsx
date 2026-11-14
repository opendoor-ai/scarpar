'use client'

// 상품분류 관리 (카페24 방식) — 왼쪽: 분류 나무(끌어서 이동·순서 저장), 오른쪽: 선택한 분류 상세 설정
// 1차(대분류) → 2차(소분류) 두 단계까지. 플랫폼 관리자만 수정할 수 있고, 공급사는 보기만 합니다.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  Minus,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { MediaPicker } from '@/components/admin/media-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PlatformCategory } from '@/lib/platform-categories'
import { cn } from '@/lib/utils'

import { deleteCategoryAction, saveCategoryAction, saveCategoryOrderAction } from '../category-actions'
import { PRODUCT_SORT_LABEL, PRODUCT_SORTS, type CategorySettingsInput } from '../category-settings'

export interface CategoryItem extends PlatformCategory {
  productCount: number
}

type Selection = { kind: 'edit'; id: string } | { kind: 'new'; parentId: string | null } | null

const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** 부모별로 정렬된 목록 → 순서 번호를 다시 매긴 저장용 배열 */
function toOrder(items: CategoryItem[]) {
  const roots = items.filter((c) => !c.parent_id)
  const out: { id: string; parent_id: string | null; sort_order: number }[] = []
  roots.forEach((r, i) => {
    out.push({ id: r.id, parent_id: null, sort_order: i + 1 })
    items
      .filter((c) => c.parent_id === r.id)
      .forEach((c, j) => out.push({ id: c.id, parent_id: r.id, sort_order: j + 1 }))
  })
  return out
}

function sortTree(items: CategoryItem[]): CategoryItem[] {
  const by = (a: CategoryItem, b: CategoryItem) => a.sort_order - b.sort_order
  const roots = items.filter((c) => !c.parent_id).sort(by)
  const ids = new Set(roots.map((r) => r.id))
  const orphans = items.filter((c) => c.parent_id && !ids.has(c.parent_id))
  return [
    ...roots.flatMap((r) => [r, ...items.filter((c) => c.parent_id === r.id).sort(by)]),
    ...orphans.map((o) => ({ ...o, parent_id: null })),
  ]
}

export function CategoryTreeManager({ initial, canEdit }: { initial: CategoryItem[]; canEdit: boolean }) {
  const router = useRouter()
  const [items, setItems] = useState<CategoryItem[]>(() => sortTree(initial))
  const [selection, setSelection] = useState<Selection>(() =>
    initial.length > 0 ? { kind: 'edit', id: sortTree(initial)[0].id } : null,
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [orderDirty, setOrderDirty] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; mode: 'before' | 'into' } | null>(null)
  const [saving, startSaving] = useTransition()

  const roots = items.filter((c) => !c.parent_id)
  const childrenOf = (id: string) => items.filter((c) => c.parent_id === id)
  const selected = selection?.kind === 'edit' ? (items.find((c) => c.id === selection.id) ?? null) : null
  const totalProducts = useMemo(() => items.reduce((n, c) => n + c.productCount, 0), [items])

  // ---------------------------------------------------------------- 이동 (끌어서 놓기 / 위·아래 버튼)

  function move(dragged: string, targetId: string, mode: 'before' | 'into') {
    if (dragged === targetId) return
    const d = items.find((c) => c.id === dragged)
    const t = items.find((c) => c.id === targetId)
    if (!d || !t) return
    const dHasChildren = items.some((c) => c.parent_id === d.id)
    const newParent = mode === 'into' ? t.id : t.parent_id
    if (newParent && dHasChildren) {
      toast.error('하위 분류가 있는 1차 분류는 다른 분류 아래로 옮길 수 없어요.')
      return
    }
    if (newParent === d.id) return

    // 끌어온 분류(1차면 하위 분류까지 함께)를 빼고 원하는 자리에 다시 넣기
    const block = [d, ...(dHasChildren ? items.filter((c) => c.parent_id === d.id) : [])]
    const rest = items.filter((c) => !block.includes(c))
    const moved = { ...d, parent_id: newParent }
    let insertAt: number
    if (mode === 'into') {
      const kids = rest.filter((c) => c.parent_id === t.id)
      const last = kids.length ? kids[kids.length - 1] : t
      insertAt = rest.indexOf(last) + 1
      setCollapsed((s) => {
        const next = new Set(s)
        next.delete(t.id)
        return next
      })
    } else {
      insertAt = rest.indexOf(t)
    }
    const next = [...rest.slice(0, insertAt), moved, ...block.slice(1), ...rest.slice(insertAt)]
    setItems(sortTree(next.map((c) => ({ ...c, sort_order: next.indexOf(c) }))))
    setOrderDirty(true)
  }

  function nudge(direction: -1 | 1) {
    if (!selected) return
    const siblings = items.filter((c) => c.parent_id === selected.parent_id)
    const i = siblings.findIndex((c) => c.id === selected.id)
    const target = siblings[i + direction]
    if (!target) return
    if (direction === -1) move(selected.id, target.id, 'before')
    else {
      const after = siblings[i + 2]
      if (after) move(selected.id, after.id, 'before')
      else {
        // 맨 뒤로: 대상 뒤에 놓기 = 대상을 내 앞으로
        move(target.id, selected.id, 'before')
      }
    }
  }

  function saveOrder() {
    startSaving(async () => {
      const result = await saveCategoryOrderAction(toOrder(items))
      if (!result.ok) return void toast.error(result.error)
      toast.success('분류 순서·위치를 저장했어요')
      setOrderDirty(false)
      router.refresh()
    })
  }

  // ---------------------------------------------------------------- 나무 한 줄

  // 컴포넌트가 아닌 함수로 그려야 끌기 도중 다시 그려져도 끌기가 끊기지 않아요
  function renderRow(c: CategoryItem, depth: 0 | 1) {
    const kids = depth === 0 ? childrenOf(c.id) : []
    const isOpen = !collapsed.has(c.id)
    const isSelected = selection?.kind === 'edit' && selection.id === c.id
    const hint = dropHint?.id === c.id ? dropHint.mode : null
    return (
      <div
        key={c.id}
        draggable={canEdit}
        onDragStart={(e) => {
          setDragId(c.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          setDragId(null)
          setDropHint(null)
        }}
        onDragOver={(e) => {
          if (!dragId || dragId === c.id) return
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          const lower = e.clientY - rect.top > rect.height / 2
          setDropHint({ id: c.id, mode: depth === 0 && lower ? 'into' : 'before' })
        }}
        onDragLeave={() => setDropHint((h) => (h?.id === c.id ? null : h))}
        onDrop={(e) => {
          e.preventDefault()
          if (dragId && dropHint) move(dragId, c.id, dropHint.mode)
          setDragId(null)
          setDropHint(null)
        }}
        className={cn(
          'group flex items-center gap-1 rounded-md border px-1.5 py-1 text-sm',
          isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-accent',
          hint === 'before' && 'border-t-2 border-t-primary',
          hint === 'into' && 'border-dashed border-primary bg-primary/5',
          dragId === c.id && 'opacity-40',
        )}
      >
        {depth === 0 ? (
          <button
            type="button"
            className="flex size-5 items-center justify-center text-muted-foreground"
            onClick={() =>
              setCollapsed((s) => {
                const next = new Set(s)
                if (next.has(c.id)) next.delete(c.id)
                else next.add(c.id)
                return next
              })
            }
            aria-label={isOpen ? '접기' : '펼치기'}
          >
            {kids.length > 0 ? isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : null}
          </button>
        ) : null}
        {canEdit ? <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground/60" /> : null}
        {depth === 0 ? (
          isOpen && kids.length > 0 ? (
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-500" />
          )
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => setSelection({ kind: 'edit', id: c.id })}
        >
          <span
            className={cn(
              'truncate',
              depth === 0 && 'font-medium',
              !c.is_visible && 'text-muted-foreground line-through',
            )}
          >
            {c.name}
          </span>
          {!c.is_visible ? <EyeOff className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          <span className="shrink-0 text-xs text-primary underline underline-offset-2 tabular-nums">
            {c.productCount}
          </span>
          {c.cate_no ? (
            <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">no.{c.cate_no}</span>
          ) : null}
        </button>
        {canEdit && depth === 0 ? (
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background focus:opacity-100"
            onClick={() => setSelection({ kind: 'new', parentId: c.id })}
            aria-label={`${c.name} 아래에 2차 분류 추가`}
            title="2차 분류 추가"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      {/* ---------------------------------------------------------- 왼쪽: 분류 나무 */}
      <div className="flex flex-col gap-2 self-start rounded-lg border border-border bg-card lg:sticky lg:top-20">
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelection({ kind: 'new', parentId: null })}
            >
              <Plus className="size-4" />
              대분류 추가
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => nudge(-1)}
              disabled={!selected}
              aria-label="위로"
              title="위로"
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => nudge(1)}
              disabled={!selected}
              aria-label="아래로"
              title="아래로"
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" size="sm" className="ml-auto" onClick={saveOrder} disabled={!orderDirty || saving}>
              <Save className="size-4" />
              {saving ? '저장 중…' : '분류 이동 저장'}
            </Button>
          </div>
        ) : null}

        <div className="flex items-center justify-between px-3 pt-1 text-xs text-muted-foreground">
          <span>
            1차 {roots.length}개 · 2차 {items.length - roots.length}개 · 상품 {totalProducts.toLocaleString('ko-KR')}개
          </span>
          {orderDirty ? <span className="font-medium text-amber-600">이동 저장 전</span> : null}
        </div>
        {canEdit ? (
          <p className="mx-2 rounded border border-dashed border-border px-2 py-1.5 text-center text-xs text-muted-foreground">
            끌어서 놓으면 순서를 바꿀 수 있어요. 1차 분류 아래쪽 절반에 놓으면 그 안으로 들어가요.
          </p>
        ) : null}

        <div className="flex max-h-[70vh] flex-col overflow-y-auto p-2">
          {/* 전체 카테고리 (맨 위 뿌리) */}
          <div className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-sm text-primary-foreground">
            <button
              type="button"
              className="flex size-5 items-center justify-center rounded-sm border border-primary-foreground/40"
              onClick={() =>
                setCollapsed((s) =>
                  s.size >= roots.length && roots.length > 0 ? new Set() : new Set(roots.map((r) => r.id)),
                )
              }
              aria-label="모두 접기·펼치기"
              title="모두 접기·펼치기"
            >
              {collapsed.size >= roots.length && roots.length > 0 ? (
                <Plus className="size-3" />
              ) : (
                <Minus className="size-3" />
              )}
            </button>
            <FolderTree className="size-4" />
            <span className="flex-1 font-semibold">전체 카테고리</span>
            <span className="text-xs tabular-nums opacity-90">{totalProducts.toLocaleString('ko-KR')}</span>
            {canEdit ? (
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded hover:bg-primary-foreground/15"
                onClick={() => setSelection({ kind: 'new', parentId: null })}
                aria-label="대분류 추가"
                title="대분류 추가"
              >
                <Plus className="size-4" />
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">분류가 없어요</div>
          ) : (
            <div className="ml-3 flex flex-col gap-0.5 border-l border-dashed border-border pt-1 pl-2">
              {roots.map((r) => (
                <div key={r.id} className="flex flex-col gap-0.5">
                  {renderRow(r, 0)}
                  {!collapsed.has(r.id) && childrenOf(r.id).length > 0 ? (
                    <div className="ml-4 flex flex-col gap-0.5 border-l border-dashed border-border pl-2">
                      {childrenOf(r.id).map((c) => renderRow(c, 1))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- 오른쪽: 상세 설정 */}
      <div>
        {selection === null ? (
          <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            왼쪽에서 분류를 고르세요.
          </div>
        ) : (
          <CategoryDetail
            key={selection.kind === 'edit' ? selection.id : `new-${selection.parentId ?? 'root'}`}
            category={selected}
            parentIdForNew={selection.kind === 'new' ? selection.parentId : null}
            items={items}
            canEdit={canEdit}
            onSaved={(id) => {
              setSelection({ kind: 'edit', id })
              router.refresh()
            }}
            onDeleted={() => {
              setSelection(null)
              router.refresh()
            }}
          />
        )}
      </div>
    </div>
  )
}

// ==================================================================== 상세 설정

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card">
      <h3 className="border-b border-border bg-muted/50 px-4 py-2.5 text-sm font-semibold">{title}</h3>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

function Row2({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-start">
      <Label className="pt-2 text-sm text-muted-foreground">{label}</Label>
      <div className="flex flex-col gap-1">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function Radio({
  name,
  checked,
  onChange,
  label,
}: {
  name: string
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-primary" />
      {label}
    </label>
  )
}

function CategoryDetail({
  category,
  parentIdForNew,
  items,
  canEdit,
  onSaved,
  onDeleted,
}: {
  category: CategoryItem | null
  parentIdForNew: string | null
  items: CategoryItem[]
  canEdit: boolean
  onSaved: (id: string) => void
  onDeleted: () => void
}) {
  const isNew = category === null
  const [pending, startTransition] = useTransition()
  const parentId = isNew ? parentIdForNew : category.parent_id
  const parent = parentId ? (items.find((c) => c.id === parentId) ?? null) : null
  const hasChildren = !isNew && items.some((c) => c.parent_id === category.id)

  const [form, setForm] = useState<CategorySettingsInput>(() => ({
    name: category?.name ?? '',
    parent_id: parentId,
    description: category?.description ?? '',
    is_visible: category?.is_visible ?? true,
    show_on_main: category?.show_on_main ?? true,
    top_image: category?.top_image ?? '',
    product_sort: category?.product_sort ?? 'latest',
    seo_title: category?.seo_title ?? '',
    seo_description: category?.seo_description ?? '',
    seo_keywords: category?.seo_keywords ?? '',
  }))
  const set = <K extends keyof CategorySettingsInput>(key: K, value: CategorySettingsInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const parentOptions = items.filter((c) => !c.parent_id && c.id !== category?.id)
  const formParent = form.parent_id ? items.find((c) => c.id === form.parent_id) : null
  const path = [formParent?.name, form.name || '(새 분류)'].filter(Boolean).join(' > ')
  const publicUrl = category ? `/products?cate_no=${category.cate_no || category.slug}` : null

  function submit() {
    startTransition(async () => {
      const result = await saveCategoryAction(category?.id ?? null, form)
      if (!result.ok) return void toast.error(result.error)
      toast.success(isNew ? '분류를 추가했어요' : '분류를 저장했어요')
      if (result.data) onSaved(result.data.id)
    })
  }

  function remove() {
    if (!category) return
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id)
      if (!result.ok) return void toast.error(result.error)
      toast.success('분류를 삭제했어요')
      onDeleted()
    })
  }

  const disabled = !canEdit

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{isNew ? (parent ? '2차 분류 추가' : '대분류 추가') : '분류 정보'}</h2>
          {!isNew ? <Badge variant="outline">{category.parent_id ? '2차 분류' : '1차 분류'}</Badge> : null}
        </div>
        {publicUrl ? (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            고객 화면 보기 <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>

      <Section title="분류 정보">
        <Row2 label="현재 분류">
          <span className="pt-2 text-sm">{path}</span>
        </Row2>
        {!isNew ? (
          <Row2 label="등록 상품">
            <span className="pt-2 text-sm">
              {category.productCount.toLocaleString('ko-KR')}개
              {category.parent_id ? '' : ' (이 분류에 직접 지정된 상품 수 — 2차 분류 상품은 따로 셉니다)'}
            </span>
          </Row2>
        ) : null}
        <Row2 label="분류명 *">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 공작기계·금속가공" />
        </Row2>
        <Row2 label="분류 번호" hint="분류를 만들면 자동으로 붙어요. 고객 화면 주소에 쓰여요.">
          <span className="pt-2 text-sm">
            {isNew ? (
              <span className="text-muted-foreground">추가하면 자동으로 생겨요</span>
            ) : (
              <>
                <span className="font-semibold tabular-nums">{category.cate_no || '—'}</span>
                {publicUrl ? (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 text-primary underline underline-offset-2"
                  >
                    {publicUrl}
                  </a>
                ) : null}
              </>
            )}
          </span>
        </Row2>
        <Row2
          label="상위 분류"
          hint={hasChildren ? '하위 분류가 있어서 1차 분류로만 둘 수 있어요.' : '비우면 1차(대분류)가 돼요.'}
        >
          <select
            className={selectClass}
            value={form.parent_id ?? ''}
            onChange={(e) => set('parent_id', e.target.value || null)}
            disabled={disabled || hasChildren}
          >
            <option value="">없음 (1차 분류)</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Row2>
        <Row2 label="분류 설명" hint="카테고리 페이지 제목 아래에 보여요.">
          <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Row2>
      </Section>

      <Section title="표시 설정">
        <Row2
          label="표시 상태"
          hint="표시안함으로 하면 고객 화면의 카테고리 목록에서 숨겨요 (1차를 숨기면 하위 분류도 함께)."
        >
          <div className="flex gap-4 pt-2">
            <Radio name="vis" checked={form.is_visible} onChange={() => set('is_visible', true)} label="표시함" />
            <Radio name="vis" checked={!form.is_visible} onChange={() => set('is_visible', false)} label="표시안함" />
          </div>
        </Row2>
        {!formParent ? (
          <Row2 label="메인 화면 표시" hint="전자동 메인 화면의 '기계 카테고리' 칸에 보일지 정해요.">
            <div className="flex gap-4 pt-2">
              <Radio
                name="main"
                checked={form.show_on_main}
                onChange={() => set('show_on_main', true)}
                label="표시함"
              />
              <Radio
                name="main"
                checked={!form.show_on_main}
                onChange={() => set('show_on_main', false)}
                label="표시안함"
              />
            </div>
          </Row2>
        ) : null}
        <Row2 label="상품 진열 순서" hint="광고(상단 노출) 상품은 이 순서와 상관없이 맨 위 칸에 따로 보여요.">
          <select
            className={selectClass}
            value={form.product_sort}
            onChange={(e) => set('product_sort', e.target.value as CategorySettingsInput['product_sort'])}
          >
            {PRODUCT_SORTS.map((s) => (
              <option key={s} value={s}>
                {PRODUCT_SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </Row2>
        <Row2 label="상단 이미지" hint="카테고리 페이지 맨 위에 넓게 보여요. 권장 1200×240 (선택)">
          <MediaPicker
            value={form.top_image ? { id: '', path: form.top_image } : null}
            onChange={(m) => set('top_image', m?.path ?? '')}
          />
        </Row2>
      </Section>

      <Section title="검색엔진 최적화 (SEO)">
        <Row2
          label="브라우저 제목 (Title)"
          hint={`비우면 "${form.name || '분류명'} 제품 · 사이트이름"으로 자동 작성돼요.`}
        >
          <Input value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} maxLength={120} />
        </Row2>
        <Row2 label="설명 (Description)" hint="네이버·구글 검색 결과에 보이는 설명이에요. 80~150자 권장.">
          <Textarea
            rows={3}
            value={form.seo_description}
            onChange={(e) => set('seo_description', e.target.value)}
            maxLength={300}
          />
          <span className="text-right text-xs text-muted-foreground">{form.seo_description.length}/300</span>
        </Row2>
        <Row2 label="키워드 (Keywords)" hint="쉼표(,)로 구분해서 입력하세요. 예: 머시닝센터, CNC선반, 중고공작기계">
          <Textarea
            rows={2}
            value={form.seo_keywords}
            onChange={(e) => set('seo_keywords', e.target.value)}
            maxLength={300}
          />
        </Row2>
      </Section>

      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!isNew ? (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" disabled={pending}>
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              }
              title={`'${category.name}' 분류를 삭제할까요?`}
              description={
                hasChildren
                  ? '하위 분류가 있어서 삭제할 수 없어요. 하위 분류를 먼저 삭제하거나 옮겨 주세요.'
                  : `이 분류의 상품 ${category.productCount}개는 "분류 미지정"이 됩니다. 되돌릴 수 없어요.`
              }
              confirmLabel="삭제"
              destructive
              onConfirm={remove}
            />
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending} className="min-w-28">
            {pending ? '저장 중…' : isNew ? '추가' : '저장'}
          </Button>
        </div>
      ) : (
        <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          상품분류는 모든 공급사가 함께 쓰는 공통 분류라서 전자동(플랫폼 관리자)이 관리해요. 필요한 분류가 있으면
          전자동에 요청해 주세요.
        </p>
      )}
    </fieldset>
  )
}
