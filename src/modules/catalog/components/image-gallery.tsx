'use client'

// Controlled gallery editor for a product's images (replace-set — saved via
// the saveImages action from product-form.tsx). Depends on the media slice's
// documented contract: mediaUrl(path) (@/lib/media-url) and <MediaPicker>
// (@/components/admin/media-picker) — neither existed in the repo at the
// time this slice was built; see the catalog build report for that risk.
//
// Per-image variant assignment only lists ALREADY-PERSISTED variants (ones
// with a db id). A brand-new, not-yet-saved variant has no id until
// saveVariants runs, so it can't be cross-referenced from an image row in
// the same save pass — save the product once, then assign images to new
// variants on the next edit. Documented limitation, not a bug.

import { ChevronDown, ChevronUp, ImageOff, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaPicker } from '@/components/admin/media-picker'
import { mediaUrl } from '@/lib/media-url'
import { randomKey } from '@/lib/utils'
import type { ProductImage } from '@/types/db'

import type { ProductImageInput } from '../schemas'

export interface ImageRow {
  /** Stable client-side list key — the db id when persisted, else a randomKey(). */
  key: string
  id?: string
  mediaId: string
  path: string
  variantId: string | null
}

export function toImageRow(row: ProductImage & { path: string }): ImageRow {
  return { key: row.id, id: row.id, mediaId: row.media_id, path: row.path, variantId: row.variant_id }
}

export function fromImageRow(row: ImageRow, position: number): ProductImageInput {
  return { id: row.id, media_id: row.mediaId, variant_id: row.variantId, position }
}

const ALL_VARIANTS = '__all__'

interface ImageGalleryProps {
  value: ImageRow[]
  onChange: (rows: ImageRow[]) => void
  /** Persisted variants only — see file header note. */
  variantOptions: { id: string; name: string }[]
}

function ImageGallery({ value, onChange, variantOptions }: ImageGalleryProps) {
  function addImage(media: { id: string; path: string } | null) {
    if (!media) return
    onChange([...value, { key: randomKey(), mediaId: media.id, path: media.path, variantId: null }])
  }

  function updateRow(key: string, patch: Partial<ImageRow>) {
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeRow(key: string) {
    onChange(value.filter((row) => row.key !== key))
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <EmptyState icon={ImageOff} title="아직 사진이 없습니다" description="아래에서 상품 사진을 추가하세요." />
      ) : (
        <div className="flex flex-col gap-2">
          {value.map((row, index) => (
            <Card key={row.key} className="flex-row items-center gap-3 p-2">
              {/* Storage thumbnail — plain img (no next/image domain config owned by this slice). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(row.path)} alt="" className="border-border size-14 shrink-0 rounded-md border object-cover" />
              <div className="flex flex-1 items-center gap-2">
                {variantOptions.length > 0 ? (
                  <Select
                    value={row.variantId ?? ALL_VARIANTS}
                    onValueChange={(v) => updateRow(row.key, { variantId: v === ALL_VARIANTS ? null : v })}
                  >
                    <SelectTrigger size="sm" className="w-56">
                      <SelectValue placeholder="모든 옵션" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VARIANTS}>모든 옵션</SelectItem>
                      {variantOptions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground text-xs">모든 옵션에 표시</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row.key)}>
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <MediaPicker value={null} onChange={addImage} label="사진 추가" />
    </div>
  )
}

export { ImageGallery }
