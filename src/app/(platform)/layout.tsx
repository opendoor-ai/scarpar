// 플랫폼(전자동기계광고) 공통 화면 틀 — 메인·통합 제품·공급사·매거진·고객센터 등
// 맨 위 알림 띠 → 로고·검색 → 메뉴(전체 카테고리 펼침) → 본문 → 바닥글(사업자 정보), 넓은 PC 화면엔 좌우 날개 배너

import Link from 'next/link'
import { ChevronDown, Menu, Search, UserRound } from 'lucide-react'

import { AdLink } from '@/components/platform/ad-link'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { SITE_NAME } from '@/lib/site'
import { getSiteSettings } from '@/lib/site-settings'
import { getLiveBanners, type LiveBanner } from '@/modules/ads/live'

const NAV = [
  { label: '등록제품 허브', href: '/products' },
  { label: '공급사 미니샵', href: '/suppliers' },
  { label: '광고상품', href: '/advertise' },
  { label: '매거진', href: '/magazine' },
  { label: '공급사등록신청', href: '/signup' },
  { label: '고객센터', href: '/support' },
]

function WingBanners({ side, banners }: { side: 'left' | 'right'; banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  return (
    <aside
      className={
        'fixed top-44 z-20 hidden w-[150px] flex-col gap-3 min-[1560px]:flex ' +
        (side === 'left' ? 'left-[calc(50%-576px-170px)]' : 'right-[calc(50%-576px-170px)]')
      }
      aria-label={side === 'left' ? '왼쪽 광고' : '오른쪽 광고'}
    >
      {banners.slice(0, 4).map((b) => (
        <AdLink key={b.id} bannerId={b.id} href={b.link_url} title={b.title} className="block overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image_pc} alt={b.title} className="w-full" loading="lazy" />
        </AdLink>
      ))}
    </aside>
  )
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, wingLeft, wingRight] = await Promise.all([
    getSiteSettings(),
    getPlatformCategories(),
    getLiveBanners('wing_left'),
    getLiveBanners('wing_right'),
  ])
  const shown = visibleCategories(categories)
  const roots = shown.filter((c) => !c.parent_id)
  const childrenOf = (id: string) => shown.filter((c) => c.parent_id === id)

  const footerLines = [
    settings.company_name && `상호 ${settings.company_name}`,
    settings.ceo && `대표 ${settings.ceo}`,
    settings.business_no && `사업자등록번호 ${settings.business_no}`,
    settings.mail_order_no && `통신판매업 ${settings.mail_order_no}`,
    settings.address && `주소 ${settings.address}`,
    settings.phone && `전화 ${settings.phone}`,
    settings.fax && `팩스 ${settings.fax}`,
    settings.email && `이메일 ${settings.email}`,
    settings.privacy_officer && `개인정보보호책임자 ${settings.privacy_officer}`,
  ].filter(Boolean) as string[]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 맨 위 알림 띠 */}
      {settings.notice_enabled && settings.notice_text ? (
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-2 px-4 text-xs sm:text-sm">
            <span className="truncate">{settings.notice_text}</span>
            {settings.notice_url && settings.notice_link_label ? (
              <Link href={settings.notice_url} className="shrink-0 font-semibold underline underline-offset-2">
                {settings.notice_link_label}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        {/* 로고 · 검색 · 로그인 */}
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0 text-lg font-extrabold tracking-tight text-primary sm:text-xl">
            {SITE_NAME}
          </Link>
          <form action="/products" method="GET" className="relative ml-auto hidden w-full max-w-md md:block">
            <input
              type="search"
              name="q"
              placeholder="제품명·모델명·제조사 검색"
              className="h-10 w-full rounded-full border-2 border-primary/70 bg-background px-5 pr-11 text-sm outline-none focus:border-primary"
            />
            <button type="submit" className="absolute top-1/2 right-3 -translate-y-1/2 text-primary" aria-label="검색">
              <Search className="size-5" />
            </button>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-4">
            <Link href="/products" className="flex flex-col items-center px-2 text-[11px] text-muted-foreground hover:text-foreground md:hidden" aria-label="검색">
              <Search className="size-5" />
              검색
            </Link>
            <Link href="/login" className="flex flex-col items-center px-2 text-[11px] text-muted-foreground hover:text-foreground">
              <UserRound className="size-5" />
              공급사 로그인
            </Link>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="border-t border-border">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 text-sm font-medium [scrollbar-width:none] sm:px-6 md:overflow-visible [&::-webkit-scrollbar]:hidden">
            <div className="group relative shrink-0">
              <Link href="/products" className="flex h-11 items-center gap-1.5 px-2 font-semibold hover:text-primary">
                <Menu className="size-4" />
                전체 카테고리
                <ChevronDown className="size-3.5" />
              </Link>
              {/* 펼침 메뉴 (PC) */}
              <div className="invisible absolute top-full left-0 z-40 hidden w-[min(90vw,960px)] grid-cols-4 gap-x-6 gap-y-4 rounded-b-lg border border-border bg-background p-5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 md:grid">
                {roots.map((r) => (
                  <div key={r.id} className="flex flex-col gap-1">
                    <Link href={`/products?${categoryQuery(r)}`} className="text-sm font-semibold hover:text-primary">
                      {r.name}
                    </Link>
                    {childrenOf(r.id)
                      .slice(0, 6)
                      .map((c) => (
                        <Link
                          key={c.id}
                          href={`/products?${categoryQuery(c)}`}
                          className="truncate text-xs font-normal text-muted-foreground hover:text-foreground"
                        >
                          {c.name}
                        </Link>
                      ))}
                    {childrenOf(r.id).length > 6 ? (
                      <Link href={`/products?${categoryQuery(r)}`} className="text-xs font-normal text-primary">
                        더보기 +{childrenOf(r.id).length - 6}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <span className="mx-1 h-4 w-px shrink-0 bg-border" />
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="flex h-11 shrink-0 items-center px-2.5 hover:text-primary">
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <WingBanners side="left" banners={wingLeft} />
      <WingBanners side="right" banners={wingRight} />

      <main className="flex-1">{children}</main>

      <footer className="mt-10 border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-xs text-muted-foreground sm:px-6 md:flex-row md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-base font-extrabold text-primary">{SITE_NAME}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/support" className="font-medium text-foreground hover:underline">
                고객센터
              </Link>
              <Link href="/advertise" className="font-medium text-foreground hover:underline">
                광고 안내
              </Link>
              <Link href="/signup" className="font-medium text-foreground hover:underline">
                공급사 등록신청
              </Link>
            </div>
            {footerLines.length > 0 ? (
              <p className="leading-relaxed">
                {footerLines.map((line, i) => (
                  <span key={i} className="mr-3 inline-block">
                    {line}
                  </span>
                ))}
              </p>
            ) : null}
            <p className="leading-relaxed">
              {SITE_NAME}는 통신판매중개자이며, 개별 거래의 당사자가 아닙니다. 상품 정보, 거래 조건 및 거래에 대한 책임은
              해당 공급사에 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-1 md:text-right">
            <p className="text-sm font-semibold text-foreground">고객센터</p>
            {settings.phone ? (
              <a href={`tel:${settings.phone.replace(/[^\d]/g, '')}`} className="text-2xl font-bold text-foreground">
                {settings.phone}
              </a>
            ) : null}
            {settings.cs_hours ? <p>{settings.cs_hours}</p> : null}
            {settings.email ? <p>{settings.email}</p> : null}
          </div>
        </div>
      </footer>
    </div>
  )
}
