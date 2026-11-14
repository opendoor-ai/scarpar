// 전자동기계광고 메인 화면 (jadong.co.kr 구성)
// 메인 배너(3장씩) → 카테고리 아이콘 → 스마트 허브 → 추천(AD) 제품 → 와이드 허브 → 파트너 허브 → 플러스 허브
// → SHORTS → 등록제품 허브 → 블로그와 함께하는 제품 → 현장에서 많이 찾는 제품 → 큰 이미지 광고 → 전체제품 허브
// → MAGAZINE → 입점 안내. 광고·콘텐츠가 없는 칸은 보이지 않아요.

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  Boxes,
  Cog,
  Cpu,
  Fan,
  FlaskConical,
  Package,
  Phone,
  Recycle,
  Tractor,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { AdLink } from '@/components/platform/ad-link'
import { HScroller } from '@/components/platform/h-scroller'
import { PopularTabs } from '@/components/platform/popular-tabs'
import { ShortsRow } from '@/components/platform/shorts-row'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/store/product-card'
import { env } from '@/lib/env'
import { mediaUrl } from '@/lib/media-url'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { inquiryTop, realtimeTop, todayTopViewed } from '@/lib/platform-popular'
import {
  fetchLatestPlatformCards,
  fetchPlatformCardsByIds,
  type PlatformProductCard,
} from '@/lib/platform-products'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { getSiteSettings } from '@/lib/site-settings'
import { getAnonClient } from '@/lib/supabase/anon'
import { getLiveBanners, getLivePromotedProductIds, type LiveBanner } from '@/modules/ads/live'
import { youtubeId, youtubeThumb } from '@/modules/contents/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | 산업기계 중고기계 매매 직거래·광고 플랫폼` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: `${env.APP_URL.replace(/\/+$/, '')}/` },
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, type: 'website', locale: 'ko_KR' },
}

/** 1차 카테고리 기본 아이콘 (아이콘 이미지를 안 넣었을 때) */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'machine-tools': Cog,
  'automation-fa-robot': Bot,
  'packaging-logistics': Package,
  'food-pharma-cosmetic': FlaskConical,
  'plastic-mold-injection': Boxes,
  'pneumatic-hvac-energy': Fan,
  'electrical-electronics': Cpu,
  'environment-construction': Tractor,
  'tools-parts-mro': Wrench,
  'etc-used-service': Recycle,
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
}

// ------------------------------------------------------------------ 작은 화면 조각

