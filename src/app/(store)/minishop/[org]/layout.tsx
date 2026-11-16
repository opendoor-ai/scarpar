import { minishopUrl } from '@/lib/domains'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { env } from '@/lib/env'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { SITE_NAME } from '@/lib/site'
import { getSiteConfig } from '@/modules/site-config/get'
import { fillTemplate } from '@/modules/site-config/schemas'
import { getAnonClient } from '@/lib/supabase/anon'
import type { LayoutProps } from '@/lib/types'
import type { Menu } from '@/types/db'

import { AnnouncementBar } from '@/components/store/announcement-bar'
import { CartProvider } from '@/components/store/cart-context'
import { getStoreOrg } from '@/components/store/get-store-org'
import { StoreFooter } from '@/components/store/store-footer'
import { StoreHeader } from '@/components/store/store-header'
import { KakaoFloat } from '@/components/store/kakao-float'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string }>
}): Promise<Metadata> {
  const { org: orgSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) return {}

  // 관리자 → SEO → 미니샵 문구 틀
  const { seo } = await getSiteConfig()
  const vars = { 공급사: org.name, 취급품목: (org.item_keywords ?? []).slice(0, 8).join(', '), 주소: org.address, 사이트명: SITE_NAME }
  const homeTitle = fillTemplate(seo.minishopTitle, vars) || org.name
  const description =
    fillTemplate(seo.minishopDescription, vars).slice(0, 200) ||
    `${org.name} — 산업기계·중고기계 제품 정보와 공급사 연락처. ${SITE_NAME}에서 바로 전화·문자로 문의하세요.`
  return {
    title: { default: `${homeTitle} | ${SITE_NAME}`, template: `%s · ${org.name}` },
    description,
    alternates: { canonical: minishopUrl(org.slug) },
    openGraph: { title: org.name, description, siteName: SITE_NAME, locale: 'ko_KR', type: 'website' },
  }
}

export default async function StoreLayout({ params, children }: LayoutProps<{ org: string }>) {
  const { org: orgSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)

  const supabase = getAnonClient()
  const { data: menuRows } = await supabase
    .from('menus')
    .select('handle, items')
    .eq('org_id', org.id)
    .in('handle', ['header', 'footer'])

  const menus = (menuRows ?? []) as Pick<Menu, 'handle' | 'items'>[]
  const headerItems = menus.find((m) => m.handle === 'header')?.items ?? []
  const footerItems = menus.find((m) => m.handle === 'footer')?.items ?? []

  const announcement = settingStr(settings, 'storefront.announcement')
  const kakaoChannelUrl = settingStr(settings, 'storefront.kakao_channel_url')
  const primaryColor = settingStr(settings, 'storefront.primary_color')

  return (
    <CartProvider orgSlug={org.slug}>
      <div
        className="flex min-h-dvh flex-col bg-background text-foreground"
        style={primaryColor ? ({ '--primary': primaryColor } as CSSProperties) : undefined}
      >
        <AnnouncementBar text={announcement} />
        <StoreHeader org={org} menuItems={headerItems} />
        <main className="flex-1">{children}</main>
        <StoreFooter org={org} menuItems={footerItems} />
        <KakaoFloat url={kakaoChannelUrl} />
      </div>
    </CartProvider>
  )
}
