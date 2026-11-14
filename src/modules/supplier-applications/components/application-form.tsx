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

import { submitApplicationAction } from '../actions'
import type { ApplicationInput } from '../schemas'

const EMPTY: ApplicationInput = {
  company_name: '',
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
            {field('company_name', '회사명 *', { required: true, placeholder: '예: 한일기계' })}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="app-desired_slug">미니샵 주소 (영문) *</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="shrink-0 text-muted-foreground">/s/</span>
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
            {field('phone', '연락처 *', { required: true, placeholder: '010-1234-5678' })}
            {field('email', '이메일', { type: 'email' })}
            {field('business_number', '사업자등록번호', { placeholder: '123-45-67890' })}
          </div>
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
