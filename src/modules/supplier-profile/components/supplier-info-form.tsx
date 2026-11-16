'use client'

// 공급사 기본정보 (카페24 "공급사 기본정보"처럼) — 공급사 운영자가 직접 고쳐요

import { minishopLabel } from '@/lib/domains'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MediaPicker } from '@/components/admin/media-picker'
import { mediaUrl } from '@/lib/media-url'
import { DetailHtmlEditor } from '@/modules/catalog/components/detail-html-editor'
import { cn } from '@/lib/utils'

import { changeMyPasswordAction, saveSupplierInfoAction, type SupplierInfoInput } from '../actions'

export interface SupplierInfoView {
  name: string
  slug: string
  loginEmail: string | null
  gradeName: string | null
  gradeColor: string | null
  gradeUntil: string | null
  isActive: boolean
  memo: string | null
  canChangePassword: boolean
  values: SupplierInfoInput
}

function Row({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col border-b border-border last:border-b-0 sm:flex-row">
      <div className="flex items-start bg-muted/50 px-4 py-3 text-[13px] font-medium sm:w-40 sm:shrink-0">
        {label}
        {required ? <span className="ml-1 rounded-sm bg-red-500 px-1 text-[10px] leading-4 text-white">필수</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-2.5 text-[13px]">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <div className="overflow-hidden rounded-md border border-border bg-card">{children}</div>
    </section>
  )
}

export function SupplierInfoForm({ view }: { view: SupplierInfoView }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<SupplierInfoInput>(() => ({
    ...view.values,
    contacts: [0, 1, 2].map((i) => view.values.contacts[i] ?? { name: '', phone: '', email: '' }),
  }))
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const set = (patch: Partial<SupplierInfoInput>) => setV((p) => ({ ...p, ...patch }))
  const setContact = (i: number, key: 'name' | 'phone' | 'email', value: string) =>
    setV((p) => ({ ...p, contacts: p.contacts.map((c, j) => (j === i ? { ...c, [key]: value } : c)) }))
  const input = 'h-8 max-w-md bg-background'

  function save() {
    start(async () => {
      if (pw || pw2) {
        const r = await changeMyPasswordAction(pw, pw2)
        if (!r.ok) return void toast.error(r.error)
        setPw('')
        setPw2('')
        toast.success('비밀번호를 바꿨어요')
      }
      const res = await saveSupplierInfoAction(v)
      if (!res.ok) return void toast.error(res.error)
      toast.success('공급사 기본정보를 저장했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Box title="기본정보">
        <Row label="공급사명">
          <b>{view.name}</b>
        </Row>
        <Row label="공급사 영문명" hint="공급사 미니샵 목록·메인 '함께하는 공급사'에 한글명 아래 보여요.">
          <Input value={v.name_en ?? ''} onChange={(e) => set({ name_en: e.target.value })} placeholder="예: KIHYUN" maxLength={80} className={input} />
        </Row>
        <Row label="회사 로고" hint="가로형·배경 투명(또는 흰색) PNG 권장. 미니샵 머리글·공급사 목록·함께하는 공급사에 보여요.">
          <div className="flex items-center gap-3">
            {v.logo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(v.logo_path)} alt="" className="h-16 w-40 rounded border border-border bg-white object-contain p-1.5" />
            ) : null}
            <MediaPicker value={v.logo_path ? { id: '', path: v.logo_path } : null} onChange={(m) => set({ logo_path: m?.path ?? '' })} />
          </div>
        </Row>
        <Row label="공급사 아이디">
          <span>
            {view.slug} <span className="text-muted-foreground">(미니샵 주소 {minishopLabel(view.slug)})</span>
          </span>
        </Row>
        <Row label="로그인 ID">{view.loginEmail ?? '-'}</Row>
        {view.canChangePassword ? (
          <>
            <Row label="비밀번호" hint="영문 대소문자/숫자/특수문자 중 2가지 이상 10~16자, 또는 3가지 이상 8~16자. 바꿀 때만 입력하세요.">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className={input} />
            </Row>
            <Row label="비밀번호 확인">
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" className={input} />
            </Row>
          </>
        ) : null}
        <Row label="공급사 등급">
          <span>
            {view.gradeName ? (
              <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: view.gradeColor ?? '#64748b' }}>
                {view.gradeName}
              </span>
            ) : (
              '-'
            )}
            {view.gradeUntil ? <span className="ml-2 text-muted-foreground">{view.gradeUntil}까지</span> : null}
          </span>
        </Row>
        <Row label="거래상태">
          <span className={view.isActive ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>{view.isActive ? '거래중' : '거래중지'}</span>
        </Row>
        <Row label="거래상품 유형" hint="쉼표로 나눠 적어요. 미니샵과 공급사 목록에 보여요.">
          <Input value={v.item_keywords ?? ''} onChange={(e) => set({ item_keywords: e.target.value })} placeholder="예: 식품기계, 반응기, 스텐탱크" className={input} />
        </Row>
      </Box>

      <Box title="상세정보">
        <Row label="일반전화" required>
          <Input type="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} className={input} />
        </Row>
        <Row label="팩스번호">
          <Input type="tel" value={v.fax ?? ''} onChange={(e) => set({ fax: e.target.value })} className={input} />
        </Row>
        <Row label="이메일">
          <Input type="email" value={v.email ?? ''} onChange={(e) => set({ email: e.target.value })} className={input} />
        </Row>
        <Row label="사업장주소" required>
          <Input value={v.address} onChange={(e) => set({ address: e.target.value })} className="h-8 bg-background" placeholder="예: 경기도 화성시 봉담읍 덕리 287" />
        </Row>
        <Row label="홈페이지 주소">
          <Input value={v.homepage_url ?? ''} onChange={(e) => set({ homepage_url: e.target.value })} placeholder="https://" className={input} />
        </Row>
        <Row label="담당자" hint="첫 번째 담당자가 미니샵·상품 상세의 '담당자명'으로 보여요.">
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="w-10 py-1.5">No</th>
                  <th className="py-1.5">담당자</th>
                  <th className="py-1.5">담당자 연락처</th>
                  <th className="py-1.5">담당자 이메일</th>
                </tr>
              </thead>
              <tbody>
                {v.contacts.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="text-center">{i + 1}</td>
                    <td className="p-1.5">
                      <Input value={c.name ?? ''} onChange={(e) => setContact(i, 'name', e.target.value)} className="h-8 bg-background" placeholder={i === 0 ? '예: 남용선 대표님' : ''} />
                    </td>
                    <td className="p-1.5">
                      <Input type="tel" value={c.phone ?? ''} onChange={(e) => setContact(i, 'phone', e.target.value)} className="h-8 bg-background" />
                    </td>
                    <td className="p-1.5">
                      <Input type="email" value={c.email ?? ''} onChange={(e) => setContact(i, 'email', e.target.value)} className="h-8 bg-background" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Row>
        <Row label="회사소개" hint="미니샵 첫 화면 회사 소개에 쓰여요.">
          <DetailHtmlEditor value={v.company_intro ?? ''} onChange={(html) => set({ company_intro: html })} />
        </Row>
        <Row label="메모">
          <p className={cn('whitespace-pre-line', !view.memo && 'text-muted-foreground')}>{view.memo || '전자동에서 남긴 메모가 없어요.'}</p>
        </Row>
      </Box>

      <Box title="사업자등록 정보">
        <Row label="사업자등록번호">
          <Input value={v.bin_number ?? ''} onChange={(e) => set({ bin_number: e.target.value })} placeholder="000-00-00000" className={input} />
        </Row>
        <Row label="사업자상호명">
          <Input value={v.biz_name ?? ''} onChange={(e) => set({ biz_name: e.target.value })} className={input} />
        </Row>
        <Row label="대표자명">
          <Input value={v.ceo_name ?? ''} onChange={(e) => set({ ceo_name: e.target.value })} className={input} />
        </Row>
        <Row label="업태">
          <Input value={v.biz_type ?? ''} onChange={(e) => set({ biz_type: e.target.value })} placeholder="예: 도소매" className={input} />
        </Row>
        <Row label="종목">
          <Input value={v.biz_item ?? ''} onChange={(e) => set({ biz_item: e.target.value })} placeholder="예: 고철, 비철, 중고기계" className={input} />
        </Row>
      </Box>

      <div className="flex justify-center pb-6">
        <Button onClick={save} disabled={pending} className="w-32 bg-indigo-600 hover:bg-indigo-700">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          저장
        </Button>
      </div>
    </div>
  )
}
