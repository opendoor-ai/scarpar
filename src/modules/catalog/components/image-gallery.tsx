'use client'

// 상품 이미지 등록 (카페24 방식) — 대표이미지 1장 + 추가이미지(끌어서 순서·역순정렬·여러 장 추가)
// 저장은 product-form 에서 saveImages 로 한 번에 (첫 번째 = 대표이미지).

import { useRef, useState } from 'react'
import { ArrowDownUp, Camera, ImagePlus, Star, Trash2 } from 'lucide-react'

import { MediaPicker } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { mediaUrl } from '@/lib/media-url'
import { cn, randomKey } from '@/lib/utils'
import type { ProductImage } from '@/types/db'

import type { ProductImageInput } from '../schemas'

export interface ImageRow {
  /** 화면용 고유 키 — 저장된 사진은 db id */
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

const MAX_EXTRA = 20

interface ImageGalleryProps {
  value: ImageRow[]
  onChange: (rows: ImageRow[]) => void
  /** (예전 호환) 옵션별 사진 지정 — 지금 화면에서는 쓰지 않음 */
  variantOptions?: { id: string; name: string }[]
}

function RowLayout({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 px-4 py-4 md:grid-cols-[170px_1fr] md:items-start">
      <div className="pt-1 text-sm font-medium text-muted-foreground">{label}</div>
      <div className="flex min-w-0 flex-col gap-2">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function ImageGallery({ value, onChange }: ImageGalleryProps) {
  // 여러 장을 연달아 올릴 때 최신 목록에 이어 붙이도록
  const latest = useRef(value)
  latest.current = value
  const [dragKey, setDragKey] = useState<string | null>(null)

  const main = value[0] ?? null
  const extras = value.slice(1)

  const row = (m: { id: string; path: string }): ImageRow => ({ key: randomKey(), mediaId: m.id, path: m.path, variantId: null })

  function setMain(m: { id: string; path: string } | null) {
    if (!m) return
    const rest = latest.current.slice(1)
    onChange([row(m), ...rest])
  }

  function removeMain() {
    onChange(latest.current.slice(1)) // 첫 추가이미지가 대표가 됨
  }

  function addExtra(m: { id: string; path: string } | null) {
    if (!m) return
    const cur = latest.current
    if (cur.length - 1 >= MAX_EXTRA) return
    const next = cur.length === 0 ? [row(m)] : [...cur, row(m)]
    latest.current = next
    onChange(next)
  }

  function removeExtra(key: string) {
    onChange(value.filter((r) => r.key !== key))
  }

  function makeMain(key: string) {
    const target = value.find((r) => r.key === key)
    if (!target) return
    onChange([target, ...value.filter((r) => r.key !== key)])
  }

  function reverse() {
    if (!main) return
    onChange([main, ...extras.slice().reverse()])
  }

  function dropOn(key: string) {
    if (!dragKey || dragKey === key || !main) return
    const list = [...extras]
    const from = list.findIndex((r) => r.key === dragKey)
    const to = list.findIndex((r) => r.key === key)
    if (from < 0 || to < 0) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    onChange([main, ...list])
  }

  return (
    <>
      {/* 대표이미지 */}
      <RowLayout label="대표이미지" hint="목록·상세페이지 첫 화면에 쓰여요. 권장 1000×1000 이상 정사각형 · 10MB 이하 · jpg, png, gif, webp">
        <div className="flex flex-wrap items-end gap-3">
          <MediaPicker
            value={main ? { id: main.mediaId, path: main.path } : null}
            onChange={setMain}
            renderTrigger={(open) => (
              <button
                type="button"
                onClick={open}
                className="group relative flex size-48 items-center justify-center overflow-hidden rounded-md border border-border bg-[#e9e9e9]"
                aria-label={main ? '대표이미지 변경' : '대표이미지 등록'}
              >
                {main ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(main.path)} alt="" className="size-full object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="size-10" />
                    <span className="text-xs">대표이미지</span>
                  </span>
                )}
                {main ? (
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    눌러서 변경
                  </span>
                ) : null}
              </button>
            )}
          />
          <div className="flex flex-col gap-2">
            <MediaPicker
              value={null}
              onChange={setMain}
              renderTrigger={(open) => (
                <Button type="button" variant="outline" size="sm" onClick={open}>
                  <ImagePlus className="size-4" />
                  {main ? '변경' : '등록'}
                </Button>
              )}
            />
            {main ? (
              <Button type="button" variant="ghost" size="sm" onClick={removeMain}>
                <Trash2 className="size-4" />
                삭제
              </Button>
            ) : null}
          </div>
        </div>
      </RowLayout>

      {/* 추가이미지 */}
      <RowLayout label="추가이미지" hint={`상세페이지 사진 넘기기에 대표이미지 다음으로 보여요. 권장 1500×1500 · ${MAX_EXTRA}개까지`}>
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <Button type="button" variant="outline" size="sm" onClick={reverse} disabled={extras.length < 2}>
              <ArrowDownUp className="size-4" />
              역순정렬
            </Button>
            <span className="text-xs text-muted-foreground">마우스로 끌어서 순서를 바꿀 수 있어요.</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {extras.length} / {MAX_EXTRA}
            </span>
            <MediaPicker
              value={null}
              onChange={addExtra}
              multiple
              renderTrigger={(open) => (
                <Button type="button" size="sm" onClick={open} disabled={extras.length >= MAX_EXTRA}>
                  <ImagePlus className="size-4" />
                  이미지 추가하기
                </Button>
              )}
            />
          </div>
          {extras.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              {main ? '등록된 추가이미지가 없어요.' : '대표이미지를 먼저 등록해 주세요. (추가이미지로 올리면 첫 장이 대표가 돼요)'}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-4 lg:grid-cols-6">
              {extras.map((r, i) => (
                <div
                  key={r.key}
                  draggable
                  onDragStart={() => setDragKey(r.key)}
                  onDragEnd={() => setDragKey(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(r.key)}
                  className={cn(
                    'group relative aspect-square cursor-grab overflow-hidden rounded-md border border-border bg-[#e9e9e9] active:cursor-grabbing',
                    dragKey === r.key && 'opacity-40',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(r.path)} alt="" className="pointer-events-none size-full object-contain" />
                  <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                    {i + 1}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => makeMain(r.key)}
                      className="inline-flex items-center gap-0.5 rounded px-1 text-[10px] text-white hover:bg-white/20"
                      title="대표이미지로"
                    >
                      <Star className="size-3" />
                      대표로
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExtra(r.key)}
                      className="rounded p-0.5 text-white hover:bg-white/20"
                      aria-label="삭제"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </RowLayout>
    </>
  )
}

export { ImageGallery }
