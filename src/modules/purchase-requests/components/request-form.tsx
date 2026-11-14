'use client'

// 구매문의 등록 폼 — 회원가입 없이 등록

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { REGIONS } from '@/lib/regions'
import { cn } from '@/lib/utils'

import { createPurchaseRequestAction, uploadRequestImageAction } from '../public-actions'
import {
  CONDITION_LABEL,
  MAX_REQUEST_IMAGES,
  purchaseRequestSchema,
  REQUEST_CONDITIONS,
  type RequestCondition,
} from '../schemas'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">
        {label}
        <span className={cn('ml-1 text-xs font-normal', required ? 'text-red-500' : 'text-muted-foreground')}>
          · {required ? '필수' : '선택'}
        </span>
      </p>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function RequestForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [condition, setCondition] = useState<RequestCondition>('any')
  const [detail, setDetail] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [authorName, setAuthorName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [region, setRegion] = useState('')
  const [agree, setAgree] = useState(false)
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const room = MAX_REQUEST_IMAGES - images.length
    if (room <= 0) {
      toast.error(`사진은 ${MAX_REQUEST_IMAGES}장까지 올릴 수 있어요.`)
      return
    }
    setUploading(true)
    const added: string[] = []
    for (const file of Array.from(files).slice(0, room)) {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadRequestImageAction(fd)
      if (res.ok && res.data) added.push(res.data.path)
      else if (!res.ok) toast.error(res.error)
    }
    setImages((prev) => [...prev, ...added].slice(0, MAX_REQUEST_IMAGES))
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = { title, condition, detail, images, authorName, phone, email, region, agree, website }
    const parsed = purchaseRequestSchema.safeParse(input)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요')
      return
    }
    setSaving(true)
    const res = await createPurchaseRequestAction(parsed.data)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('구매문의가 등록됐어요. 공급사가 곧 연락드려요.')
    router.push(res.data?.no ? `/requests/${res.data.no}` : '/requests')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7">
      {/* 스팸 방지 숨김 칸 */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden
      />

      <Field label="제품명" required>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) CNC 선반, 사출기 150톤" maxLength={80} />
      </Field>

      <Field label="제품상태" required hint="무관을 고르면 신품·중고 상관없이 문의를 받아요.">
        <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border">
          {REQUEST_CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              className={cn(
                'h-11 border-r border-border text-sm font-medium transition-colors last:border-r-0',
                condition === c ? 'bg-foreground text-background' : 'hover:bg-muted',
              )}
              aria-pressed={condition === c}
            >
              {CONDITION_LABEL[c]}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="첨부 사진"
        hint={`제품 사진, 도면, 명판 사진 등을 올려 주세요. 10MB 이하 JPG·PNG·GIF·WEBP, ${MAX_REQUEST_IMAGES}장까지.`}
      >
        <div className="flex flex-wrap gap-3">
          {images.map((p) => (
            <div key={p} className="relative size-28 overflow-hidden rounded-md border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(p)} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((x) => x !== p))}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="사진 빼기"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {images.length < MAX_REQUEST_IMAGES ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex size-28 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/50 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              {uploading ? '올리는 중' : '사진 추가'}
            </button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </Field>

      <Field
        label="상세 내용"
        required
        hint={
          <span className="inline-flex items-center gap-1 text-amber-600">
            <AlertTriangle className="size-3.5" />
            상세 내용에는 이름·연락처 같은 개인정보를 적지 마세요. (연락처는 아래 칸에만)
          </span>
        }
      >
        <Textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={8}
          maxLength={3000}
          placeholder={'찾으시는 사양·수량·연식·예산·지역 등을 자세히 적을수록 정확한 견적을 받을 수 있어요.\n예) 화천 CNC 선반 2015년 이후, 척 8인치, 1대, 경기 지역 설치'}
        />
      </Field>

      <div className="grid gap-5 rounded-lg bg-muted/50 p-5 sm:grid-cols-2">
        <Field label="문의자명" required>
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="업체명 또는 성함"
            maxLength={50}
            className="bg-background"
          />
        </Field>
        <Field label="연락처" required hint="공개 화면에는 뒷자리가 가려져요. 공급사만 전체 번호를 봐요.">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            inputMode="tel"
            maxLength={20}
            className="bg-background"
          />
        </Field>
        <Field label="이메일">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="견적서를 메일로 받고 싶을 때"
            maxLength={100}
            className="bg-background"
          />
        </Field>
        <Field label="지역">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">선택 안 함</option>
            {REGIONS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-4" />
          개인정보 수집·이용 및 공급사 제공 동의 <span className="text-xs font-normal text-red-500">· 필수</span>
        </label>
        <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">1. 수집 항목</p>
          <p>문의자명, 연락처(전화번호), 이메일(선택), 지역(선택), 제품 정보(제품명·제품상태·상세 내용·첨부 사진)</p>
          <p className="mt-2 font-semibold text-foreground">2. 이용 목적</p>
          <p>구매문의 접수와 공급사 연결, 견적·상담 안내</p>
          <p className="mt-2 font-semibold text-foreground">3. 제공받는 자</p>
          <p>문의 제품을 취급하는 사이트 입점 공급사 (견적·상담 목적)</p>
          <p className="mt-2 font-semibold text-foreground">4. 보유 기간</p>
          <p>등록일로부터 1년 또는 삭제 요청 시까지. 동의를 거부할 수 있으나, 거부하면 구매문의를 등록할 수 없어요.</p>
        </div>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Button type="button" variant="outline" size="lg" className="w-32" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" size="lg" className="w-48" disabled={saving || uploading}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          구매문의 등록하기
        </Button>
      </div>
    </form>
  )
}
