// 전자동기계광고 메인 화면 (jadong.co.kr 구성)
// 메인 배너(3장씩) → 카테고리 아이콘 → 스마트 허브 → 추천(AD) 제품 → 와이드 허브 → 파트너 허브 → 플러스 허브
// → SHORTS → 등록제품 허브 → 블로그와 함께하는 제품 → 구매문의 → 현장에서 많이 찾는 제품 → 큰 이미지 광고 → 전체제품 허브
// → MAGAZINE → 입점 안내 → 함께하는 공급사(로고 띠). 광고·콘텐츠가 없는 칸은 보이지 않아요.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Phone } from 'lucide-react'

import { AdLink } from '@/components/platform/ad-link'
import { AllProductsHub } from '@/components/platform/all-products-hub'
import { BannerHtml } from '@/components/platform/banner-html'
import { CategoryIcon } from '@/components/platform/category-icon'
import { BlogProductsHub, type BlogHubItem } from '@/components/platform/blog-products-hub'
import { HeroSliderB, type HeroSlideB } from '@/components/platform/hero-slider-b'
import { MainPopup } from '@/components/platform/main-popup'
import { HScroller } from '@/components/platform/h-scroller'
import { PartnerHub, PlusHub, SmartHub, WideHub } from '@/components/platform/hubs'
import { PartnerLogos, type PartnerItem } from '@/components/platform/partner-logos'
import { PopularTabs } from '@/components/platform/popular-tabs'
import { ShortsRow } from '@/components/platform/shorts-row'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/store/product-card'
import { embedHtml } from '@/lib/embed-html'
import { env } from '@/lib/env'
import { inlineHtml } from '@/lib/inline-html'
import { mediaUrl } from '@/lib/media-url'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { inquiryTop, realtimeTop, todayTopViewed } from '@/lib/platform-popular'
import { fetchLatestPlatformCards, fetchPlatformCardsByIds, fetchPlatformFeed, type PlatformProductCard } from '@/lib/platform-products'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { getSiteSettings } from '@/lib/site-settings'
import { getAnonClient } from '@/lib/supabase/anon'
import {
  getCustomGroupHtml,
  getLiveBanners,
  getLivePromotedProductIds,
  renderGroupHtml,
  type LiveBanner,
} from '@/modules/ads/live'
import { youtubeId, youtubeThumb } from '@/modules/contents/schemas'
import { getSiteConfig } from '@/modules/site-config/get'
import { latestPublicRequests } from '@/modules/purchase-requests/data'
import { RequestStrip } from '@/modules/purchase-requests/components/request-strip'

export const dynamic = 'force-dynamic'

