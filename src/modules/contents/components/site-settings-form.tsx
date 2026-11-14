'use client'

// 사이트 설정 화면 — 상단 알림 띠, 바닥글 사업자 정보, 고객센터

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { SiteSettings } from '@/lib/site-settings'

import { saveSiteSettingsAction } from '../site-actions'

const FOOTER_FIELDS: { key: keyof SiteSettings; label: string; placeholder?: string }[] = [
  { key: 'company_name', label: '상호', placeholder: '예: 전자동' },
  { key: 'ceo', label: '대표자' },
  { key: 'business_no', label: '사업자등록번호', placeholder: '000-00-00000' },
  { key: 'mail_order_no', label: '통신판매업 신고번호', placeholder: '제0000-지역-0000호' },
  { key: 'address', label: '주소' },
  { key: 'phone', label: '대표 전화', placeholder: '1566-0000' },
  { key: 'fax', label: '팩스' },
  { key: 'email', label: '이메일' },
  { key: 'privacy_officer', label: '개인정보보호책임자' },
  { key: 'cs_hours', label: '고객센터 운영시간' },
]

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter()
  const [form, setForm] = useState<SiteSettings>(initial)
  const [pending, startTransition] = useTransition()
  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setForm((f) => ({ ...f, [key]: value }))

  function submit() {
    startTransition(async () => {
      const result = await saveSiteSettingsAction(form)
      if (!result.ok) return void toast.error(result.error)
      toast.success('사이트 설정을 저장했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">맨 위 알림 띠</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={form.notice_enabled} onCheckedChange={(v) => set('notice_enabled', v)} />
            <span className="text-sm">{form.notice_enabled ? '보이기' : '숨기기'}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="flex flex-col gap-1.5">
              <Label>알림 문구</Label>
              <Input value={form.notice_text} onChange={(e) => set('notice_text', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>버튼 글자</Label>
              <Input value={form.notice_link_label} onChange={(e) => set('notice_link_label', e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>누르면 갈 주소</Label>
            <Input value={form.notice_url} onChange={(e) => set('notice_url', e.target.value)} placeholder="/signup" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">바닥글 사업자 정보 · 고객센터</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FOOTER_FIELDS.map((f) => (
            <div
              key={f.key}
              className={
                f.key === 'address' || f.key === 'cs_hours'
                  ? 'flex flex-col gap-1.5 sm:col-span-2'
                  : 'flex flex-col gap-1.5'
              }
            >
              <Label>{f.label}</Label>
              <Input
                value={String(form[f.key] ?? '')}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value as never)}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-2">
            전자상거래법에 따라 통신판매중개자는 상호·대표자·사업자번호·통신판매업 신고번호·주소·연락처를 화면에
            표시해야 해요.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending} className="min-w-28">
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  )
}
