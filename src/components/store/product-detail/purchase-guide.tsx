// "상품구매안내" 탭 — 공급사별 설정(설정 → 쇼핑몰)의 안내 문구를 보여줍니다.

import { CreditCard, Headphones, RotateCcw, Truck } from 'lucide-react'

import { settingStr } from '@/lib/settings'

const SECTIONS = [
  { key: 'storefront.guide_payment', title: '결제 정보', icon: CreditCard },
  { key: 'storefront.guide_shipping', title: '배송·설치 정보', icon: Truck },
  { key: 'storefront.guide_returns', title: '교환·반품 정보', icon: RotateCcw },
  { key: 'storefront.guide_service', title: '서비스 문의', icon: Headphones },
] as const

export function PurchaseGuide({ settings }: { settings: Record<string, unknown> }) {
  const items = SECTIONS.map((s) => ({ ...s, text: settingStr(settings, s.key).trim() })).filter((s) => s.text)
  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-4" aria-labelledby="guide-title">
      <h2 id="guide-title" className="text-lg font-semibold">
        상품구매안내
      </h2>
      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map(({ key, title, icon: Icon, text }) => (
          <div key={key} className="flex flex-col gap-2 p-4 sm:flex-row sm:gap-6">
            <p className="flex w-36 shrink-0 items-center gap-2 text-sm font-semibold">
              <Icon className="size-4 text-primary" />
              {title}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
