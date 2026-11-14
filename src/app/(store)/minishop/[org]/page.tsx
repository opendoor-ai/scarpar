import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Phone } from 'lucide-react'

import { type Lang } from '@/lib/i18n'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { CmsBlock, CmsPage } from '@/types/db'

import { RenderBlocks } from '@/components/store/blocks/render-blocks'
import { SellerInfo } from '@/components/store/seller-info'
import { getStoreOrg } from '@/components/store/get-store-org'
import { OrgCategorySection } from '@/components/store/org-category-section'
import { storePath } from '@/components/store/store-links'
import { formatKrPhone, phoneDigits } from '@/lib/phone'
import { mediaUrl } from '@/lib/media-url'
import { BannerCarousel } from '@/modules/ads/components/banner-carousel'
import type { LiveBanner } from '@/modules/ads/live'

export const dynamic = 'force-dynamic'

export default async function StoreHomePage({ params }: PageProps<{ org: string }>) {
  const { org: orgSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  const supabase = getAnonClient()
  const [{ data: homePageRow }, { data: bannerRows, error: bannerError }] = await Promise.all([
    supabase
      .from('cms_pages')
      .select('id, blocks')
      .eq('org_id', org.id)
      .eq('type', 'home')
      .eq('status', 'published')
      .maybeSingle(),
    // 미니샵 배너: 보안 규칙이 "켜져 있고 기간 안인 것"만 돌려줌
    supabase
      .from('store_banners')
      .select('id, title, link_url, image_pc, image_mobile')
      .eq('org_id', org.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10),
  ])
  if (bannerError) console.error('[store home] banners read failed:', bannerError.message)
  const banners: Pick<LiveBanner, 'id' | 'title' | 'link_url' | 'image_pc' | 'image_mobile'>[] = (
    (bannerRows ?? []) as {
      id: string
      title: string
      link_url: string | null
      image_pc: string
      image_mobile: string | null
    }[]
  ).map((b) => ({
    id: b.id,
    title: b.title,
    link_url: b.link_url ?? '',
    image_pc: mediaUrl(b.image_pc),
    image_mobile: mediaUrl(b.image_mobile || b.image_pc),
  }))
  const bannerSection =
    banners.length > 0 ? (
      <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <BannerCarousel banners={banners} track={false} label={false} />
      </section>
    ) : null

  if (homePageRow) {
    const page = homePageRow as Pick<CmsPage, 'id' | 'blocks'>
    return (
      <>
        {bannerSection}
        <OrgCategorySection orgId={org.id} orgSlug={org.slug} />
        <RenderBlocks blocks={page.blocks} ctx={{ org, lang }} />
        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <SellerInfo org={org} place="shop" />
        </section>
      </>
    )
  }

  // 아직 게시한 홈 페이지가 없으면: 기본 미니샵 첫 화면 (대표 이미지/배너 → 추천·최신 제품 → 회사 소개 → 전화 문의)
  const digits = org.phone ? phoneDigits(org.phone) : ''
  const keywords = org.item_keywords ?? []
  const defaultBlocks: CmsBlock[] = [
    { _key: 'featured', _type: 'productGrid', title: '추천 제품', mode: 'featured', limit: 8 },
    { _key: 'latest', _type: 'productGrid', title: '최신 등록 제품', mode: 'latest', limit: 12 },
    { _key: 'intro', _type: 'companyIntro', heading: `${org.name} 소개`, body: '', stats: [], showContact: true },
    {
      _key: 'cta',
      _type: 'inquiryCta',
      heading: '필요한 기계, 전화 한 통으로 상담하세요',
      body: '제품 사양·가격·납기 모두 친절하게 안내해 드립니다.',
      showSms: true,
    },
  ]

  return (
    <>
      {bannerSection ?? (
        <section className="border-b border-border bg-gradient-to-b from-primary/10 to-background">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:px-6 sm:py-16">
            <h1 className="text-2xl font-bold sm:text-4xl">{org.name}</h1>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 8).map((k) => (
                  <span key={k} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
                    {k}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground sm:text-base">
              산업기계·중고기계 제품을 확인하고 바로 전화·문자로 문의하세요.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={storePath(org.slug, '/products')}
                className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                전체 제품 보기
              </Link>
              {digits ? (
                <a
                  href={`tel:${digits}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-background px-5 text-sm font-semibold hover:bg-accent"
                >
                  <Phone className="size-4" />
                  {formatKrPhone(org.phone as string)}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      )}
      <OrgCategorySection orgId={org.id} orgSlug={org.slug} />
      <RenderBlocks blocks={defaultBlocks} ctx={{ org, lang }} />
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <SellerInfo org={org} place="shop" />
      </section>
    </>
  )
}
