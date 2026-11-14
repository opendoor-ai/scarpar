// 고객센터 — 연락처, 운영시간, 자주 묻는 질문

import type { Metadata } from 'next'
import Link from 'next/link'
import { Headphones, Mail, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/site'
import { DEFAULT_FAQ, faqJsonLd } from '@/lib/default-faq'
import { getSiteSettings } from '@/lib/site-settings'
import { getSiteConfig } from '@/modules/site-config/get'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `고객센터 · ${SITE_NAME}`,
  description: '전자동기계광고 고객센터 — 제품 문의, 공급사 입점, 광고 문의를 도와드립니다.',
}

export default async function SupportPage() {
  const [s, { seo }] = await Promise.all([getSiteSettings(), getSiteConfig()])
  // 관리자 → SEO → 자주 묻는 질문을 적었으면 그것을, 없으면 기본 질문
  const FAQ = seo.faq.length > 0 ? seo.faq : DEFAULT_FAQ
  const digits = s.phone.replace(/[^\d]/g, '')
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* 검색엔진·AI용 자주 묻는 질문 구조화 데이터 (FAQPage) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(FAQ) }} />
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
