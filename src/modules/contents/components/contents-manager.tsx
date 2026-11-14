'use client'

// 콘텐츠 관리 — 쇼츠 영상 / 블로그 글 / 매거진 (탭별 목록 + 등록·수정 창)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { DetailHtmlEditor } from '@/modules/catalog/components/detail-html-editor'

import { deleteContentAction, saveContentAction } from '../actions'
import {
  CONTENT_KIND_LABEL,
  CONTENT_KINDS,
  youtubeId,
  youtubeThumb,
  type ContentInput,
  type ContentKind,
} from '../schemas'

export interface ContentRow {
  id: string
  kind: ContentKind
  title: string
  url: string | null
  thumbnail: string | null
  summary: string | null
  body_html: string | null
  is_published: boolean
  sort_order: number
  published_at: string
  product: { product_no: number; name: string } | null
}

const KIND_HELP: Record<ContentKind, string> = {
  short: '유튜브 쇼츠 주소만 넣으면 썸네일이 자동으로 나와요. 메인 화면 "SHORTS" 칸에 보여요.',
  blog: '네이버 블로그 등 기계 관련 글 주소와 함께 보여줄 제품을 연결해요. 메인 "인기 기계 블로그와 함께하는 제품" 칸에 보여요.',
  magazine: '우리 사이트에 직접 쓰는 글이에요. 메인 "MAGAZINE" 칸과 /magazine 페이지에 보여요.',
}

function thumbOf(c: Pick<ContentRow, 'kind' | 'url' | 'thumbnail'>): string | null {
  if (c.thumbnail) return mediaUrl(c.thumbnail)
  const id = c.kind === 'short' ? youtubeId(c.url) : null
  return id ? youtubeThumb(id) : null
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

export function ContentsManager({ rows }: { rows: ContentRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ kind: ContentKind; row: ContentRow | null } | null>(null)
  const [pending, startTransition] = useTransition()

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteContentAction(id)
      if (!result.ok) return void toast.error(result.error)
      toast.success('삭제했어요')
      router.refresh()
    })
  }

  return (
    <Tabs defaultValue="short" className="gap-4">
      <TabsList>
        {CONTENT_KINDS.map((k) => (
          <TabsTrigger key={k} value={k}>
            {CONTENT_KIND_LABEL[k]} ({rows.filter((r) => r.kind === k).length})
          </TabsTrigger>
        ))}
      </TabsList>

      {CONTENT_KINDS.map((kind) => {
        const list = rows.filter((r) => r.kind === kind)
        return (
          <TabsContent key={kind} value={kind} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{KIND_HELP[kind]}</p>
              <Button type="button" onClick={() => setEditing({ kind, row: null })}>
                <Plus className="size-4" />
                {CONTENT_KIND_LABEL[kind]} 등록
              </Button>
            </div>
            {list.length === 0 ? (
              <EmptyState icon={FileText} title={`등록된 ${CONTENT_KIND_LABEL[kind]}이 없어요`} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((c) => {
                  const thumb = thumbOf(c)
                  return (
                    <div key={c.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="size-20 shrink-0 overflow-hidden rounded bg-muted">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="size-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{c.title}</span>
                          {!c.is_published ? <Badge variant="secondary">숨김</Badge> : null}
                        </div>
                        {c.product ? (
                          <span className="truncate text-xs text-muted-foreground">
                            연결 제품: P{c.product.product_no} {c.product.name}
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">순서 {c.sort_order}</span>
                        <div className="mt-auto flex gap-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditing({ kind, row: c })}>
                            <Pencil className="size-3.5" />
                            수정
                          </Button>
                          {c.url ? (
                            <Button type="button" size="sm" variant="ghost" asChild>
                              <a href={c.url} target="_blank" rel="noreferrer" aria-label="원본 열기">
                                <ExternalLink className="size-3.5" />
                              </a>
                            </Button>
                          ) : null}
                          <ConfirmDialog
                            trigger={
                              <Button type="button" size="sm" variant="ghost" disabled={pending} aria-label="삭제">
                                <Trash2 className="size-3.5" />
                              </Button>
                            }
                            title={`'${c.title}'을(를) 삭제할까요?`}
                            description="잠시 내리려면 수정에서 '공개'를 끄세요."
                            confirmLabel="삭제"
                            destructive
                            onConfirm={() => remove(c.id)}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        )
      })}

      {editing ? (
        <ContentDialog
          key={editing.row?.id ?? `new-${editing.kind}`}
          kind={editing.kind}
          row={editing.row}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Tabs>
  )
}

function ContentDialog({ kind, row, onClose }: { kind: ContentKind; row: ContentRow | null; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<ContentInput>(() => ({
    kind,
    title: row?.title ?? '',
    url: row?.url ?? '',
    thumbnail: row?.thumbnail ?? '',
    summary: row?.summary ?? '',
    body_html: row?.body_html ?? '',
    product_no: row?.product?.product_no ?? null,
    is_published: row?.is_published ?? true,
    sort_order: row?.sort_order ?? 0,
  }))
  const set = <K extends keyof ContentInput>(key: K, value: ContentInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const preview = thumbOf({ kind, url: form.url, thumbnail: form.thumbnail })

  function submit() {
    startTransition(async () => {
      const result = await saveContentAction(row?.id ?? null, form)
      if (!result.ok) return void toast.error(result.error)
      toast.success(row ? '수정했어요' : '등록했어요')
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={kind === 'magazine' ? 'max-h-[92vh] overflow-y-auto sm:max-w-4xl' : 'sm:max-w-lg'}>
        <DialogHeader>
          <DialogTitle>
            {CONTENT_KIND_LABEL[kind]} {row ? '수정' : '등록'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="제목">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          {kind !== 'magazine' ? (
            <Field
              label={kind === 'short' ? '유튜브 쇼츠 주소' : '블로그 글 주소'}
              hint={kind === 'short' ? '예: https://youtube.com/shorts/abc123' : '예: https://blog.naver.com/...'}
            >
              <Input value={form.url} onChange={(e) => set('url', e.target.value)} />
            </Field>
          ) : null}
          <Field
            label={kind === 'short' ? '썸네일 (선택)' : '대표 이미지'}
            hint={kind === 'short' ? '비우면 유튜브 썸네일을 자동으로 써요.' : undefined}
          >
            <div className="flex items-start gap-3">
              <MediaPicker
                value={form.thumbnail ? { id: '', path: form.thumbnail } : null}
                onChange={(m) => set('thumbnail', m?.path ?? '')}
              />
              {preview && !form.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-24 rounded border object-cover" />
              ) : null}
            </div>
          </Field>
          <Field label="짧은 소개 (선택)">
            <Textarea rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          {kind !== 'short' ? (
            <Field label="함께 보여줄 제품 번호 (선택)" hint="상품 목록의 P10001 에서 숫자만">
              <Input
                type="number"
                value={form.product_no ?? ''}
                onChange={(e) => set('product_no', e.target.value === '' ? null : Number(e.target.value))}
              />
            </Field>
          ) : null}
          {kind === 'magazine' ? (
            <Field label="본문">
              <DetailHtmlEditor value={form.body_html} onChange={(v) => set('body_html', v)} />
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field label="순서" hint="작을수록 먼저">
              <Input type="number" min={0} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} />
            </Field>
            <Field label="공개">
              <div className="flex h-9 items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => set('is_published', v)} />
                <span className="text-sm text-muted-foreground">{form.is_published ? '공개' : '숨김'}</span>
              </div>
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
