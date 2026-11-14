// 공급사 소개 카드 — 업체명, 담당자, 연락처, 이메일, 주소, 취급품목, 홈페이지

import Link from 'next/link'
import { ExternalLink, Store } from 'lucide-react'

import { formatKrPhone, phoneDigits } from '@/lib/phone'

import type { StoreOrg } from '../get-store-org'
import { storePath } from '../store-links'
import { TrackedLink } from './tracked-link'

export function SupplierCard({ org, productId }: { org: StoreOrg; productId?: string }) {
  const keywords = org.item_keywords ?? []
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: '업체명', value: <span className="font-semibold">{org.name}</span> },
    { label: '담당자명', value: org.contact_name },
    {
      label: '연락처',
      value: org.phone ? (
        <a href={`tel:${phoneDigits(org.phone)}`} className="font-semibold text-primary hover:underline">
          {formatKrPhone(org.phone)}
        </a>
      ) : null,
    },
    {
      label: '이메일',
      value: org.email ? (
        <a href={`mailto:${org.email}`} className="text-primary hover:underline">
          {org.email}
        </a>
      ) : null,
    },
    { label: '사업장주소', value: org.address },
    {
      label: '취급품목',
      value:
        keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs text-primary"
              >
                #{k}
              </span>
            ))}
          </div>
        ) : null,
    },
  ].filter((r) => r.value)

  return (
    <section className="rounded-xl border border-primary/30 p-5" aria-labelledby="supplier-card-title">
      <h2 id="supplier-card-title" className="mb-4 flex items-center gap-2 text-base font-semibold">
        <Store className="size-4 text-primary" />
        {org.name} — 공급업체 소개
      </h2>
      <dl className="divide-y divide-border text-sm">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[88px_1fr] items-center gap-4 py-2.5">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={storePath(org.slug)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
        >
          <Store className="size-3.5" />
          공급사 미니샵 바로가기
        </Link>
        {org.homepage_url ? (
          <TrackedLink
            href={org.homepage_url}
            productId={productId}
            event="homepage_click"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            홈페이지 바로가기
            <ExternalLink className="size-3.5" />
          </TrackedLink>
        ) : null}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        이 제품을 공급하는 {org.name}의 정보입니다. 업체 연락처와 사업장 주소, 홈페이지를 확인하고 취급 제품에 대해
        문의할 수 있습니다.
      </p>
    </section>
  )
}
