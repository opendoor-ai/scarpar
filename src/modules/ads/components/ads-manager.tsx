'use client'

// 광고 관리 화면 — 배너 광고 / 유료 상단 노출 (목록 + 등록·수정 창)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, ImageIcon, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { MediaPicker } from '@/components/admin/media-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { cn } from '@/lib/utils'

import { deleteBannerAction, deletePromotionAction, saveBannerAction, savePromotionAction } from '../actions'
import {
  BANNER_PLACEMENT_INFO,
  BANNER_PLACEMENTS,
  PAYMENT_LABEL,
  PAYMENT_STATUS,
  PLACEMENT_LABEL,
  toKstDate,
  type BannerInput,
  type BannerPlacement,
  type PromotionInput,
} from '../schemas'

type Placement = 'main' | 'category'
type Payment = (typeof PAYMENT_STATUS)[number]

export interface BannerRow {
  id: string
  title: string
  advertiser_org_id: string | null
  advertiser_name: string | null
  link_url: string
  image_pc: string
  image_mobile: string | null
  placement: BannerPlacement
  category_id: string | null
  subtitle?: string | null
  phone?: string | null
  starts_at: string
  ends_at: string
  sort_order: number
  is_active: boolean
  payment_status: Payment
  price_won: number | null
  memo: string | null
  impressions: number
  clicks: number
}

export interface PromotionRow {
  id: string
  product_id: string
  org_id: string
  placement: Placement
  starts_at: string
  ends_at: string
  is_active: boolean
  payment_status: Payment
  price_won: number | null
  memo: string | null
  product: { name: string; product_no: number } | null
  org: { name: string; slug: string } | null
}

interface Option {
  id: string
  label: string
}

