'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileIcon, Loader2, Trash2, Upload } from 'lucide-react'

import { mediaUrl } from '@/lib/media-url'
import { deleteMediaAction, listMediaAction, updateMediaAction, uploadMediaAction } from '@/lib/actions/media'
import type { Media } from '@/types/db'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { CopyButton } from '@/components/ui/copy-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

interface MediaManagerProps {
  initialItems: Media[]
}

function MediaManager({ initialItems }: MediaManagerProps) {
  const [items, setItems] = React.useState<Media[]>(initialItems)
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const isFirstRun = React.useRef(true)

  const refresh = React.useCallback(async (query: string) => {
    setLoading(true)
    const result = await listMediaAction(undefined, query || undefined)
    if (result.ok) setItems(result.data ?? [])
    setLoading(false)
  }, [])

  React.useEffect(() => {
    // Skip the redundant fetch on mount — initialItems already came from the server component.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    void refresh(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    let failures = 0
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadMediaAction(formData)
      if (!result.ok) failures += 1
    }
    setUploading(false)
    if (event.target) event.target.value = ''
    if (failures > 0) toast.error(`파일 ${failures}개 업로드에 실패했습니다.`)
    void refresh(search)
  }

  async function handleDelete(id: string) {
    const result = await deleteMediaAction(id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleAltSave(id: string, alt: string) {
    const result = await updateMediaAction(id, { alt })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, alt } : item)))
    toast.success('저장되었습니다.')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="미디어 검색..." className="max-w-xs" />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleUpload}
        />
        <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? '업로드 중...' : '업로드'}
        </Button>
      </div>

      {!loading && items.length === 0 ? (
        <EmptyState
          icon={FileIcon}
          title="아직 등록된 미디어가 없습니다"
          description="페이지와 상품에 사용할 이미지와 파일을 업로드하세요."
          action={
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              파일 업로드
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onDelete={handleDelete} onAltSave={handleAltSave} />
          ))}
        </div>
      )}
    </div>
  )
}

interface MediaCardProps {
  item: Media
  onDelete: (id: string) => Promise<void>
  onAltSave: (id: string, alt: string) => Promise<void>
}

function MediaCard({ item, onDelete, onAltSave }: MediaCardProps) {
  const [alt, setAlt] = React.useState(item.alt ?? '')
  const isImage = item.mime?.startsWith('image/')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-col gap-1.5 rounded-md border p-1.5 text-left transition-colors hover:border-ring"
        >
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-muted">
            {isImage ? (
              <img src={mediaUrl(item.path)} alt={item.alt ?? ''} className="size-full object-cover" />
            ) : (
              <FileIcon className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="truncate text-xs font-medium">{item.name ?? item.path}</div>
          <div className="text-2xs text-muted-foreground">{formatSize(item.size)}</div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-3">
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded bg-muted">
            {isImage ? (
              <img src={mediaUrl(item.path)} alt={item.alt ?? ''} className="size-full object-cover" />
            ) : (
              <FileIcon className="size-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor={`alt-${item.id}`}>대체 텍스트(alt)</Label>
            <div className="flex gap-1.5">
              <Input id={`alt-${item.id}`} value={alt} onChange={(e) => setAlt(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => onAltSave(item.id, alt)}>
                저장
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{item.path}</span>
              <CopyButton text={item.path} />
            </div>
          </div>

          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive" size="sm">
                <Trash2 className="size-3.5" />
                삭제
              </Button>
            }
            title="이 파일을 삭제할까요?"
            description="저장소에서 완전히 삭제되며 되돌릴 수 없습니다. 이 파일을 쓰는 페이지나 상품에서는 이미지가 깨져 보입니다."
            confirmLabel="삭제"
            destructive
            onConfirm={() => onDelete(item.id)}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { MediaManager }
