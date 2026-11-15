'use client'

// 공급사 입점 신청 양식 (일반회원)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { submitApplicationAction, uploadApplicationLogoAction } from '../actions'
import { mediaUrl } from '@/lib/media-url'
import { ImagePlus, Loader2, X } from 'lucide-react'
import type { ApplicationInput } from '../schemas'

const EMPTY: ApplicationInput = {
  company_name: '',
  name_en: '',
  logo_path: '',
  desired_slug: '',
  business_number: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  homepage_url: '',
  item_keywords: '',
  message: '',
}

export function ApplicationForm({ defaultEmail }: { defaultEmail?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [values, setValues] = useState<ApplicationInput>({ ...EMPTY, email: defaultEmail ?? '' })

  function set<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await submitApplicationAction(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('입점 신청이 접수되었습니다. 승인되면 바로 관리자 화면을 쓸 수 있어요.')
      router.refresh()
    })
  }

  const field = (key: keyof ApplicationInput, label: string, props: React.ComponentProps<'input'> = {}) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`app-${key}`}>{label}</Label>
      <Input id={`app-${key}`} value={values[key] ?? ''} onChange={(e) => set(key, e.target.value)} {...props} />
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">공급사 입점 신청</CardTitle>
        <CardDescription>
          신청서를 보내면 전자동에서 확인 후 승인해 드립니다. 승인되면 우리 회사 미니샵과 상품 관리 화면이 바로
          만들어져요. (입점·기본 상품 등록 무료)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('company_name', '공급사명 (한글) *', { required: true, placeholder: '예: 한일기계' })}
            {field('name_en', '공급사 영문명', { placeholder: '예: HANIL MACHINE' })}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="app-desired_slug">미니샵 주소 (영문) *</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="shrink-0 text-muted-foreground">/minishop/</span>
                <Input
                  id="app-desired_slug"
                  value={values.desired_slug}
                  onChange={(e) => set('desired_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="hanil-machine"
                  required
                />
              </div>
            </div>
            {field('contact_name', '담당자명 *', { required: true, placeholder: '예: 대표 홍길동' })}
            {field('phone', '연락처 *', { required: true, type: 'tel', placeholder: '010-1234-5678' })}
            {field('email', '이메일', { type: 'email' })}
            {field('business_number', '사업자등록번호', { placeholder: '123-45-67890' })}
          </div>
          <LogoField value={values.logo_path ?? ''} onChange={(p) => set('logo_path', p)} />
          {field('address', '사업장 주소')}
          {field('homepage_url', '홈페이지', { placeholder: 'https://' })}
          {field('item_keywords', '취급품목 (쉼표로 구분)', { placeholder: '예: CNC선반, 머시닝센터, 중고기계' })}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="app-message">하고 싶은 말 (선택)</Label>
            <Textarea
              id="app-message"
              rows={3}
              value={values.message ?? ''}
              onChange={(e) => set('message', e.target.value)}
              placeholder="주력 제품, 등록할 상품 수 등을 알려 주시면 빠르게 도와드려요."
            />
          </div>
          <Button type="submit" disabled={isPending} className="mt-2">
            {isPending ? '보내는 중…' : '입점 신청하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** 회사 로고 올리기 — 공급사 미니샵 목록과 메인 "함께하는 공급사"에 보여요 */
function LogoField({ value, onChange }: { value: string; onChange: (path: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const fd = new FormData()
    fd.set('file', file)
    try {
      const res = await uploadApplicationLogoAction(fd)
      if (!res.ok) toast.error(res.error)
      else if (res.data) onChange(res.data.path)
    } catch {
      toast.error('로고를 올리지 못했어요. 4MB 이하로 다시 시도해 주세요.')
    }
    setBusy(false)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label>회사 로고</Label>
      <div className="flex items-center gap-3">
        <label className="relative flex h-24 w-44 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-white hover:border-primary">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt="회사 로고" className="max-h-full max-w-full object-contain p-2" />
          ) : busy ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <ImagePlus className="size-5" />
              로고 올리기
            </span>
          )}
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg" className="hidden" onChange={pick} />
        </label>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <X className="size-4" />
            빼기
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">가로형 로고 · 배경이 투명하거나 흰색인 PNG가 가장 깔끔해요. 공급사 목록과 메인 &quot;함께하는 공급사&quot;에 보여요.</p>
    </div>
  )
}
