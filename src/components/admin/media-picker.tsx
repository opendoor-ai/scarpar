'use client'

import * as React from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/media-url'
import { listMediaAction, uploadMediaAction } from '@/lib/actions/media'
import type { Media } from '@/types/db'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MediaGrid } from '@/components/admin/media-grid'

export interface MediaPickerValue {
  id: string
  path: string
}

interface MediaPickerProps {
  value?: MediaPickerValue | null
  onChange: (m: MediaPickerValue | null) => void
  label?: string
}

/**
 * Cross-slice contract component — exact props: value/onChange/label.
 * Renders a thumbnail (or dashed placeholder) that opens a Dialog with a
 * Library tab (pick from listMediaAction) and an Upload tab (uploadMediaAction,
 * auto-selects the new file). Consumed by catalog/listings/courses/cms.
 */
function MediaPicker({ value, onChange, label }: MediaPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<Media[]>([])
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const loadLibrary = React.useCallback(async () => {
    setLoading(true)
    const result = await listMediaAction()
    if (result.ok) setItems(result.data ?? [])
    setLoading(false)
  }, [])

  React.useEffect(() => {
    if (open) void loadLibrary()
  }, [open, loadLibrary])

  function handleSelect(media: Media) {
    onChange({ id: media.id, path: media.path })
    setOpen(false)
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadMediaAction(formData)
    setUploading(false)
    if (event.target) event.target.value = ''

    if (result.ok && result.data) {
      onChange({ id: result.data.id, path: result.data.path })
      setOpen(false)
    }
  }

  return (
    <div data-slot="media-picker" className="flex flex-col gap-1.5">
      {label ? <Label>{label}</Label> : null}

      {value ? (
        <div className="relative w-fit">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block size-20 overflow-hidden rounded-md border border-input bg-muted"
          >
            <img src={mediaUrl(value.path)} alt="" className="size-full object-cover" />
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
          onClick={() => setOpen(true)}
          className={cn(
            'flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:border-ring hover:text-foreground',
          )}
        >
          <ImagePlus className="size-4" />
          <span className="text-2xs">선택</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>미디어 선택</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="library">
            <TabsList>
              <TabsTrigger value="library">보관함</TabsTrigger>
              <TabsTrigger value="upload">업로드</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="min-h-[320px]">
              <MediaGrid items={items} loading={loading} onSelect={handleSelect} />
            </TabsContent>

            <TabsContent value="upload" className="flex min-h-[320px] flex-col items-center justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleUpload}
              />
              <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? '업로드 중...' : '파일 선택'}
              </Button>
              <p className="text-xs text-muted-foreground">미디어 보관함에 올리고 바로 선택합니다.</p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { MediaPicker }
