'use client'

// 배너 한 장 편집 칸 — 이미지(PC·모바일·설명), 텍스트 1~10, 링크, 색상 1~4, HTML, 상품, 추가이미지, 노출기간, 계약 정보

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { MediaPicker } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { searchProductsForBannerAction, type ProductPick } from '../banner-actions'
import { MAX_EXTRA_IMAGES, MAX_PRODUCTS, MAX_TEXTS, type BannerItem, type TextItem } from '../banner-types'
import { PAYMENT_LABEL, PAYMENT_STATUS } from '../schemas'

export type EditableBanner = BannerItem & { _key: string }

const selectClass =
  'h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring'

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-[72px_1fr] sm:items-start', className)}>
      <span className="pt-2 text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-9 shrink-0">{label}</span>
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className={cn('size-7 shrink-0 cursor-pointer rounded border border-input', !value && 'opacity-40')}
      />
      <input
        value={value}
        placeholder="#ffffff"
        onChange={(e) => onChange(e.target.value.trim())}
        className="h-7 w-20 rounded border border-input bg-transparent px-1.5 font-mono text-xs"
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-foreground" aria-label="색상 지우기">
          <X className="size-3" />
        </button>
      ) : null}
    </label>
  )
}

function TextRow({
  item,
  index,
  canAdd,
  onChange,
  onAdd,
  onRemove,
}: {
  item: TextItem
  index: number
  canAdd: boolean
  onChange: (t: TextItem) => void
  onAdd: () => void
  onRemove: () => void
}) {
  const num = (v: string) => (v === '' ? null : Math.max(6, Math.min(200, Number(v) || 0)))
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">텍스트{index + 1}</span>
      <Textarea
        rows={1}
        value={item.text}
        onChange={(e) => onChange({ ...item, text: e.target.value })}
        className="min-h-9 min-w-48 flex-1 resize-y py-1.5 text-sm"
        placeholder="내용을 입력해 주세요. (<b>굵게</b> 가능)"
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          title="PC 글자 크기(px)"
          placeholder="PC"
          value={item.pc_size ?? ''}
          onChange={(e) => onChange({ ...item, pc_size: num(e.target.value) })}
          className="h-9 w-12 rounded border border-input bg-transparent px-1 text-center text-xs"
        />
        <input
          type="number"
          title="모바일 글자 크기(px)"
          placeholder="M"
          value={item.m_size ?? ''}
          onChange={(e) => onChange({ ...item, m_size: num(e.target.value) })}
          className="h-9 w-12 rounded border border-input bg-transparent px-1 text-center text-xs"
        />
        <button
          type="button"
          title="굵게"
          onClick={() => onChange({ ...item, bold: !item.bold })}
          className={cn('h-9 w-8 rounded border text-sm font-bold', item.bold ? 'border-foreground bg-foreground text-background' : 'border-input')}
        >
          B
        </button>
        <input
          type="color"
          title="글자색"
          value={item.color && /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : '#000000'}
          onChange={(e) => onChange({ ...item, color: e.target.value })}
          className="h-9 w-8 cursor-pointer rounded border border-input"
        />
        {index === 0 ? (
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={onAdd} disabled={!canAdd}>
            <Plus className="size-3.5" />
            추가
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={onRemove}>
            <X className="size-3.5" />
            삭제
          </Button>
        )}
      </div>
    </div>
  )
}

