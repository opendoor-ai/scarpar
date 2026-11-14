'use client'

// 이미지 첨부 — 누르면 바로 내 컴퓨터의 파일 선택 창이 열리고, 고른 사진을 올린 뒤 곧바로 첨부해요.
// (보관함·업로드 창을 거치지 않음. 사진 파일은 저장소에 올라가고, 상품·배너가 그 사진을 가리켜요.)
// 모든 화면(상품·배너·페이지·콘텐츠 등)이 이 부품을 같이 씁니다.

import * as React from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media-url'
import { uploadMediaAction } from '@/lib/actions/media'
import { shrinkImage } from '@/lib/image-resize'
import { Label } from '@/components/ui/label'

export interface MediaPickerValue {
  id: string
  path: string
}

interface MediaPickerProps {
  value?: MediaPickerValue | null
  onChange: (m: MediaPickerValue | null) => void
  label?: string
  /** 기본 썸네일 대신 쓸 버튼 (누르면 open() 호출, uploading = 올리는 중) */
  renderTrigger?: (open: () => void, uploading: boolean) => React.ReactNode
  /** 여러 장을 한 번에 고를 수 있게 (사진마다 onChange 호출) */
  multiple?: boolean
}

const MAX_MB = 10

function MediaPicker({ value, onChange, label, renderTrigger, multiple = false }: MediaPickerProps) {
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const open = () => {
    if (!uploading) fileInputRef.current?.click()
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    setUploading(true)
    const toastId = toast.loading(files.length > 1 ? `사진 ${files.length}장을 올리는 중…` : '사진을 올리는 중…')
    let done = 0
    for (const original of files) {
      if (!original.type.startsWith('image/')) {
        toast.error(`${original.name}: 이미지 파일만 올릴 수 있어요.`)
        continue
      }
      // 큰 사진은 올리기 전에 알맞은 크기로 줄여요 (서버는 4MB까지 받음)
      const file = await shrinkImage(original)
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${original.name}: 사진이 너무 커요. ${MAX_MB}MB 이하로 줄여서 올려 주세요.`)
        continue
      }
      try {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadMediaAction(formData)
        if (result.ok && result.data) {
          onChange({ id: result.data.id, path: result.data.path })
          done += 1
        } else {
          toast.error(`${original.name}: ${result.ok ? '올리지 못했어요.' : result.error}`)
        }
      } catch {
        toast.error(`${original.name}: 올리지 못했어요. 사진 크기를 줄여서 다시 시도해 주세요.`)
      }
    }
    setUploading(false)
    if (done > 0) toast.success(done > 1 ? `사진 ${done}장을 첨부했어요` : '사진을 첨부했어요', { id: toastId })
    else toast.dismiss(toastId)
  }

  return (
    <div data-slot="media-picker" className="flex flex-col gap-1.5">
      {label ? <Label>{label}</Label> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={handleFiles}
      />

      {renderTrigger ? (
        renderTrigger(open, uploading)
      ) : value ? (
        <div className="relative w-fit">
          <button
            type="button"
            onClick={open}
            title="눌러서 다른 사진으로 바꾸기"
            className="relative block size-20 overflow-hidden rounded-md border border-input bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(value.path)} alt="" className="size-full object-cover" />
            {uploading ? (
              <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="size-4 animate-spin" />
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background"
          >
            <X className="size-2.5" />
            <span className="sr-only">지우기</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={uploading}
          className={cn(
            'flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-60',
          )}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          <span className="text-2xs">{uploading ? '올리는 중' : '사진 첨부'}</span>
        </button>
      )}
    </div>
  )
}

export { MediaPicker }
