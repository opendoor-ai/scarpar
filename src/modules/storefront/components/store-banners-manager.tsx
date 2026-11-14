'use client'

// 미니샵 배너 목록 + 등록·수정 창

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { mediaUrl } from '@/lib/media-url'
import { toKstDate } from '@/modules/ads/schemas'

import { deleteStoreBannerAction, saveStoreBannerAction } from '../banner-actions'
import type { StoreBannerInput } from '../banner-schemas'

export interface StoreBannerRow {
  id: string
  title: string
  link_url: string | null
  image_pc: string
  image_mobile: string | null
  starts_at: string | null
  ends_at: string | null
  sort_order: number
  is_active: boolean
}

function statusOf(b: StoreBannerRow, nowIso: string) {
  if (!b.is_active) return { label: '멈춤', variant: 'secondary' as const }
  if (b.ends_at && b.ends_at <= nowIso) return { label: '종료', variant: 'outline' as const }
  if (b.starts_at && b.starts_at > nowIso) return { label: '예약', variant: 'warning' as const }
  return { label: '보이는 중', variant: 'success' as const }
}

const dot = (iso: string | null) => (iso ? toKstDate(iso).replaceAll('-', '.') : '')

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function StoreBannersManager({ banners, nowIso }: { banners: StoreBannerRow[]; nowIso: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<StoreBannerRow | 'new' | null>(null)
  const [pending, startTransition] = useTransition()

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteStoreBannerAction(id)
      if (!result.ok) return void toast.error(result.error)
      toast.success('배너를 삭제했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          배너 등록
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="등록된 배너가 없어요"
          description="배너를 등록하면 미니샵 첫 화면 맨 위에 크게 보여요. 신제품·할인·회사 소개 등에 써 보세요."
        />
      ) : (
        <div className="grid gap-3">
          {banners.map((b) => {
            const st = statusOf(b, nowIso)
            const period = b.starts_at || b.ends_at ? `${dot(b.starts_at) || '지금'} ~ ${dot(b.ends_at) || '계속'}` : '기간 제한 없음'
            return (
              <div key={b.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(b.image_pc)} alt="" className="aspect-[4/1] w-full rounded border object-cover sm:w-56" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{b.title}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    순서 {b.sort_order} · {period}
                  </span>
                  {b.link_url ? <span className="truncate text-xs text-muted-foreground">→ {b.link_url}</span> : null}
                </div>
                <div className="flex justify-end gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(b)}>
                    <Pencil className="size-4" />
                    수정
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button type="button" size="sm" variant="ghost" disabled={pending} aria-label="삭제">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title={`'${b.title}' 배너를 삭제할까요?`}
                    description="잠시 내리려면 수정에서 '보이기'를 끄세요."
                    confirmLabel="삭제"
                    destructive
                    onConfirm={() => remove(b.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing ? (
        <BannerDialog
          key={editing === 'new' ? 'new' : editing.id}
          banner={editing === 'new' ? null : editing}
          nextOrder={banners.length}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function BannerDialog({
  banner,
  nextOrder,
  onClose,
}: {
  banner: StoreBannerRow | null
  nextOrder: number
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<StoreBannerInput>(() => ({
    title: banner?.title ?? '',
    link_url: banner?.link_url ?? '',
    image_pc: banner?.image_pc ?? '',
    image_mobile: banner?.image_mobile ?? '',
    starts_on: banner?.starts_at ? toKstDate(banner.starts_at) : '',
    ends_on: banner?.ends_at ? toKstDate(banner.ends_at) : '',
    sort_order: banner?.sort_order ?? nextOrder,
    is_active: banner?.is_active ?? true,
  }))
  const set = <K extends keyof StoreBannerInput>(key: K, value: StoreBannerInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function submit() {
    startTransition(async () => {
      const result = await saveStoreBannerAction(banner?.id ?? null, form)
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
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 11월 신규 입고 기계" />
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
            <Field label="누르면 이동할 주소 (선택)" hint="예: 우리 상품 /s/우리주소/products/10001 · 비우면 누르지 않는 그림">
              <Input value={form.link_url} onChange={(e) => set('link_url', e.target.value)} />
            </Field>
          </div>
          <Field label="시작일 (선택)" hint="비우면 바로 보여요">
            <Input type="date" value={form.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
          </Field>
          <Field label="종료일 (선택)" hint="비우면 계속 보여요">
            <Input type="date" value={form.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
          </Field>
          <Field label="순서" hint="숫자가 작을수록 먼저 보여요">
            <Input type="number" min={0} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} />
          </Field>
          <Field label="보이기">
            <div className="flex h-9 items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              <span className="text-sm text-muted-foreground">{form.is_active ? '켜짐' : '꺼짐 (잠시 내림)'}</span>
            </div>
          </Field>
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