function ProductSearchDialog({
  open,
  onOpenChange,
  selected,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selected: string[]
  onPick: (p: ProductPick) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ProductPick[]>([])
  const [loading, setLoading] = useState(false)

  async function search() {
    setLoading(true)
    const res = await searchProductsForBannerAction(q)
    setLoading(false)
    if (!res.ok) return void toast.error(res.error)
    setResults(res.data ?? [])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>상품 검색</DialogTitle>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void search()
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명 또는 상품번호(10001)" autoFocus />
          <Button type="submit" disabled={loading}>
            <Search className="size-4" />
            검색
          </Button>
        </form>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{loading ? '찾는 중…' : '검색해 보세요. 비우고 검색하면 최신 상품이 나와요.'}</p>
          ) : (
            results.map((p) => {
              const already = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={already}
                  onClick={() => onPick(p)}
                  className="flex items-center gap-3 rounded-md p-2 text-left hover:bg-accent disabled:opacity-50"
                >
                  <span className="size-10 shrink-0 overflow-hidden rounded bg-muted">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="size-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      P{p.product_no} · {p.org_name}
                    </span>
                  </span>
                  <span className="text-xs text-primary">{already ? '추가됨' : '추가'}</span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function BannerEditor({
  item,
  index,
  total,
  picks,
  stats,
  orgs,
  categories,
  showCategory,
  showTargeting = false,
  dragging,
  onChange,
  onDuplicate,
  onRemove,
  onMove,
  onPickProduct,
  onHandleDown,
}: {
  item: EditableBanner
  index: number
  total: number
  picks: Record<string, ProductPick>
  stats?: { impressions: number; clicks: number }
  orgs: { id: string; name: string }[]
  categories: { id: string; label: string }[]
  showCategory: boolean
  /** 분류·검색 허브: 노출 분류 번호·검색 칸 보이기 */
  showTargeting?: boolean
  dragging: boolean
  onChange: (b: EditableBanner) => void
  onDuplicate: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onPickProduct: (p: ProductPick) => void
  onHandleDown: () => void
}) {
  const [openExtra, setOpenExtra] = useState(item.extra_images.some(Boolean))
  const [openDeal, setOpenDeal] = useState(Boolean(item.advertiser_org_id || item.advertiser_name || item.price_won))
  const [searchOpen, setSearchOpen] = useState(false)
  const set = <K extends keyof EditableBanner>(k: K, v: EditableBanner[K]) => onChange({ ...item, [k]: v })
  const texts = item.texts.length > 0 ? item.texts : [{ text: '' }]

  return (
    <div className={cn('rounded-xl border border-border bg-card', dragging && 'opacity-40', !item.is_active && 'bg-muted/40')}>
      <div className="grid gap-4 p-4 lg:grid-cols-[28px_120px_1fr_110px]">
        {/* 순서 */}
        <div className="flex items-center gap-1 lg:flex-col lg:justify-center">
          <button
            type="button"
            onMouseDown={onHandleDown}
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label="끌어서 순서 바꾸기"
            title="끌어서 순서 바꾸기"
          >
            <GripVertical className="size-5" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="text-muted-foreground disabled:opacity-30" aria-label="위로">
            <ChevronUp className="size-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="text-muted-foreground disabled:opacity-30" aria-label="아래로">
            <ChevronDown className="size-4" />
          </button>
        </div>

        {/* 이미지 */}
        <div className="flex flex-row gap-3 lg:flex-col lg:items-center">
          <div className="flex flex-col items-center gap-1">
            <MediaPicker value={item.image_pc ? { id: '', path: item.image_pc } : null} onChange={(m) => set('image_pc', m?.path ?? '')} />
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">PC이미지</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MediaPicker
              value={item.image_mobile ? { id: '', path: item.image_mobile } : null}
              onChange={(m) => set('image_mobile', m?.path ?? '')}
            />
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">모바일이미지</span>
          </div>
          <Input
            value={item.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="이미지 설명"
            className="h-8 text-xs lg:w-full"
            title="이미지 설명(alt) · 관리용 이름"
          />
        </div>

        {/* 정보 */}
        <div className="flex min-w-0 flex-col gap-3">
          {texts.map((t, i) => (
            <TextRow
              key={i}
              item={t}
              index={i}
              canAdd={texts.length < MAX_TEXTS}
              onChange={(nt) => set('texts', texts.map((x, j) => (j === i ? nt : x)))}
              onAdd={() => set('texts', [...texts, { text: '' }])}
              onRemove={() => set('texts', texts.filter((_, j) => j !== i))}
            />
          ))}

          <Row label="링크">
            <div className="flex gap-2">
              <Input value={item.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder="클릭 시 이동할 주소 (/minishop/... 또는 https://...)" />
              <select className={selectClass} value={item.link_target} onChange={(e) => set('link_target', e.target.value as EditableBanner['link_target'])}>
                <option value="_self">현재창</option>
                <option value="_blank">새창</option>
              </select>
            </div>
          </Row>

          <div className="flex flex-wrap gap-x-4 gap-y-2 sm:pl-[80px]">
            {[0, 1, 2, 3].map((i) => (
              <ColorField
                key={i}
                label={`색상${i + 1}`}
                value={item.colors[i] ?? ''}
                onChange={(v) => {
                  const next = [...item.colors]
                  while (next.length < 4) next.push('')
                  next[i] = v
                  set('colors', next)
                }}
              />
            ))}
          </div>

          <Row label="HTML">
            <Textarea rows={2} value={item.html} onChange={(e) => set('html', e.target.value)} placeholder="HTML 소스를 입력해 주세요. (배너 코드의 {{html}} 자리에 들어가요)" className="font-mono text-xs" />
          </Row>

          <Row label="상품">
            <div className="flex flex-col gap-1.5">
              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input p-1.5">
                {item.product_ids.map((id) => {
                  const p = picks[id]
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-0.5 pr-1 pl-0.5 text-xs">
                      {p?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="size-6 rounded-full object-cover" />
                      ) : null}
                      <span className="max-w-40 truncate">{p ? `P${p.product_no} ${p.name}` : '불러오는 중…'}</span>
                      <button type="button" onClick={() => set('product_ids', item.product_ids.filter((x) => x !== id))} aria-label="빼기">
                        <X className="size-3" />
                      </button>
                    </span>
                  )
                })}
                <Button type="button" size="sm" variant="outline" className="h-7 rounded-full" onClick={() => setSearchOpen(true)} disabled={item.product_ids.length >= MAX_PRODUCTS}>
                  <Plus className="size-3.5" />
                  상품 검색
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">이미 등록된 상품은 중복으로 추가되지 않습니다. (최대 {MAX_PRODUCTS}개)</p>
            </div>
          </Row>

          <Row label="추가이미지">
            <div className="rounded-md bg-muted/40">
              <button type="button" onClick={() => setOpenExtra((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                {item.extra_images.filter(Boolean).length > 0 ? `추가이미지 ${item.extra_images.filter(Boolean).length}개` : '등록된 추가이미지 없음'}
                <span className="inline-flex items-center gap-0.5">
                  {openExtra ? '접기' : '펼치기'}
                  {openExtra ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </span>
              </button>
              {openExtra ? (
                <div className="flex flex-wrap gap-3 px-3 pb-3">
                  {Array.from({ length: MAX_EXTRA_IMAGES }, (_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <MediaPicker
                        value={item.extra_images[i] ? { id: '', path: item.extra_images[i] } : null}
                        onChange={(m) => {
                          const next = [...item.extra_images]
                          while (next.length < MAX_EXTRA_IMAGES) next.push('')
                          next[i] = m?.path ?? ''
                          set('extra_images', next)
                        }}
                      />
                      <span className="text-[11px] text-muted-foreground">추가 {i + 1}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Row>

          {showCategory ? (
            <Row label="카테고리">
              <select className={cn(selectClass, 'w-full')} value={item.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)}>
                <option value="">선택하세요 (1차를 고르면 그 아래 2차에도 보여요)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Row>
          ) : null}

          {showTargeting ? (
            <>
              <Row label="노출 분류">
                <div className="flex flex-col gap-1">
                  <Input
                    value={item.target_cate_nos}
                    onChange={(e) => set('target_cate_nos', e.target.value)}
                    placeholder="분류 번호를 쉼표로 (예: 0, 1, 11) — 상품분류 관리의 no.번호"
                  />
                  <p className="text-xs text-muted-foreground">적은 번호의 분류 페이지에서만 보여요. 0 = 전체 카테고리(전체 제품). 여러 분류는 쉼표로 나눠 적어요.</p>
                </div>
              </Row>
              <Row label="검색 결과">
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 pt-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={item.show_in_search}
                      onChange={(e) => set('show_in_search', e.target.checked)}
                    />
                    검색 결과에도 보이기
                  </label>
                  {item.show_in_search ? (
                    <Input
                      value={item.search_keywords}
                      onChange={(e) => set('search_keywords', e.target.value)}
                      placeholder="검색어를 쉼표로 (예: 머시닝센터, CNC선반) — 비우면 회사명·제목으로 찾아요"
                    />
                  ) : null}
                </div>
              </Row>
            </>
          ) : null}

          <Row label="노출기간">
            <div className="flex flex-wrap items-center gap-3 pt-1.5 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input type="radio" checked={item.always} onChange={() => set('always', true)} className="accent-primary" />
                항상 노출함
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="radio" checked={!item.always} onChange={() => set('always', false)} className="accent-primary" />
                노출 기간 설정
              </label>
              {!item.always ? (
                <span className="inline-flex items-center gap-1.5">
                  <Input type="date" className="h-8 w-36" value={item.starts_on} onChange={(e) => set('starts_on', e.target.value)} />~
                  <Input type="date" className="h-8 w-36" value={item.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
                </span>
              ) : null}
            </div>
          </Row>

          <div className="rounded-md border border-dashed border-border">
            <button type="button" onClick={() => setOpenDeal((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground">
              <span>
                광고 계약 정보 (선택) · {PAYMENT_LABEL[item.payment_status]}
                {item.price_won ? ` · ${item.price_won.toLocaleString('ko-KR')}원` : ''}
              </span>
              {openDeal ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {openDeal ? (
              <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
                <select className={selectClass} value={item.advertiser_org_id ?? ''} onChange={(e) => set('advertiser_org_id', e.target.value || null)}>
                  <option value="">광고주 공급사 (선택)</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Input value={item.advertiser_name} onChange={(e) => set('advertiser_name', e.target.value)} placeholder="광고주 이름 (공급사가 아닐 때)" className="h-9" />
                <select className={selectClass} value={item.payment_status} onChange={(e) => set('payment_status', e.target.value as EditableBanner['payment_status'])}>
                  {PAYMENT_STATUS.map((p) => (
                    <option key={p} value={p}>
                      {PAYMENT_LABEL[p]}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  value={item.price_won ?? ''}
                  onChange={(e) => set('price_won', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="계약 금액 (원)"
                  className="h-9"
                />
                <Textarea rows={2} value={item.memo} onChange={(e) => set('memo', e.target.value)} placeholder="메모 (관리자만 봐요)" className="sm:col-span-2" />
              </div>
            ) : null}
          </div>
        </div>

        {/* 사용여부 */}
        <div className="flex flex-row flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:justify-center">
          <label
            className={cn(
              'inline-flex cursor-pointer items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
              item.is_active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
            )}
          >
            {item.is_active ? '사용함' : '사용안함'}
            <Switch checked={item.is_active} onCheckedChange={(v) => set('is_active', v)} />
          </label>
          <Button type="button" size="sm" variant="outline" onClick={onDuplicate}>
            <Copy className="size-3.5" />
            복사
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onRemove}>
            <Trash2 className="size-3.5" />
            삭제
          </Button>
          {stats && item.id ? (
            <p className="text-center text-[11px] leading-tight text-muted-foreground">
              30일 노출 {stats.impressions.toLocaleString('ko-KR')}
              <br />
              클릭 {stats.clicks.toLocaleString('ko-KR')}
              {stats.impressions > 0 ? ` (${((stats.clicks / stats.impressions) * 100).toFixed(1)}%)` : ''}
            </p>
          ) : null}
        </div>
      </div>

      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        selected={item.product_ids}
        onPick={(p) => {
          if (item.product_ids.includes(p.id) || item.product_ids.length >= MAX_PRODUCTS) return
          onPickProduct(p)
          set('product_ids', [...item.product_ids, p.id])
        }}
      />
    </div>
  )
}
