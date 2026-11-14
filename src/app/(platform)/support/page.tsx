// 고객센터 — 연락처, 운영시간, 자주 묻는 질문

import type { Metadata } from 'next'
import Link from 'next/link'
import { Headphones, Mail, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/site'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `고객센터 · ${SITE_NAME}`,
  description: '전자동기계광고 고객센터 — 제품 문의, 공급사 입점, 광고 문의를 도와드립니다.',
}

const FAQ = [
  {
    q: '제품은 어떻게 사나요?',
    a: `${SITE_NAME}는 공급사와 고객을 연결하는 광고 플랫폼이에요. 제품 상세페이지의 전화·문자 버튼으로 공급사에 직접 문의하고, 가격·납기·설치는 공급사와 협의해 주세요.`,
  },
  {
    q: '가격이 "가격협의"로 나와요.',
    a: '중고·주문제작 기계는 상태와 옵션에 따라 가격이 달라서 공급사가 상담 후 안내해요. 전화나 문자로 문의해 주세요.',
  },
  {
    q: '공급사로 입점하려면 어떻게 하나요?',
    a: '"공급사등록신청"에서 회원가입 후 입점 신청서를 내면, 확인 후 미니샵과 관리자 화면이 열려요. 제품 등록은 무료예요.',
  },
  {
    q: '광고는 어떻게 하나요?',
    a: '"광고상품" 페이지에서 광고 자리를 확인하고 고객센터로 연락 주세요. 남은 자리와 기간을 안내해 드려요.',
  },
  {
    q: '거래 중 문제가 생겼어요.',
    a: '거래 당사자는 고객과 공급사예요. 먼저 공급사와 협의해 주시고, 해결이 어려우면 고객센터로 알려 주세요. 사실 확인 후 공급사 안내·조치를 도와드려요.',
  },
]

export default async function SupportPage() {
  const s = await getSiteSettings()
  const digits = s.phone.replace(/[^\d]/g, '')
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Headphones className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">고객센터</h1>
          <p className="text-sm text-muted-foreground">{s.cs_hours}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {digits ? (
          <a href={`tel:${digits}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/50">
            <Phone className="size-6 text-primary" />
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">전화 문의</span>
              <span className="text-xl font-bold">{s.phone}</span>
            </span>
          </a>
        ) : null}
        {s.email ? (
          <a href={`mailto:${s.email}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:border-primary/50">
            <Mail className="size-6 text-primary" />
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">이메일 문의</span>
              <span className="font-semibold">{s.email}</span>
            </span>
          </a>
        ) : null}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-bold">자주 묻는 질문</h2>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {FAQ.map((f) => (
          <details key={f.q} className="group p-4">
            <summary className="cursor-pointer list-none font-medium">
              <span className="mr-2 text-primary">Q.</span>
              {f.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/signup">공급사 등록신청</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/advertise">광고상품 보기</Link>
        </Button>
      </div>
    </div>
  )
}