function Hub({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string
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
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
    smart,
    wide,
    partner,
    plus,
    imageAds,
    promotedIds,
    latest,
    allLatest,
    contentsRes,
    todayIds,
    realtimeIds,
    inquiryIds,
    featuredRes,
  ] = await Promise.all([
    getSiteSettings(),
    getPlatformCategories(),
    getLiveBanners('main'),
    getLiveBanners('smart'),
    getLiveBanners('wide'),
    getLiveBanners('partner'),
    getLiveBanners('plus'),
    getLiveBanners('image'),
    getLivePromotedProductIds('main'),
    fetchLatestPlatformCards(16),
    fetchLatestPlatformCards(20),
    supabase
      .from('site_contents')
      .select('id, kind, title, url, thumbnail, summary, product_id, published_at')
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
  const blogs = contents.filter((c) => c.kind === 'blog').slice(0, 6)
  const magazines = contents.filter((c) => c.kind === 'magazine').slice(0, 3)

  const specialIds = [...promotedIds, ...((featuredRes.data ?? []) as { id: string }[]).map((r) => r.id)]
  const [promoted, todayCards, realtimeCards, inquiryCards, specialCards, blogProducts] = await Promise.all([
    fetchPlatformCardsByIds(promotedIds),
    fetchPlatformCardsByIds(todayIds),
    fetchPlatformCardsByIds(realtimeIds),
    fetchPlatformCardsByIds(inquiryIds),
    fetchPlatformCardsByIds([...new Set(specialIds)].slice(0, 10)),
    fetchPlatformCardsByIds(blogs.flatMap((b) => (b.product_id ? [b.product_id] : []))),
  ])
  const blogProductById = new Map(blogProducts.map((p) => [p.card.id, p]))

  // 파트너 허브: 광고주 공급사의 최신 제품 3개
  const partnerProducts = new Map<string, PlatformProductCard[]>()
  await Promise.all(
    partner
      .filter((b) => b.advertiser_org_id)
      .map(async (b) => partnerProducts.set(b.id, await fetchLatestPlatformCards(3, b.advertiser_org_id as string))),
  )

  const shown = visibleCategories(categories)
  const roots = shown.filter((c) => !c.parent_id && c.show_on_main)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-6 sm:px-6">
      {/* 1. 메인 배너 — 3장씩 */}
      {mainBanners.length > 0 ? (
        <HScroller autoPlayMs={5000} label="메인 배너">
          {mainBanners.map((b) => (
            <AdLink
              key={b.id}
              bannerId={b.id}
              href={b.link_url}
              title={b.title}
              className="group relative block w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
            >
              <AdImage b={b} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute top-3 left-3 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">광고</span>
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
        <section
          aria-label="기계 카테고리"
          className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max gap-3 sm:min-w-0 sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-5">
            {roots.map((c) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? Cog
              return (
                <Link
                  key={c.id}
                  href={`/products?${categoryQuery(c)}`}
                  className="group flex w-20 flex-col items-center gap-2 text-center"
                >
                  <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition-colors group-hover:border-primary sm:size-[72px]">
                    {c.icon_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(c.icon_image)} alt="" className="size-full object-cover" />
                    ) : (
                      <Icon className="size-7 text-primary" />
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs leading-tight font-medium">{c.name}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* 3. 스마트 허브 — 4칸 카드 */}
      {smart.length > 0 ? (
        <Hub title="스마트 허브" description="지금 주목받는 공급사와 제품을 한눈에 만나보세요.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {smart.slice(0, 8).map((b) => (
              <AdLink
                key={b.id}
                bannerId={b.id}
                href={b.link_url}
                title={b.title}
                className="group relative block overflow-hidden rounded-xl bg-muted"
              >
                <AdImage b={b} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
                  {b.subtitle ? <span className="line-clamp-1 text-sm font-semibold text-white">{b.subtitle}</span> : null}
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-black">홈페이지 바로가기</span>
                </span>
              </AdLink>
            ))}
          </div>
        </Hub>
      ) : null}

      {/* 추천(AD) 제품 — 유료 상단 노출 */}
      {promoted.length > 0 ? (
        <Hub title="추천 제품" description="전자동이 추천하는 광고 제품이에요.">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
            <ProductGrid items={promoted} />
          </div>
        </Hub>
      ) : null}

      {/* 4. 와이드 허브 */}
      {wide.length > 0 ? (
        <Hub title="와이드 허브" description="공급사와 주요 취급 제품을 하나의 광고로 전달합니다.">
          <div className="flex flex-col gap-3">
            {wide.slice(0, 3).map((b) => (
              <AdLink
                key={b.id}
                bannerId={b.id}
                href={b.link_url}
                title={b.title}
                className="block overflow-hidden rounded-xl border border-border"
              >
                <AdImage b={b} className="aspect-[3/1] w-full object-cover sm:aspect-[6/1]" />
              </AdLink>
            ))}
          </div>
        </Hub>
      ) : null}

      {/* 5. 파트너 허브 — 공급사 + 대표 제품 */}
      {partner.length > 0 ? (
        <Hub title="파트너 허브" description="파트너의 가치와 트렌드를 깊이 있게 연결합니다.">
          <div className="grid gap-4 md:grid-cols-2">
            {partner.slice(0, 8).map((b) => {
              const items = partnerProducts.get(b.id) ?? []
              return (
                <div key={b.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <AdLink bannerId={b.id} href={b.link_url} title={b.title} className="relative block">
                    <AdImage b={b} className="aspect-[3/2] w-full object-cover" />
                    {b.subtitle ? (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-sm font-semibold text-white">
                        {b.subtitle}
                      </span>
                    ) : null}
                  </AdLink>
                  {items.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {items.map((p) => (
                        <Link
                          key={p.card.id}
                          href={`/s/${p.orgSlug}/products/${p.card.product_no}`}
                          className="flex flex-col gap-1"
                        >
                          <span className="aspect-square overflow-hidden rounded-md bg-muted">
                            {p.card.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.card.image} alt="" loading="lazy" className="size-full object-cover" />
                            ) : null}
                          </span>
                          <span className="line-clamp-2 text-xs">{p.card.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Hub>
      ) : null}

      {/* 6. 플러스 허브 — 2칸 */}
      {plus.length > 0 ? (
        <Hub title="플러스 허브" description="전문 분야별 공급사의 제품과 서비스를 소개합니다.">
          <div className="grid gap-3 sm:grid-cols-2">
            {plus.slice(0, 6).map((b) => (
              <AdLink
                key={b.id}
                bannerId={b.id}
                href={b.link_url}
                title={b.title}
                className="block overflow-hidden rounded-xl border border-border"
              >
                <AdImage b={b} className="aspect-[8/3] w-full object-cover" />
              </AdLink>
            ))}
          </div>
        </Hub>
      ) : null}

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

      {/* 9. 인기 기계 블로그와 함께하는 제품 */}
      {blogs.length > 0 ? (
        <Hub title="인기 기계 블로그와 함께하는 제품" description="기계 분야에서 많이 읽히는 블로그 글과 소개된 제품이에요.">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((b) => {
              const p = b.product_id ? blogProductById.get(b.product_id) : undefined
              return (
                <div key={b.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <a href={b.url ?? '#'} target="_blank" rel="noopener" className="group flex flex-col gap-2 p-4">
                    {b.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(b.thumbnail)} alt="" loading="lazy" className="aspect-[16/9] w-full rounded-md object-cover" />
                    ) : null}
                    <span className="line-clamp-2 font-semibold group-hover:underline">{b.title}</span>
                    {b.summary ? <span className="line-clamp-2 text-sm text-muted-foreground">{b.summary}</span> : null}
                  </a>
                  {p ? (
                    <Link
                      href={`/s/${p.orgSlug}/products/${p.card.product_no}`}
                      className="mt-auto flex items-center gap-3 border-t border-border bg-muted/40 p-3 hover:bg-muted"
                    >
                      <span className="size-12 shrink-0 overflow-hidden rounded bg-muted">
                        {p.card.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.card.image} alt="" className="size-full object-cover" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{p.card.name}</span>
                        <span className="text-xs text-muted-foreground">{p.orgName}</span>
                      </span>
                    </Link>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Hub>
      ) : null}

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

      {/* 11. 큰 이미지 광고 */}
      {imageAds.length > 0 ? (
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
              <span className="absolute top-3 left-3 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">광고</span>
            </AdLink>
          ))}
        </section>
      ) : null}

      {/* 12. 전체제품 허브 */}
      <Hub title="전체제품 허브" description="모든 공급사의 산업기계·중고기계" href="/products" linkLabel="전체 보기">
        {allLatest.length > 0 ? (
          <ProductGrid items={allLatest} />
        ) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            아직 등록된 제품이 없어요.
          </p>
        )}
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
  )
}
