'use client'

// 배너 관리 — 왼쪽: 배너 그룹 목록(종류별·끌어서 순서·켜고 끄기·수정/코드/복사/삭제), 오른쪽: 그룹의 배너 편집·저장·백업

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Code2,
  Copy,
  Download,
  GripVertical,
  History,
  ImageIcon,
  Pencil,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CopyButton } from '@/components/ui/copy-button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { cn } from '@/lib/utils'

import {
  deleteGroupAction,
  duplicateGroupAction,
  exportGroupAction,
  getProductPicksAction,
  importGroupAction,
  listSnapshotsAction,
  reorderGroupsAction,
  restoreSnapshotAction,
  saveGroupAction,
  saveGroupBannersAction,
  toggleGroupAction,
  type ProductPick,
} from '../banner-actions'
import {
  GROUP_KIND_LABEL,
  GROUP_KINDS,
  emptyBanner,
  type BannerGroupRow,
  type BannerItem,
  type GroupBackup,
  type GroupInput,
  type GroupKind,
} from '../banner-types'
import { SAMPLE_CODE, VARIABLE_GUIDE } from '../template-guide'
import { BannerEditor, type EditableBanner } from './banner-editor'

interface Props {
  groups: BannerGroupRow[]
  bannersByGroup: Record<string, BannerItem[]>
  stats: Record<string, { impressions: number; clicks: number }>
  orgs: { id: string; name: string }[]
  categories: { id: string; label: string }[]
}

const withKeys = (items: BannerItem[]): EditableBanner[] =>
  items.map((b, i) => ({ ...b, _key: b.id ?? `k-${i}-${Math.random().toString(36).slice(2, 7)}` }))

