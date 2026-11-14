// 공급사 미니샵 바닥글 — 공급사 정보(담당자·연락처·주소·홈페이지) + 전자동기계광고 안내

import Link from 'next/link'
import { ExternalLink, Mail, MapPin, Phone, User } from 'lucide-react'

import { formatKrPhone, phoneDigits } from '@/lib/phone'
import { SITE_NAME } from '@/lib/site'
import type { MenuItem } from '@/types/db'

import type { StoreOrg } from './get-store-org'
import { resolveMenuHref } from './store-links'

export function StoreFooter({
  org,
  menuItems,
}: {
  org: Pick<StoreOrg, 'name' | 'slug' | 'phone' | 'email' | 'address' | 'contact_name' | 'homepage_url' | 'item_keywords'>
  menuItems: MenuItem[]
}) {
  const keywords = org.item_keywords ?? []
  return (
    <footer className="mt-10 border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-lg font-bold">{org.name}</p>
            {keywords.length > 0 ? (
              <p className="text-xs text-muted-foreground">취급 품목: {keywords.join(', ')}</p>
            ) : null}
            <ul className="mt-1 flex flex-col gap-1.5 text-sm text-muted-foreground">
              {org.contact_name ? (
                <li className="inline-flex items-center gap-2">
                  <User className="size-4" />
                  담당 {org.contact_name}
                </li>
              ) : null}
              {org.phone ? (
                <li>
                  <a href={`tel:${phoneDigits(org.phone)}`} className="inline-flex items-center gap-2 hover:text-foreground">
                    <Phone className="size-4" />
                    {formatKrPhone(org.phone)}
                  </a>
                </li>
              ) : null}
              {org.email ? (
                <li>
                  <a href={`mailto:${org.email}`} className="inline-flex items-center gap-2 hover:text-foreground">
                    <Mail className="size-4" />
                    {org.email}
                  </a>
                </li>
              ) : null}
              {org.address ? (
                <li className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {org.address}
                </li>
              ) : null}
              {org.homepage_url ? (
                <li>
                  <a
                    href={org.homepage_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    <ExternalLink className="size-4" />
                    회사 홈페이지
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {menuItems.length > 0 ? (
            <nav className="flex flex-col gap-2 sm:items-end">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={resolveMenuHref(org.slug, item.href)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            이 미니샵은 <span className="font-semibold text-foreground">{SITE_NAME}</span> 입점 공급사가 운영합니다. 제품 정보와
            거래 조건은 해당 공급사에 문의하세요.
          </p>
          <div className="flex shrink-0 gap-3">
            <Link href="/" className="font-medium text-primary hover:underline">
              {SITE_NAME} 홈
            </Link>
            <Link href="/products" className="hover:text-foreground">
              더 많은 산업기계 보기
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