interface Props {
  banners: BannerRow[]
  promotions: PromotionRow[]
  orgs: { id: string; name: string }[]
  categories: Option[]
  nowIso: string
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const fmt = (v: number) => v.toLocaleString('ko-KR')
const won = (v: number | null) => (v == null ? '—' : `${fmt(Number(v))}원`)

function todayKst(nowIso: string) {
  return toKstDate(nowIso)
}
function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 진행 상태: 진행 중 / 예약 / 종료 / 멈춤 */
function statusOf(row: { is_active: boolean; starts_at: string; ends_at: string }, nowIso: string) {
  if (!row.is_active) return { label: '멈춤', variant: 'secondary' as const }
  if (row.ends_at <= nowIso) return { label: '종료', variant: 'outline' as const }
  if (row.starts_at > nowIso) return { label: '예약', variant: 'warning' as const }
  return { label: '진행 중', variant: 'success' as const }
}

function Period({ starts_at, ends_at }: { starts_at: string; ends_at: string }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      {toKstDate(starts_at).replaceAll('-', '.')} ~ {toKstDate(ends_at).replaceAll('-', '.')}
    </span>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function PromotionsTab({ promotions, nowIso }: { promotions: PromotionRow[]; nowIso: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<PromotionRow | 'new' | null>(null)
  const [pending, startTransition] = useTransition()

  function remove(id: string) {
    startTransition(async () => {
      const result = await deletePromotionAction(id)
      if (!result.ok) return void toast.error(result.error)
      toast.success('상단 노출을 삭제했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          선택한 상품을 전체 제품 첫 화면 또는 그 상품의 카테고리 페이지 맨 위 &lsquo;광고&rsquo; 칸에 보여줍니다.
        </p>
        <Button type="button" onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          상단 노출 등록
        </Button>
      </div>

      {promotions.length === 0 ? (
        <EmptyState icon={Megaphone} title="상단 노출 상품이 없어요" description="상품번호로 유료 상단 노출을 걸 수 있어요." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품</TableHead>
                <TableHead>공급사</TableHead>
                <TableHead>위치</TableHead>
                <TableHead>기간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>결제</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((p) => {
                const st = statusOf(p, nowIso)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-64">
                      {p.product && p.org ? (
                        <a
                          href={`/s/${p.org.slug}/products/${p.product.product_no}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 truncate hover:underline"
                        >
                          <span className="text-muted-foreground">P{p.product.product_no}</span>
                          <span className="truncate">{p.product.name}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      ) : (
                        '삭제된 상품'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{p.org?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{PLACEMENT_LABEL[p.placement]}</TableCell>
                    <TableCell className="text-sm">
                      <Period starts_at={p.starts_at} ends_at={p.ends_at} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{PAYMENT_LABEL[p.payment_status]}</div>
                      <div className="text-xs text-muted-foreground">{won(p.price_won)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label="수정">
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button type="button" size="icon" variant="ghost" disabled={pending} aria-label="삭제">
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title="이 상단 노출을 삭제할까요?"
                          description="잠시 내리려면 수정에서 '노출'을 끄세요."
                          confirmLabel="삭제"
                          destructive
                          onConfirm={() => remove(p.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {editing ? (
        <PromotionDialog
          key={editing === 'new' ? 'new' : editing.id}
          promotion={editing === 'new' ? null : editing}
          nowIso={nowIso}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function PromotionDialog({
  promotion,
  nowIso,
  onClose,
}: {
  promotion: PromotionRow | null
  nowIso: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const today = todayKst(nowIso)
  const [form, setForm] = useState<PromotionInput>(() => ({
    product_no: promotion?.product?.product_no ?? (undefined as unknown as number),
    placement: promotion?.placement ?? 'main',
    starts_on: promotion ? toKstDate(promotion.starts_at) : today,
    ends_on: promotion ? toKstDate(promotion.ends_at) : addDays(today, 6),
    is_active: promotion?.is_active ?? true,
    payment_status: promotion?.payment_status ?? 'unpaid',
    price_won: promotion?.price_won ?? null,
    memo: promotion?.memo ?? '',
  }))
  const set = <K extends keyof PromotionInput>(key: K, value: PromotionInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  function submit() {
    startTransition(async () => {
      const result = await savePromotionAction(promotion?.id ?? null, form)
      if (!result.ok) return void toast.error(result.error)
      toast.success(promotion ? '상단 노출을 수정했어요' : '상단 노출을 등록했어요')
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{promotion ? '상단 노출 수정' : '상단 노출 등록'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="상품번호" hint="상품 목록의 P10001 에서 숫자만">
            <div className="flex items-center">
              <span className="flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-2 text-sm">P</span>
              <Input
                type="number"
                className="rounded-l-none"
                value={Number.isFinite(form.product_no) ? form.product_no : ''}
                onChange={(e) => set('product_no', Number(e.target.value))}
                placeholder="10001"
              />
            </div>
          </Field>
          <Field label="노출 위치">
            <select
              className={selectClass}
              value={form.placement}
              onChange={(e) => set('placement', e.target.value as Placement)}
            >
              <option value="main">{PLACEMENT_LABEL.main}</option>
              <option value="category">{PLACEMENT_LABEL.category}</option>
            </select>
          </Field>
          <Field label="시작일">
            <Input type="date" value={form.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
          </Field>
          <Field label="종료일">
            <Input type="date" value={form.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
          </Field>
          <Field label="결제 상태">
            <select
              className={selectClass}
              value={form.payment_status}
              onChange={(e) => set('payment_status', e.target.value as Payment)}
            >
              {PAYMENT_STATUS.map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="계약 금액 (원)">
            <Input
              type="number"
              min={0}
              value={form.price_won ?? ''}
              onChange={(e) => set('price_won', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="노출">
            <div className="flex h-9 items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              <span className={cn('text-sm text-muted-foreground')}>{form.is_active ? '켜짐' : '꺼짐 (잠시 내림)'}</span>
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="메모 (관리자만 봐요)">
              <Textarea rows={2} value={form.memo ?? ''} onChange={(e) => set('memo', e.target.value)} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
