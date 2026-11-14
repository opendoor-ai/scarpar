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
import { PAYMENT_LABEL, PAYMENT_STATUS, PLACEMENT_LABEL, toKstDate, type BannerInput, type PromotionInput } from '../schemas'

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
  placement: Placement
  category_id: string | null
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

export function AdsManager({ banners, promotions, orgs, categories, nowIso }: Props) {
  return (
    <Tabs defaultValue="banners" className="gap-4">
      <TabsList>
        <TabsTrigger value="banners">배너 광고 ({banners.length})</TabsTrigger>
        <TabsTrigger value="promotions">상단 노출 ({promotions.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="banners">
        <BannersTab banners={banners} orgs={orgs} categories={categories} nowIso={nowIso} />
      </TabsContent>
      <TabsContent value="promotions">
        <PromotionsTab promotions={promotions} nowIso={nowIso} />
      </TabsContent>
    </Tabs>
  )
}

// ------------------------------------------------------------------ 배너

function BannersTab({
  banners,
  orgs,
  categories,
  nowIso,
}: {
  banners: BannerRow[]
  orgs: { id: string; name: string }[]
  categories: Option[]
  nowIso: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<BannerRow | 'new' | null>(null)
  const [pending, startTransition] = useTransition()
  const categoryName = new Map(categories.map((c) => [c.id, c.label]))
  const orgName = new Map(orgs.map((o) => [o.id, o.name]))

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteBannerAction(id)
      if (!result.ok) return void toast.error(result.error)
      toast.success('배너를 삭제했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          노출·클릭 수는 최근 30일 기준입니다. 클릭률 = 클릭 ÷ 노출.
        </p>
        <Button type="button" onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          배너 등록
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState icon={ImageIcon} title="등록된 배너가 없어요" description="'배너 등록'을 눌러 첫 배너 광고를 걸어 보세요." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>배너</TableHead>
                <TableHead>위치</TableHead>
                <TableHead>기간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>결제</TableHead>
                <TableHead className="text-right">노출</TableHead>
                <TableHead className="text-right">클릭</TableHead>
                <TableHead className="text-right">클릭률</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((b) => {
                const st = statusOf(b, nowIso)
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(b.image_pc)} alt="" className="h-10 w-24 rounded border object-cover" />
                        <div className="min-w-0">
                          <div className="max-w-48 truncate font-medium">{b.title}</div>
                          <div className="max-w-48 truncate text-xs text-muted-foreground">
                            {(b.advertiser_org_id && orgName.get(b.advertiser_org_id)) || b.advertiser_name || '광고주 미지정'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {PLACEMENT_LABEL[b.placement]}
                      {b.placement === 'category' && b.category_id ? (
                        <div className="text-xs text-muted-foreground">{categoryName.get(b.category_id) ?? '삭제된 카테고리'}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Period starts_at={b.starts_at} ends_at={b.ends_at} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{PAYMENT_LABEL[b.payment_status]}</div>
                      <div className="text-xs text-muted-foreground">{won(b.price_won)}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(b.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(b.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {b.impressions > 0 ? `${((b.clicks / b.impressions) * 100).toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(b)} aria-label="수정">
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button type="button" size="icon" variant="ghost" disabled={pending} aria-label="삭제">
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title={`'${b.title}' 배너를 삭제할까요?`}
                          description="삭제하면 노출·클릭 기록도 함께 지워집니다. 잠시 내리려면 수정에서 '노출'을 끄세요."
                          confirmLabel="삭제"
                          destructive
                          onConfirm={() => remove(b.id)}
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
        <BannerDialog
          key={editing === 'new' ? 'new' : editing.id}
          banner={editing === 'new' ? null : editing}
          orgs={orgs}
          categories={categories}
          nowIso={nowIso}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function BannerDialog({
  banner,
  orgs,
  categories,
  nowIso,
  onClose,
}: {
  banner: BannerRow | null
  orgs: { id: string; name: string }[]
  categories: Option[]
  nowIso: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const today = todayKst(nowIso)
  const [form, setForm] = useState<BannerInput>(() => ({
    title: banner?.title ?? '',
    advertiser_org_id: banner?.advertiser_org_id ?? null,
    advertiser_name: banner?.advertiser_name ?? '',
    link_url: banner?.link_url ?? '',
    image_pc: banner?.image_pc ?? '',
    image_mobile: banner?.image_mobile ?? '',
    placement: banner?.placement ?? 'main',
    category_id: banner?.category_id ?? null,
    starts_on: banner ? toKstDate(banner.starts_at) : today,
    ends_on: banner ? toKstDate(banner.ends_at) : addDays(today, 29),
    sort_order: banner?.sort_order ?? 0,
    is_active: banner?.is_active ?? true,
    payment_status: banner?.payment_status ?? 'unpaid',
    price_won: banner?.price_won ?? null,
    memo: banner?.memo ?? '',
  }))
  const set = <K extends keyof BannerInput>(key: K, value: BannerInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  function submit() {
    startTransition(async () => {
      const result = await saveBannerAction(banner?.id ?? null, form)
      if (!result.ok) return void toast.error(result.error)
      toast.success(banner ? '배너를 수정했어요' : '배너를 등록했어요')
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{banner ? '배너 수정' : '배너 등록'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="배너 이름" hint="관리용 이름이에요. 이미지 설명(대체 글자)으로도 쓰여요.">
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="예: OO기계 11월 할인전" />
            </Field>
          </div>
          <Field label="PC 이미지" hint="권장 크기 1200×300">
            <MediaPicker
              value={form.image_pc ? { id: '', path: form.image_pc } : null}
              onChange={(m) => set('image_pc', m?.path ?? '')}
            />
          </Field>
          <Field label="모바일 이미지 (선택)" hint="권장 크기 750×400 · 없으면 PC 이미지 사용">
            <MediaPicker
              value={form.image_mobile ? { id: '', path: form.image_mobile } : null}
              onChange={(m) => set('image_mobile', m?.path ?? '')}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="누르면 이동할 주소" hint="우리 사이트는 /s/공급사주소/products/10001 처럼, 외부는 https:// 로 시작">
              <Input value={form.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder="/s/jadong/products/10001" />
            </Field>
          </div>
          <Field label="광고주 (공급사)">
            <select
              className={selectClass}
              value={form.advertiser_org_id ?? ''}
              onChange={(e) => set('advertiser_org_id', e.target.value || null)}
            >
              <option value="">직접 입력 / 없음</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="광고주 이름 (공급사가 아닐 때)">
            <Input
              value={form.advertiser_name ?? ''}
              onChange={(e) => set('advertiser_name', e.target.value)}
              disabled={!!form.advertiser_org_id}
              placeholder="예: OO공구상사"
            />
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
          <Field label="카테고리" hint={form.placement === 'category' ? '1차 카테고리를 고르면 그 아래 2차 페이지에도 보여요' : undefined}>
            <select
              className={selectClass}
              value={form.category_id ?? ''}
              onChange={(e) => set('category_id', e.target.value || null)}
              disabled={form.placement !== 'category'}
            >
              <option value="">선택하세요</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="시작일">
            <Input type="date" value={form.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
          </Field>
          <Field label="종료일" hint="종료일 밤 11시 59분까지 노출돼요">
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
              placeholder="예: 300000"
            />
          </Field>
          <Field label="순서" hint="숫자가 작을수록 먼저 보여요">
            <Input type="number" min={0} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} />
          </Field>
          <Field label="노출">
            <div className="flex h-9 items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              <span className="text-sm text-muted-foreground">{form.is_active ? '켜짐' : '꺼짐 (잠시 내림)'}</span>
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

// ------------------------------------------------------------------ 상단 노출

function PromotionsTab({ promotions, nowIso }: { promotions: PromotionRow[]; nowIso: string }) {
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