export function BannerManager({ groups: initialGroups, bannersByGroup, stats, orgs, categories }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [filter, setFilter] = useState<GroupKind | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(initialGroups[0]?.id ?? null)
  const [editingGroup, setEditingGroup] = useState<BannerGroupRow | 'new' | null>(null)
  const [codeGroup, setCodeGroup] = useState<BannerGroupRow | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => setGroups(initialGroups), [initialGroups])

  const visible = groups.filter((g) => filter === 'all' || g.kind === filter)
  const selected = groups.find((g) => g.id === selectedId) ?? null

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) return void toast.error(res.error ?? '실패했어요')
      toast.success(success)
      after?.()
      router.refresh()
    })
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return
    const next = [...groups]
    const from = next.findIndex((g) => g.id === dragId)
    const to = next.findIndex((g) => g.id === targetId)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setGroups(next)
    act(() => reorderGroupsAction(next.map((g) => g.id)), '그룹 순서를 저장했어요')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* ------------------------------------------------ 왼쪽: 배너 그룹 */}
      <aside className="flex flex-col gap-3 self-start rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">배너 그룹</h2>
          <span className="text-xs text-muted-foreground">{groups.length}개</span>
        </div>
        <Button type="button" onClick={() => setEditingGroup('new')} className="w-full">
          <PlusCircle className="size-4" />
          배너 그룹 추가
        </Button>
        <div className="flex flex-wrap gap-1">
          {(['all', ...GROUP_KINDS] as const).map((k) => {
            const count = k === 'all' ? groups.length : groups.filter((g) => g.kind === k).length
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium',
                  filter === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent',
                )}
              >
                {k === 'all' ? '전체' : GROUP_KIND_LABEL[k]} <span className="opacity-70">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
          {visible.map((g) => {
            const items = bannersByGroup[g.id] ?? []
            const thumbs = items.filter((b) => b.image_pc).slice(0, 3)
            const isSel = g.id === selectedId
            return (
              <div
                key={g.id}
                draggable
                onDragStart={() => setDragId(g.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(g.id)}
                className={cn(
                  'rounded-lg border p-2.5 transition-colors',
                  isSel ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-accent/50',
                  dragId === g.id && 'opacity-40',
                )}
              >
                <div className="flex items-start gap-1.5">
                  <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <button type="button" onClick={() => setSelectedId(g.id)} className={cn('min-w-0 flex-1 text-left text-sm font-semibold', !g.is_active && 'text-muted-foreground')}>
                    <span className="line-clamp-2">{g.name}</span>
                  </button>
                  <Switch
                    checked={g.is_active}
                    onCheckedChange={(v) => {
                      // 메인 슬라이드 A·B타입은 하나만 켤 수 있어요
                      const partner = v ? ({ main: 'main_b', main_b: 'main' } as Record<string, string>)[g.code] : undefined
                      setGroups((list) =>
                        list.map((x) =>
                          x.id === g.id ? { ...x, is_active: v } : partner && x.code === partner ? { ...x, is_active: false } : x,
                        ),
                      )
                      const partnerName = partner ? groups.find((x) => x.code === partner)?.name : undefined
                      act(
                        () => toggleGroupAction(g.id, v),
                        v
                          ? partnerName
                            ? `그룹을 켰어요. ${partnerName}은(는) 꺼졌어요`
                            : '그룹을 켰어요'
                          : '그룹을 껐어요',
                      )
                    }}
                    aria-label="그룹 켜기·끄기"
                  />
                </div>
                <button type="button" onClick={() => setSelectedId(g.id)} className="mt-1.5 flex items-center gap-1 pl-5">
                  <span className="relative flex -space-x-2">
                    {thumbs.length > 0 ? (
                      thumbs.map((b, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={mediaUrl(b.image_pc)} alt="" className="size-8 rounded-md border-2 border-card object-cover" />
                      ))
                    ) : (
                      <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </span>
                    )}
                    <span className="absolute -top-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {items.length}
                    </span>
                  </span>
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {GROUP_KIND_LABEL[g.kind]} · {g.code}
                  </span>
                </button>
                {isSel ? (
                  <div className="mt-2 grid grid-cols-4 gap-1 pl-5">
                    <GroupBtn icon={Pencil} label="수정" onClick={() => setEditingGroup(g)} />
                    <GroupBtn icon={Code2} label="코드" onClick={() => setCodeGroup(g)} />
                    <GroupBtn
                      icon={Copy}
                      label="복사"
                      onClick={() => act(() => duplicateGroupAction(g.id), '그룹을 복사했어요 (꺼진 상태)')}
                    />
                    <ConfirmDialog
                      trigger={
                        <span>
                          <GroupBtn icon={Trash2} label="삭제" danger disabled={g.is_builtin} />
                        </span>
                      }
                      title={`'${g.name}' 그룹을 삭제할까요?`}
                      description="그룹 안의 배너와 노출·클릭 기록도 함께 지워져요. 되돌릴 수 없어요."
                      confirmLabel="삭제"
                      destructive
                      onConfirm={() =>
                        act(() => deleteGroupAction(g.id), '그룹을 삭제했어요', () => setSelectedId(null))
                      }
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ------------------------------------------------ 오른쪽: 배너 편집 */}
      <section className="min-w-0">
        {selected ? (
          <GroupBanners
            key={`${selected.id}-${(bannersByGroup[selected.id] ?? []).map((b) => b.id).join(',')}`}
            group={selected}
            initial={bannersByGroup[selected.id] ?? []}
            stats={stats}
            orgs={orgs}
            categories={categories}
          />
        ) : (
          <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            왼쪽에서 배너 그룹을 고르세요.
          </div>
        )}
      </section>

      {editingGroup ? (
        <GroupDialog
          group={editingGroup === 'new' ? null : editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={(id) => {
            setEditingGroup(null)
            setSelectedId(id)
            router.refresh()
          }}
        />
      ) : null}
      {codeGroup ? <CodeDialog group={codeGroup} onClose={() => setCodeGroup(null)} /> : null}
    </div>
  )
}

function GroupBtn({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? '기본 그룹은 삭제할 수 없어요' : label}
      className={cn(
        'flex w-full flex-col items-center gap-0.5 rounded-md border border-border bg-background py-1 text-[10px] hover:bg-accent disabled:opacity-30',
        danger && 'text-destructive',
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

// ==================================================================== 그룹의 배너 목록

function GroupBanners({
  group,
  initial,
  stats,
  orgs,
  categories,
}: {
  group: BannerGroupRow
  initial: BannerItem[]
  stats: Props['stats']
  orgs: Props['orgs']
  categories: Props['categories']
}) {
  const router = useRouter()
  const [items, setItems] = useState<EditableBanner[]>(() => withKeys(initial))
  const [dirty, setDirty] = useState(false)
  const [query, setQuery] = useState('')
  const [picks, setPicks] = useState<Record<string, ProductPick>>({})
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [handleKey, setHandleKey] = useState<string | null>(null)
  const [backupOpen, setBackupOpen] = useState(false)
  const [saving, startSaving] = useTransition()

  // 연결 상품 이름·사진 불러오기
  useEffect(() => {
    const ids = [...new Set(initial.flatMap((b) => b.product_ids))]
    if (ids.length === 0) return
    void getProductPicksAction(ids).then((res) => {
      if (res.ok && res.data) setPicks(Object.fromEntries(res.data.map((p) => [p.id, p])))
    })
  }, [initial])

  // 저장 안 하고 떠나려 하면 확인
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const update = (next: EditableBanner[]) => {
    setItems(next)
    setDirty(true)
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((b) =>
      [b.title, b.link_url, ...b.texts.map((t) => t.text)].some((v) => v.toLowerCase().includes(q)),
    )
  }, [items, query])

  function move(key: string, dir: -1 | 1) {
    const i = items.findIndex((b) => b._key === key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    update(next)
  }

  function dropOn(key: string) {
    if (!dragKey || dragKey === key) return
    const next = [...items]
    const from = next.findIndex((b) => b._key === dragKey)
    const to = next.findIndex((b) => b._key === key)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    update(next)
  }

  function save() {
    startSaving(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload: BannerItem[] = items.map(({ _key, ...b }) => b)
      const res = await saveGroupBannersAction(group.id, payload)
      if (!res.ok) return void toast.error(res.error)
      toast.success('배너를 저장했어요')
      setDirty(false)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="text-lg font-bold">{group.name}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setBackupOpen(true)}>
            <History className="size-4" />
            백업·복구
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const b = { ...emptyBanner(items.length), _key: `new-${Date.now()}` }
              update([...items, b])
              setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50)
            }}
          >
            <PlusCircle className="size-4" />
            배너 추가
          </Button>
          <Button type="button" onClick={save} disabled={!dirty || saving}>
            <Save className="size-4" />
            {saving ? '저장 중…' : '배너 저장'}
          </Button>
        </div>
      </div>

      {group.guide ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="mb-1 font-semibold">배너 등록 시 입력하는 항목을 참고해 주세요</p>
          <p className="whitespace-pre-line text-muted-foreground">{group.guide}</p>
          {group.template_html ? (
            <p className="mt-2 text-xs text-primary">이 그룹은 &lsquo;배너 코드&rsquo;로 화면을 그려요. 코드에 쓰인 항목만 화면에 나와요.</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="텍스트 항목에 입력한 내용을 검색하세요." className="pl-9" />
        </div>
        {dirty ? <span className="text-sm font-medium text-amber-600">저장하지 않은 변경이 있어요</span> : null}
      </div>

      {shown.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {items.length === 0 ? '배너가 없어요. "배너 추가"를 눌러 주세요.' : '검색 결과가 없어요.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((b) => {
            const index = items.findIndex((x) => x._key === b._key)
            return (
              <div
                key={b._key}
                draggable={handleKey === b._key}
                onDragStart={() => setDragKey(b._key)}
                onDragEnd={() => {
                  setDragKey(null)
                  setHandleKey(null)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(b._key)}
                onMouseUp={() => setHandleKey(null)}
              >
                <BannerEditor
                  item={b}
                  index={index}
                  total={items.length}
                  picks={picks}
                  stats={b.id ? stats[b.id] : undefined}
                  orgs={orgs}
                  categories={categories}
                  showCategory={group.code === 'category'}
                  dragging={dragKey === b._key}
                  onHandleDown={() => setHandleKey(b._key)}
                  onChange={(nb) => update(items.map((x) => (x._key === b._key ? nb : x)))}
                  onDuplicate={() => {
                    const copy = { ...b, id: null, _key: `copy-${Date.now()}`, title: b.title ? `${b.title} (복사)` : '' }
                    const next = [...items]
                    next.splice(index + 1, 0, copy)
                    update(next)
                  }}
                  onRemove={() => update(items.filter((x) => x._key !== b._key))}
                  onMove={(dir) => move(b._key, dir)}
                  onPickProduct={(p) => setPicks((m) => ({ ...m, [p.id]: p }))}
                />
              </div>
            )
          })}
        </div>
      )}

      {dirty ? (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button type="button" size="lg" onClick={save} disabled={saving} className="shadow-lg">
            <Save className="size-4" />
            {saving ? '저장 중…' : '배너 저장'}
          </Button>
        </div>
      ) : null}

      {backupOpen ? <BackupDialog group={group} onClose={() => setBackupOpen(false)} /> : null}
    </div>
  )
}

// ==================================================================== 그룹 추가·수정

function GroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: BannerGroupRow | null
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<GroupInput>(() => ({
    name: group?.name ?? '',
    code: group?.code ?? Math.random().toString(36).slice(2, 6),
    kind: group?.kind ?? 'hub',
    guide: group?.guide ?? '',
    template_html: group?.template_html ?? '',
    is_active: group?.is_active ?? true,
  }))
  const set = <K extends keyof GroupInput>(k: K, v: GroupInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    startTransition(async () => {
      const res = await saveGroupAction(group?.id ?? null, form)
      if (!res.ok) return void toast.error(res.error)
      toast.success(group ? '그룹을 수정했어요' : '그룹을 만들었어요')
      if (res.data) onSaved(res.data.id)
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? '배너 그룹 수정' : '배너 그룹 추가'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>그룹 이름</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="예: [메인] 신제품 허브" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>배너 코드</Label>
            <Input value={form.code} onChange={(e) => set('code', e.target.value)} disabled={group?.is_builtin} className="font-mono" />
            <p className="text-xs text-muted-foreground">
              {group?.is_builtin ? '기본 그룹은 코드를 바꿀 수 없어요.' : '영문·숫자로 된 그룹 이름표예요.'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>분류</Label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={form.kind}
              onChange={(e) => set('kind', e.target.value as GroupKind)}
            >
              {GROUP_KINDS.map((k) => (
                <option key={k} value={k}>
                  {GROUP_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>등록 안내</Label>
            <Textarea rows={3} value={form.guide} onChange={(e) => set('guide', e.target.value)} placeholder="배너 등록할 때 참고할 이미지 크기, 텍스트 칸 용도 등" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>배너 코드(템플릿) — 선택</Label>
            <Textarea
              rows={8}
              value={form.template_html}
              onChange={(e) => set('template_html', e.target.value)}
              className="font-mono text-xs"
              placeholder={SAMPLE_CODE}
            />
            <p className="text-xs text-muted-foreground">
              비우면 사이트 기본 모양으로 보여요. 기본 그룹이 아닌 새 그룹은 코드를 넣으면 메인 화면 아래쪽에 표시돼요. 사용할 수 있는 변수는
              그룹 목록의 &lsquo;코드&rsquo; 버튼에서 볼 수 있어요.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            {form.is_active ? '사용함' : '사용안함'}
          </label>
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

// ==================================================================== 코드 보기·변수 안내

function CodeDialog({ group, onClose }: { group: BannerGroupRow; onClose: () => void }) {
  const oldFormat = Boolean(group.template_html) && !group.template_html?.includes('data-jd-item')
  const sample = group.template_html && !oldFormat ? group.template_html : SAMPLE_CODE
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>배너 코드 — {group.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {oldFormat
              ? '이 그룹에 저장된 코드는 지원하지 않는 형식이라 사이트 기본 모양으로 보이고 있어요. 아래 예시처럼 우리 형식(data-jd-*, {{변수}})으로 바꿔 주세요.'
              : group.template_html
                ? '이 그룹은 아래 코드로 화면에 그려져요. 수정은 "수정" 버튼에서 할 수 있어요.'
                : '이 그룹은 사이트 기본 모양을 써요. 아래는 예시 코드예요. "수정"에서 코드를 넣으면 그 모양으로 바뀌어요.'}
          </p>
          <div className="relative">
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">{sample}</pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={sample} />
            </div>
          </div>
          <h3 className="mt-2 text-sm font-semibold">사용할 수 있는 표시와 변수</h3>
          <div className="divide-y divide-border rounded-lg border border-border text-xs">
            {VARIABLE_GUIDE.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[1fr_1fr] gap-3 px-3 py-1.5">
                <code className="font-mono text-primary">{k}</code>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================================================================== 백업·복구

function BackupDialog({ group, onClose }: { group: BannerGroupRow; onClose: () => void }) {
  const router = useRouter()
  const [snapshots, setSnapshots] = useState<{ id: number; created_at: string; banner_count: number }[]>([])
  const [selectedSnap, setSelectedSnap] = useState('')
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void listSnapshotsAction(group.id).then((res) => {
      if (res.ok && res.data) setSnapshots(res.data)
    })
  }, [group.id])

  function done(msg: string) {
    toast.success(msg)
    onClose()
    router.refresh()
  }

  function restore() {
    if (!selectedSnap) return
    startTransition(async () => {
      const res = await restoreSnapshotAction(group.id, Number(selectedSnap))
      if (!res.ok) return void toast.error(res.error)
      done('선택한 시점으로 되돌렸어요')
    })
  }

  function download() {
    startTransition(async () => {
      const res = await exportGroupAction(group.id)
      if (!res.ok || !res.data) return void toast.error(res.ok ? '내려받지 못했어요' : res.error)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `배너백업_${group.code}_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    })
  }

  function upload(file: File) {
    startTransition(async () => {
      try {
        const data = JSON.parse(await file.text()) as GroupBackup
        const res = await importGroupAction(group.id, data)
        if (!res.ok) return void toast.error(res.error)
        done('파일에서 배너를 되돌렸어요')
      } catch {
        toast.error('파일을 읽을 수 없어요. 배너 백업 파일(.json)인지 확인해 주세요.')
      }
    })
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>배너 백업·복구</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2 border-b border-border pb-5">
            <h3 className="font-semibold">시점 복구</h3>
            <p className="text-sm text-muted-foreground">
              이 그룹의 배너만 되돌립니다. 그룹 설정은 그대로예요.
              <br />
              [배너 저장]할 때마다 기록돼요. (최근 5회)
            </p>
            <div className="flex gap-2">
              <select
                className="h-10 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                value={selectedSnap}
                onChange={(e) => setSelectedSnap(e.target.value)}
              >
                <option value="">{snapshots.length === 0 ? '아직 저장 기록이 없어요' : '복구할 시점을 선택하세요'}</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fmt(s.created_at)} · 배너 {s.banner_count}개
                  </option>
                ))}
              </select>
              <ConfirmDialog
                trigger={
                  <Button type="button" disabled={!selectedSnap || pending}>
                    <RotateCcw className="size-4" />
                    복구하기
                  </Button>
                }
                title="이 시점으로 되돌릴까요?"
                description="지금 그룹의 배너가 선택한 시점의 배너로 바뀌어요. 지금 상태도 기록에 남아요."
                confirmLabel="복구"
                onConfirm={restore}
              />
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">파일 백업</h3>
            <p className="text-sm text-muted-foreground">
              그룹 설정(안내·배너 코드)과 배너를 한 파일로 내려받고, 그 파일로 되돌립니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={download} disabled={pending}>
                <Download className="size-4" />
                파일로 내려받기
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={pending}>
                <Upload className="size-4" />
                파일에서 복구
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) upload(f)
                }}
              />
            </div>
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
