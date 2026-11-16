// 공급사 미니샵 머리글
// 맨 위 얇은 띠: 전자동기계광고로 돌아가기 / 본 머리글: 공급사 로고·이름·취급품목, 메뉴, 검색, 전화 문의

import { platformUrl } from '@/lib/domains'
import Link from 'next/link'
import { ChevronLeft, Phone, Search } from 'lucide-react'

import { mediaUrl } from '@/lib/media-url'
import { formatKrPhone, phoneDigits } from '@/lib/phone'
import { SITE_NAME } from '@/lib/site'
import type { MenuItem } from '@/types/db'

import type { StoreOrg } from './get-store-org'
import { MobileNav } from './mobile-nav'
import { resolveMenuHref, storePath } from './store-links'

/** 메뉴를 따로 만들지 않아도 기본으로 보이는 메뉴 */
const DEFAULT_MENU: MenuItem[] = [
  { label: '홈', href: '/' },
  { label: '전체 제품', href: '/products' },
]

export function StoreHeader({
  org,
  menuItems,
}: {
  org: Pick<StoreOrg, 'name' | 'slug' | 'logo_path' | 'phone' | 'item_keywords'>
  menuItems: MenuItem[]
}) {
  // 기본 메뉴 + 공급사가 만든 메뉴 (같은 주소는 한 번만)
  const seen = new Set<string>()
  const items = [...DEFAULT_MENU, ...menuItems].filter((m) => {
    const key = resolveMenuHref(org.slug, m.href)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const digits = org.phone ? phoneDigits(org.phone) : ''
  const keywords = (org.item_keywords ?? []).slice(0, 4)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      {/* 전자동기계광고로 돌아가기 */}
      <div className="border-b border-border bg-muted/50">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:px-6">
          <Link href={platformUrl()} className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3.5" />
            <span className="font-semibold text-primary">{SITE_NAME}</span>
            <span className="hidden sm:inline">입점 공급사</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={platformUrl('/products')} className="hover:text-foreground">
              전체 제품
            </Link>
            <Link href={platformUrl('/suppliers')} className="hover:text-foreground">
              다른 공급사
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={storePath(org.slug)} className="flex min-w-0 items-center gap-2.5">
          {org.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(org.logo_path)} alt={org.name} className="h-9 w-auto shrink-0 rounded-sm object-contain" />
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base leading-tight font-bold sm:text-lg">{org.name}</span>
            {keywords.length > 0 ? (
              <span className="hidden truncate text-xs text-muted-foreground sm:block">{keywords.join(' · ')}</span>
            ) : null}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={resolveMenuHref(org.slug, item.href)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={storePath(org.slug, '/products')}
            aria-label="제품 검색"
            className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent"
          >
            <Search className="size-4" />
          </Link>
          {digits ? (
            <a
              href={`tel:${digits}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              aria-label={`전화 문의 ${formatKrPhone(org.phone as string)}`}
            >
              <Phone className="size-4" />
              <span className="hidden sm:inline">{formatKrPhone(org.phone as string)}</span>
              <span className="sm:hidden">전화</span>
            </a>
          ) : null}
          <MobileNav orgSlug={org.slug} menuItems={items} storeName={org.name} />
        </div>
      </div>
    </header>
  )
}
