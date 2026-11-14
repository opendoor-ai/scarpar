// 광고상품 안내 — 광고 자리 종류·권장 크기·문의

import type { Metadata } from 'next'
import Link from 'next/link'
import { Megaphone, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/site'
import { getSiteSettings } from '@/lib/site-settings'
import { BANNER_PLACEMENT_INFO, BANNER_PLACEMENTS } from '@/modules/ads/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `광고상품 안내 · ${SITE_NAME}`,
  description: '메인 배너, 허브 광고, 날개 배너, 유료 상단 노출 등 전자동기계광고의 광고 상품을 안내합니다.',
}

export default async function AdvertisePage() {
  const settings = await getSiteSettings()
  const phoneDigits = settings.phone.replace(/[^\d]/g, '')
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col items-start gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Megaphone className="size-3.5" />
          광고상품
        </span>
        <h1 className="text-2xl font-bold sm:text-3xl">기계를 찾는 고객에게 바로 보이는 광고</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {SITE_NAME}는 산업기계·중고기계를 찾는 고객이 모이는 곳이에요. 원하는 자리와 기간을 골라 광고하면, 광고가 얼마나
          보이고 눌렸는지(노출·클릭·클릭률)도 확인해 드립니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BANNER_PLACEMENTS.map((p) => {
          const info = BANNER_PLACEMENT_INFO[p]
          return (
            <div key={p} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">{info.label}</h2>
              <p className="text-sm text-muted-foreground">{info.hint}</p>
              <p className="text-xs text-muted-foreground">권장 이미지 {info.size}</p>
            </div>
          )
        })}
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/30 dark:bg-amber-500/5">
          <h2 className="font-semibold">유료 상단 노출 (추천 제품)</h2>
          <p className="text-sm text-muted-foreground">
            내 제품을 메인 화면 또는 카테고리 페이지 맨 위 &lsquo;추천 제품&rsquo; 칸에 보여줘요.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">광고 문의</p>
          <p className="text-sm text-muted-foreground">가격·남은 자리·기간은 전화로 안내해 드려요. {settings.cs_hours}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {phoneDigits ? (
            <Button asChild>
              <a href={`tel:${phoneDigits}`}>
                <Phone className="size-4" />
                {settings.phone}
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/signup">공급사 등록신청</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