// 메인 화면 검색 정보 — 관리자 → 사이트 설정 → 검색엔진 최적화(SEO)의 사이트 이름·안내
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSiteConfig()
  const title = seo.title || `${SITE_NAME} | 산업기계 중고기계 매매 직거래·광고 플랫폼`
  const description = seo.description || SITE_DESCRIPTION
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${env.APP_URL.replace(/\/+$/, '')}/` },
    openGraph: { title, description, type: 'website', locale: 'ko_KR' },
  }
}


interface ContentRow {
  id: string
  kind: 'short' | 'blog' | 'magazine'
  title: string
  url: string | null
  thumbnail: string | null
  summary: string | null
  product_id: string | null
  published_at: string
  author?: string | null
  product_ids?: string[] | null
}

/** 블로그에 연결한 제품 id들 (0030 product_ids, 예전 product_id) */
function blogProductIds(b: ContentRow): string[] {
  const list = (b.product_ids ?? []).filter(Boolean)
  return list.length ? list.slice(0, 3) : b.product_id ? [b.product_id] : []
}

// ------------------------------------------------------------------ 작은 화면 조각

function Hub({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: React.ReactNode
  description?: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {linkLabel ?? '더보기'}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function AdImage({ b, className }: { b: LiveBanner; className?: string }) {
  return (
    <picture>
      <source media="(max-width: 639px)" srcSet={b.image_mobile} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.image_pc} alt={b.title} loading="lazy" className={className} />
    </picture>
  )
}

function ProductGrid({ items }: { items: PlatformProductCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <ProductCard key={i.card.id} orgSlug={i.orgSlug} product={i.card} supplierName={i.orgName} />
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ 화면

export default async function HomePage() {
  const supabase = getAnonClient()

  const [
    settings,
    categories,
    mainBanners,
    mainBBanners,
    smart,
    wide,
    partner,
    plus,
    imageAds,
    popups,
    autoScroll,
    customGroups,
    promotedIds,
    latest,
    allFeed,
    contentsRes,
    todayIds,
    realtimeIds,
    inquiryIds,
    featuredRes,
  ] = await Promise.all([
    getSiteSettings(),
    getPlatformCategories(),
    getLiveBanners('main'),
    getLiveBanners('main_b'),
    getLiveBanners('smart'),
    getLiveBanners('wide'),
    getLiveBanners('partner'),
    getLiveBanners('plus'),
    getLiveBanners('image'),
    getLiveBanners('popup'),
    getLiveBanners('auto_scroll'),
    getCustomGroupHtml(),
    getLivePromotedProductIds('main'),
    fetchLatestPlatformCards(16),
    fetchPlatformFeed(null, 0, 15),
    supabase
      .from('site_contents')
      .select('*') // 0030 전후 모두 (author·product_ids)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })
      .limit(60),
    todayTopViewed(10),
    realtimeTop(10),
    inquiryTop(10),
    supabase
      .from('products')
      .select('id, org:orgs!inner(id)')
      .eq('status', 'active')
      .eq('is_featured', true)
      .eq('org.is_active', true)
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const contents = (contentsRes.data ?? []) as ContentRow[]
  const shorts = contents
    .filter((c) => c.kind === 'short')
    .flatMap((c) => {
      const vid = youtubeId(c.url)
      return vid
        ? [{ id: c.id, title: c.title, videoId: vid, thumb: c.thumbnail ? mediaUrl(c.thumbnail) : youtubeThumb(vid) }]
        : []
    })
  const blogs = contents.filter((c) => c.kind === 'blog').slice(0, 12)
  const magazines = contents.filter((c) => c.kind === 'magazine').slice(0, 3)

  const specialIds = [...promotedIds, ...((featuredRes.data ?? []) as { id: string }[]).map((r) => r.id)]
  const [promoted, todayCards, realtimeCards, inquiryCards, specialCards, blogProducts, requests] = await Promise.all([
    fetchPlatformCardsByIds(promotedIds),
    fetchPlatformCardsByIds(todayIds),
    fetchPlatformCardsByIds(realtimeIds),
    fetchPlatformCardsByIds(inquiryIds),
    fetchPlatformCardsByIds([...new Set(specialIds)].slice(0, 10)),
    fetchPlatformCardsByIds([...new Set(blogs.flatMap((b) => blogProductIds(b)))]),
    latestPublicRequests(12),
  ])
  const blogProductById = new Map(blogProducts.map((p) => [p.card.id, p]))

  // 블로그마다 제품 3개 — 모자라면 첫 제품과 같은 공급사의 최근 제품으로 채움
  const blogItems: BlogHubItem[] = []
  {
    const firstIds = blogs.map((b) => blogProductIds(b)[0]).filter(Boolean) as string[]
    const { data: orgRows } = firstIds.length
      ? await getAnonClient().from('products').select('id, org_id').in('id', firstIds)
      : { data: [] }
    const orgOf = new Map(((orgRows ?? []) as { id: string; org_id: string }[]).map((r) => [r.id, r.org_id]))
    const fillOrgs = [...new Set([...orgOf.values()])]
    const fillByOrg = new Map(await Promise.all(fillOrgs.map(async (o) => [o, await fetchLatestPlatformCards(6, o)] as const)))
    for (const b of blogs) {
      const ids = blogProductIds(b)
      const cards = ids.map((id) => blogProductById.get(id)).filter(Boolean) as PlatformProductCard[]
      const org = ids[0] ? orgOf.get(ids[0]) : undefined
      for (const c of (org ? fillByOrg.get(org) : undefined) ?? []) {
        if (cards.length >= 3) break
        if (!cards.some((x) => x.card.id === c.card.id)) cards.push(c)
      }
      blogItems.push({
        id: b.id,
        title: b.title,
        url: b.url ?? '#',
        thumb: b.thumbnail ? mediaUrl(b.thumbnail) : null,
        author: b.author ?? null,
        products: cards.slice(0, 3).map((c) => ({
          id: c.card.id,
          href: `/minishop/${c.orgSlug}/products/${c.card.product_no}`,
          name: c.card.name,
          image: c.card.image,
          price: c.card.price,
          compareAt: c.card.compare_at_price ?? null,
          supplier: c.orgName,
        })),
      })
    }
  }

  // 함께하는 공급사: 배너(광고) 먼저 + 로고를 올린 입점 공급사 자동 연동
  const partnerItems: PartnerItem[] = autoScroll
    .filter((b) => b.image_pc)
    .map((b) => ({
      key: `b-${b.id}`,
      bannerId: b.id,
      href: b.link_url,
      image: b.image_pc,
      name: b.texts?.[0]?.text?.trim() || b.subtitle?.trim() || b.title,
      sub: b.texts?.[1]?.text?.trim() || '',
    }))
  {
    const anon = getAnonClient()
    let res = await anon.from('orgs').select('id, name, slug, logo_path, name_en').eq('is_active', true).not('logo_path', 'is', null).order('created_at').limit(120)
    if (res.error) res = (await anon.from('orgs').select('id, name, slug, logo_path').eq('is_active', true).not('logo_path', 'is', null).order('created_at').limit(120)) as typeof res
    for (const o of (res.data ?? []) as { id: string; name: string; slug: string; logo_path: string; name_en?: string | null }[]) {
      partnerItems.push({ key: `o-${o.id}`, href: `/minishop/${o.slug}`, image: mediaUrl(o.logo_path), name: o.name, sub: o.name_en ?? '' })
    }
  }

  // 메인 슬라이드: 배너 관리에서 켜 둔 그룹을 씀 (A·B는 한쪽을 켜면 다른 쪽이 꺼짐)
  // B타입 그룹이 꺼져 있거나 배너가 없으면 빈 목록이라 A타입이 보여요
  const useB = mainBBanners.length > 0
  const tMainB = useB ? await renderGroupHtml('main_b', mainBBanners) : null
  const style = (
    t?: { text: string; color?: string; pc_size?: number | null; m_size?: number | null; bold?: boolean },
    color?: string,
  ) =>
    t && t.text.trim()
      ? {
          html: inlineHtml(t.text),
          color: color || t.color || '',
          pc: t.pc_size ?? null,
          m: t.m_size ?? null,
          bold: Boolean(t.bold),
        }
      : null
  const slidesB: HeroSlideB[] = mainBBanners.map((b) => {
    const [alignPc, alignM] = (b.texts[0]?.text || 'left-center')
      .split('|')
      .map((v) => v.replace(/<[^>]+>/g, '').trim())
    const video = embedHtml(b.html)
    const label = (b.texts[3]?.text ?? '').replace(/<[^>]+>/g, '').trim()
    return {
      id: b.id,
      title: b.title,
      pc: b.image_pc,
      mobile: b.image_mobile,
      link: b.link_url && b.link_url !== '#none' && b.link_url !== '#' ? b.link_url : '',
      target: b.link_target,
      alignPc: alignPc || 'left-center',
      alignM: alignM || alignPc || 'left-center',
      heading: video ? null : style(b.texts[1], b.colors[0]),
      desc: style(b.texts[2], b.colors[1]),
      button: label ? { label, color: b.colors[2] || '', bg: b.colors[3] || '' } : null,
      video,
      ratio: video ? (b.texts[1]?.text ?? '').replace(/<[^>]+>/g, '').trim() || '16/9' : '',
    }
  })

  // 배너 코드(템플릿)가 있는 그룹은 그 코드로 그림
  const [tMain, tSmart, tWide, tPartner, tPlus, tImage, tAuto] = await Promise.all([
    renderGroupHtml('main', mainBanners),
    renderGroupHtml('smart', smart),
    renderGroupHtml('wide', wide),
    renderGroupHtml('partner', partner),
    renderGroupHtml('plus', plus),
    renderGroupHtml('image', imageAds),
    renderGroupHtml('auto_scroll', autoScroll),
  ])


  const shown = visibleCategories(categories)
  const roots = shown.filter((c) => !c.parent_id && c.show_on_main)

  return (
    <>
      {/* 메인 슬라이드 B타입 — 화면 가득 */}
      {useB ? tMainB ? <BannerHtml html={tMainB} /> : <HeroSliderB slides={slidesB} /> : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-6 sm:px-6">
        {/* 메인 팝업 */}
        {popups.some((p) => p.image_pc) ? (
          <MainPopup
            items={popups
              .filter((p) => p.image_pc)
              .map((p) => ({
                id: p.id,
                title: p.title,
                image: p.image_pc,
                link: p.link_url && p.link_url !== '#none' ? p.link_url : '',
                target: p.link_target,
              }))}
          />
        ) : null}

        {/* 1. 메인 배너 — A타입: 3장씩 (B타입이면 위에서 화면 가득 슬라이드로 대신) */}
        {useB ? null : tMain ? (
          <BannerHtml html={tMain} />
        ) : mainBanners.length > 0 ? (
          <HScroller autoPlayMs={5000} label="메인 배너">
            {mainBanners.map((b) => (
              <AdLink
                key={b.id}
                bannerId={b.id}
                href={b.link_url}
                title={b.title}
                className="group relative block w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
              >
                <AdImage
                  b={b}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  광고
                </span>
                {b.subtitle || b.phone ? (
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10 text-white">
                    {b.subtitle ? <span className="text-base font-bold drop-shadow">{b.subtitle}</span> : null}
                    {b.phone ? (
                      <span className="inline-flex items-center gap-1 text-sm opacity-90">
                        <Phone className="size-3.5" />
                        {b.phone}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </AdLink>
            ))}
          </HScroller>
        ) : null}

        {/* 2. 카테고리 동그라미 아이콘 */}
        {roots.length > 0 ? (
          <section aria-label="기계 카테고리">
            {/* 스크롤 없이 바둑판 — 모바일 4칸 · 태블릿 6칸 · PC 한 줄 (마지막 칸은 전체 카테고리) */}
            <div className="grid grid-cols-4 gap-x-2.5 gap-y-5 sm:grid-cols-6 lg:grid-cols-12 lg:gap-x-3">
              {roots.map((c) => (
                <Link key={c.id} href={`/products?${categoryQuery(c)}`} className="group flex flex-col items-center gap-2 text-center">
                  <CategoryIcon
                    slug={c.slug}
                    image={c.icon_image ? mediaUrl(c.icon_image) : null}
                    className="w-full max-w-[88px] transition-transform group-hover:-translate-y-0.5"
                  />
                  <span className="line-clamp-3 text-[13px] leading-tight font-medium break-keep sm:text-xs">{c.name.replaceAll('·', '·​')}</span>
                </Link>
              ))}
              <Link href="/products" className="group flex flex-col items-center gap-2 text-center">
                <CategoryIcon slug="all" className="w-full max-w-[88px] transition-transform group-hover:-translate-y-0.5" />
                <span className="text-[13px] leading-tight font-medium sm:text-xs">전체 카테고리</span>
              </Link>
            </div>
          </section>
        ) : null}


        {/* 3. 스마트 허브 — 4칸 카드 */}
        {tSmart ? <BannerHtml html={tSmart} /> : <SmartHub banners={smart} />}

        {/* 추천(AD) 제품 — 유료 상단 노출 */}
        {promoted.length > 0 ? (
          <Hub title="추천 제품" description="전자동이 추천하는 광고 제품이에요.">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
              <ProductGrid items={promoted} />
            </div>
          </Hub>
        ) : null}

        {/* 4. 와이드 허브 */}
        {tWide ? <BannerHtml html={tWide} /> : <WideHub banners={wide} />}

        {/* 5. 파트너 허브 — 공급사 + 대표 제품 */}
        {tPartner ? <BannerHtml html={tPartner} /> : <PartnerHub banners={partner} />}

        {/* 6. 플러스 허브 — 2칸 */}
        {tPlus ? <BannerHtml html={tPlus} /> : <PlusHub banners={plus} />}

        {/* 7. SHORTS */}
        {shorts.length > 0 ? (
          <Hub title="SHORTS" description="쇼츠로 함께 봐요! 👀 누르면 소리와 함께 재생돼요.">
            <ShortsRow items={shorts} />
          </Hub>
        ) : null}

        {/* 8. 등록제품 허브 — 슬라이드 */}
        {latest.length > 0 ? (
          <Hub title="등록제품 허브" description="지금 새로 등록된 제품을 확인해 보세요." href="/products">
            <HScroller label="등록제품">
              {latest.map((i) => (
                <div key={i.card.id} className="w-[45%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-3rem)/5)]">
                  <ProductCard orgSlug={i.orgSlug} product={i.card} supplierName={i.orgName} />
                </div>
              ))}
            </HScroller>
          </Hub>
        ) : null}

        {/* 9. 인기 기계 블로그와 함께 찾는 제품 */}
        {blogItems.length > 0 ? (
          <Hub
            title={
              <>
                인기 <span className="text-primary">기계</span> 블로그와 함께 찾는 제품
              </>
            }
            description="기계 분야에서 많이 읽히는 블로그 글과 함께 보는 제품이에요."
          >
            <BlogProductsHub items={blogItems} />
          </Hub>
        ) : null}

        {/* 구매문의 — 고객이 찾는 제품 */}
        <RequestStrip items={requests} />

        {/* 10. 현장에서 많이 찾는 제품 모음 */}
        <Hub title="현장에서 많이 찾는 제품 모음" description="고객들이 실제로 보고 문의한 기록으로 매일 바뀌어요.">
          <PopularTabs
            tabs={[
              { key: 'today', label: '오늘주목', description: '오늘 가장 많이 본 제품이에요.', items: todayCards },
              {
                key: 'realtime',
                label: '실시간픽',
                description: '최근 3시간 동안 조회·문의가 많은 제품이에요.',
                items: realtimeCards,
              },
              {
                key: 'hot',
                label: '거래핫픽',
                description: '최근 30일 전화·문자·Q&A 문의가 많은 제품이에요.',
                items: inquiryCards,
              },
              {
                key: 'special',
                label: '스페셜픽',
                description: '전자동 추천 제품과 공급사 추천 제품이에요.',
                items: specialCards,
              },
            ]}
          />
        </Hub>

        {/* 직접 만든 배너 그룹 (배너 코드) */}
        {customGroups.map((g) => (
          <BannerHtml key={g.code} html={g.html} />
        ))}

        {/* 11. 큰 이미지 광고 */}
        {tImage ? (
          <BannerHtml html={tImage} />
        ) : imageAds.length > 0 ? (
          <section aria-label="공급사 광고" className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {imageAds.slice(0, 6).map((b) => (
              <AdLink
                key={b.id}
                bannerId={b.id}
                href={b.link_url}
                title={b.title}
                className="relative block overflow-hidden rounded-xl border border-border"
              >
                <AdImage b={b} className="w-full" />
                <span className="absolute top-3 left-3 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  광고
                </span>
              </AdLink>
            ))}
          </section>
        ) : null}

        {/* 12. 전체제품 허브 — 분류 탭 · 5×3 · 더보기 */}
        <Hub title="전체제품 허브" description="모든 공급사의 산업기계·중고기계를 분류별로 한눈에 보세요." href="/products" linkLabel="전체 보기">
          <AllProductsHub
            initial={allFeed.items}
            initialHasMore={allFeed.hasMore}
            tabs={roots.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              icon: c.icon_image ? mediaUrl(c.icon_image) : null,
              href: `/products?${categoryQuery(c)}`,
            }))}
          />
        </Hub>

        {/* 13. MAGAZINE */}
        {magazines.length > 0 ? (
          <Hub title="MAGAZINE" description="기계 업계 소식과 정보" href="/magazine">
            <div className="grid gap-4 md:grid-cols-3">
              {magazines.map((m) => (
                <Link key={m.id} href={`/magazine/${m.id}`} className="group flex flex-col gap-2">
                  <span className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                    {m.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(m.thumbnail)}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </span>
                  <span className="line-clamp-2 font-semibold group-hover:underline">{m.title}</span>
                  {m.summary ? <span className="line-clamp-2 text-sm text-muted-foreground">{m.summary}</span> : null}
                </Link>
              ))}
            </div>
          </Hub>
        ) : null}

        {/* 입점·광고 안내 */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-lg font-bold">기계를 판매하시나요?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              공급사로 입점하면 나만의 미니샵이 생기고, 제품을 올려 전국 고객의 문의를 받을 수 있어요.
            </p>
            <div className="mt-auto pt-2">
              <Button asChild>
                <Link href="/signup">공급사 입점 신청</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">광고로 더 많은 고객에게</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              메인 배너, 스마트·와이드·파트너·플러스 허브, 상단 노출 등 다양한 광고 자리가 있어요.
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline">
                <Link href="/advertise">광고상품 보기</Link>
              </Button>
              {settings.phone ? (
                <Button asChild variant="outline">
                  <a href={`tel:${settings.phone.replace(/[^\d]/g, '')}`}>
                    <Phone className="size-4" />
                    광고 문의 {settings.phone}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {/* 함께하는 공급사 — 바닥글 바로 위, 끊김 없이 흐르는 로고 카드 (배너 관리 → [메인] 오토 스크롤 배너) */}
      {tAuto ? <BannerHtml html={tAuto} /> : <PartnerLogos items={partnerItems} />}
    </>
  )
}
