// 플랫폼(전자동기계광고) 공통 화면 틀 — 메인·통합 제품·공급사·매거진·고객센터 등
// 맨 위 알림 띠 → 로고·검색 → 메뉴(전체 카테고리 펼침) → 본문 → 바닥글(사업자 정보), 넓은 PC 화면엔 좌우 날개 배너

import Link from 'next/link'
import { Menu, Search, UserRound } from 'lucide-react'

import { AdLink } from '@/components/platform/ad-link'
import { BannerHtml } from '@/components/platform/banner-html'
import { CategoryMegaMenu, type MegaRoot } from '@/components/platform/category-mega-menu'
import { HeaderSearch } from '@/components/platform/header-search'
import { MobileBottomNav, OpenPanelButton } from '@/components/platform/mobile-bottom-nav'
import { TopBar } from '@/components/platform/top-bar'
import { inlineHtml } from '@/lib/inline-html'
import { getPlatformCategoryCounts } from '@/lib/platform-category-counts'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { safeJsonLd } from '@/lib/default-faq'
import { env } from '@/lib/env'
import { mediaUrl } from '@/lib/media-url'
import { SITE_NAME } from '@/lib/site'
import { getSiteConfig } from '@/modules/site-config/get'
import { activeChannelUrls } from '@/modules/site-config/schemas'
import { getSiteSettings } from '@/lib/site-settings'
import { getLiveBanners, renderGroupHtml, type LiveBanner } from '@/modules/ads/live'

const NAV = [
  { label: '등록제품 허브', href: '/products' },
  { label: '구매문의', href: '/requests' },
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
        <AdLink
          key={b.id}
          bannerId={b.id}
          href={b.link_url}
          title={b.title}
          className="block overflow-hidden rounded-md border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image_pc} alt={b.title} className="w-full" loading="lazy" />
        </AdLink>
      ))}
    </aside>
  )
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, wingLeft, wingRight, topBars, logos, menuBanners, quickMenus, siteConfig] = await Promise.all([
    getSiteSettings(),
    getPlatformCategories(),
    getLiveBanners('wing_left'),
    getLiveBanners('wing_right'),
    getLiveBanners('top_bar'),
    getLiveBanners('logo'),
    getLiveBanners('menu_banner'),
    getLiveBanners('quick_menu'),
    getSiteConfig(),
  ])
  const categoryCounts = await getPlatformCategoryCounts()
  const [topBarHtml, quickHtml] = await Promise.all([
    renderGroupHtml('top_bar', topBars),
    renderGroupHtml('quick_menu', quickMenus),
  ])
  const logo = logos.find((b) => b.image_pc)
  const shown = visibleCategories(categories)
  const roots = shown.filter((c) => !c.parent_id)
  const childrenOf = (id: string) => shown.filter((c) => c.parent_id === id)
  // 전체 카테고리 펼침 메뉴 데이터 (제품 수 포함)
  const megaRoots: MegaRoot[] = roots.map((r) => {
    const children = childrenOf(r.id).map((c) => ({
      id: c.id,
      name: c.name,
      href: `/products?${categoryQuery(c)}`,
      count: categoryCounts[c.id] ?? 0,
    }))
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      href: `/products?${categoryQuery(r)}`,
      icon: r.icon_image ? mediaUrl(r.icon_image) : null,
      count: (categoryCounts[r.id] ?? 0) + children.reduce((n, c) => n + c.count, 0),
      children,
    }
  })

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

  // 검색엔진·AI용 회사·사이트 정보 (Organization + WebSite 검색창)
  const base = env.APP_URL.replace(/\/+$/, '')
  const sameAs = activeChannelUrls(siteConfig.seo.channels)
  const orgLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: SITE_NAME,
        url: base,
        ...(logo?.image_pc ? { logo: logo.image_pc } : siteConfig.seo.favicon ? { logo: mediaUrl(siteConfig.seo.favicon) } : {}),
        ...(settings.company_name ? { legalName: settings.company_name } : {}),
        ...(settings.email ? { email: settings.email } : {}),
        ...(settings.phone
          ? { contactPoint: { '@type': 'ContactPoint', telephone: settings.phone, contactType: 'customer service', areaServed: 'KR', availableLanguage: 'Korean' } }
          : {}),
        ...(settings.address ? { address: { '@type': 'PostalAddress', streetAddress: settings.address, addressCountry: 'KR' } } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(siteConfig.seo.aiSummary ? { description: siteConfig.seo.aiSummary } : { description: siteConfig.seo.description }),
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: SITE_NAME,
        inLanguage: 'ko-KR',
        publisher: { '@id': `${base}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${base}/products?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgLd) }} />
      {/* 맨 위 띠: 배너 관리 [상단] 탑배너가 있으면 그걸, 없으면 사이트 설정 알림 */}
      {topBarHtml ? (
        <BannerHtml html={topBarHtml} />
      ) : topBars.length > 0 ? (
        <TopBar
          items={topBars.map((b) => ({
            id: b.id,
            html: inlineHtml(b.texts[0]?.text || b.title),
            color: b.colors[0] || '',
            bg: b.colors[1] || '',
            icon: b.image_pc,
            link: b.link_url && b.link_url !== '#none' ? b.link_url : '',
            target: b.link_target,
          }))}
        />
      ) : settings.notice_enabled && settings.notice_text ? (
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
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.image_pc}
                alt={logo.title || SITE_NAME}
                className="h-9 w-auto max-w-[180px] object-contain sm:h-10"
              />
            ) : (
              SITE_NAME
            )}
          </Link>
            <HeaderSearch
              promos={siteConfig.search.promoEnabled ? siteConfig.search.promos : []}
              mode={siteConfig.search.promoMode}
              popular={siteConfig.search.popular
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean)}
            />
          <div className="ml-auto flex items-center gap-1 md:ml-4">
            {/* 모바일: 검색 · 전체 메뉴 (하단 바와 같은 창을 열어요) */}
            <OpenPanelButton panel="search" label="검색" className="rounded-full p-2 text-foreground md:hidden">
              <Search className="size-6" />
            </OpenPanelButton>
            <OpenPanelButton panel="category" label="전체 카테고리 메뉴" className="rounded-full p-2 text-foreground md:hidden">
              <Menu className="size-6" />
            </OpenPanelButton>
            <Link
              href="/login"
              className="hidden flex-col items-center px-2 text-[11px] text-muted-foreground hover:text-foreground md:flex"
            >
              <UserRound className="size-5" />
              공급사 로그인
            </Link>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="border-t border-border">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 text-sm font-medium [scrollbar-width:none] sm:px-6 md:overflow-visible [&::-webkit-scrollbar]:hidden">
            <CategoryMegaMenu
              roots={megaRoots}
              banner={
                menuBanners.length > 0
                  ? menuBanners.slice(0, 2).map((b) => (
                      <AdLink
                        key={b.id}
                        bannerId={b.id}
                        href={b.link_url}
                        title={b.title}
                        className="group/mb block overflow-hidden rounded-lg border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.image_pc} alt={b.title} className="aspect-[25/23] w-full object-cover" loading="lazy" />
                        {b.subtitle ? (
                          <span className="block truncate px-3 py-2 text-xs font-medium group-hover/mb:text-primary">{b.subtitle}</span>
                        ) : null}
                      </AdLink>
                    ))
                  : undefined
              }
            />
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

      {/* 모바일은 하단 바 높이만큼 아래 여백 */}
      <main className="flex-1 pb-4 md:pb-0">{children}</main>

      {/* [공통] 퀵메뉴 — 오른쪽 아래 바로가기 */}
      {quickHtml ? (
        <BannerHtml html={quickHtml} />
      ) : quickMenus.length > 0 ? (
        <nav className="fixed right-3 bottom-24 z-30 flex flex-col gap-2 md:right-5 md:bottom-8" aria-label="바로가기">
          {quickMenus.slice(0, 6).map((b) => (
            <AdLink
              key={b.id}
              bannerId={b.id}
              href={b.link_url}
              title={b.subtitle || b.title}
              className="group/q relative flex size-12 items-center justify-center rounded-full border border-border bg-background shadow-md transition-transform hover:scale-105"
            >
              {b.image_pc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image_pc} alt={b.subtitle || b.title} className="size-full rounded-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold">{(b.subtitle || b.title).slice(0, 2)}</span>
              )}
              <span className="pointer-events-none absolute right-14 hidden rounded bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background group-hover/q:block">
                {b.subtitle || b.title}
              </span>
            </AdLink>
          ))}
        </nav>
      ) : null}

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
              {SITE_NAME}는 통신판매중개자이며, 개별 거래의 당사자가 아닙니다. 상품 정보, 거래 조건 및 거래에 대한
              책임은 해당 공급사에 있습니다.
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
      <MobileBottomNav
        categories={roots.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          href: `/products?${categoryQuery(r)}`,
          iconImage: r.icon_image ? mediaUrl(r.icon_image) : null,
          children: childrenOf(r.id).map((c) => ({ id: c.id, name: c.name, href: `/products?${categoryQuery(c)}` })),
        }))}
        popular={siteConfig.search.popular
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 10)}
      />
    </div>
  )
}
