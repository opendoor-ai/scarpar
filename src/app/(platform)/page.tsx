// 전자동기계광고 메인 화면 (기준서 3단계)
// 구성: 검색 → 상단 배너 → 기계 카테고리 → 추천(광고) 제품 → 최신 제품 → 입점 공급사 → 회사소개·문의 → 푸터

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
  Mail,
  MapPin,
  Package,
  Phone,
  Recycle,
  Store,
  Tractor,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getStoreOrg } from '@/components/store/get-store-org'
import { ProductCard } from '@/components/store/product-card'
import { ProductSearchBox } from '@/components/store/products-filters'
import { env } from '@/lib/env'
import { formatKrPhone, phoneDigits } from '@/lib/phone'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import {
  PLATFORM_PRODUCT_COLUMNS,
  toPlatformCards,
  type PlatformProductCard,
  type PlatformProductRow,
} from '@/lib/platform-products'
import { PLATFORM_ORG_SLUG, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'
import { BannerCarousel } from '@/modules/ads/components/banner-carousel'
import { getLiveBanners, getLivePromotedProductIds } from '@/modules/ads/live'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — 산업기계·중고기계 광고 플랫폼` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: `${env.APP_URL.replace(/\/+$/, '')}/` },
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, type: 'website', locale: 'ko_KR' },
}

/** 1차 카테고리 주소별 아이콘 (모르는 주소는 톱니바퀴) */
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

const LATEST_COUNT = 8

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      {href ? (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {linkLabel ?? '더보기'}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}

function CardGrid({ items }: { items: PlatformProductCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((i) => (
        <ProductCard key={i.card.id} orgSlug={i.orgSlug} product={i.card} supplierName={i.orgName} />
      ))}
    </div>
  )
}

export default async function HomePage() {
  const supabase = getAnonClient()

  const [categories, banners, promotedIds, latestRes, countRes, orgsRes, platformOrg] = await Promise.all([
    getPlatformCategories(),
    getLiveBanners('main'),
    getLivePromotedProductIds('main'),
    supabase
      .from('products')
      .select(PLATFORM_PRODUCT_COLUMNS)
      .eq('status', 'active')
      .eq('org.is_active', true)
      .order('created_at', { ascending: false })
      .limit(LATEST_COUNT),
    supabase
      .from('products')
      .select('id, org:orgs!inner(id)', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('org.is_active', true),
    supabase.from('orgs').select('id, name, slug, logo_path').eq('is_active', true).order('created_at').limit(24),
    getStoreOrg(PLATFORM_ORG_SLUG),
  ])

  let promotedRows: PlatformProductRow[] = []
  if (promotedIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select(PLATFORM_PRODUCT_COLUMNS)
      .in('id', promotedIds)
      .eq('status', 'active')
      .eq('org.is_active', true)
    const order = new Map(promotedIds.map((id, i) => [id, i]))
    promotedRows = ((data ?? []) as unknown as PlatformProductRow[]).sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    )
  }
  const [promoted, latest] = await toPlatformCards(
    promotedRows,
    (latestRes.data ?? []) as unknown as PlatformProductRow[],
  )

  const shown = visibleCategories(categories)
  const roots = shown.filter((c) => !c.parent_id && c.show_on_main)
  const subsByParent = new Map<string, typeof categories>()
  for (const c of shown) {
    if (!c.parent_id) continue
    subsByParent.set(c.parent_id, [...(subsByParent.get(c.parent_id) ?? []), c])
  }
  const suppliers = (orgsRes.data ?? []) as { id: string; name: string; slug: string }[]
  const productCount = countRes.count ?? 0
  const phone = platformOrg?.phone ?? null

  return (
    <div className="flex flex-col">
      {/* 검색 */}
      <section className="border-b border-border bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6 sm:py-14">
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">필요한 산업기계, 한곳에서 찾으세요</h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            산업기계·중고기계 {productCount.toLocaleString('ko-KR')}개. 마음에 드는 제품은 공급사에 바로 전화·문자로 문의하세요.
          </p>
          <div className="w-full max-w-xl [&_form]:w-full [&_input]:h-12 [&_input]:bg-background [&_input]:text-base">
            <ProductSearchBox orgSlug="" basePath="/products" placeholder="제품명·모델명·제조사로 검색" />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-10">
        {/* 상단 배너 */}
        {banners.length > 0 ? <BannerCarousel banners={banners} /> : null}

        {/* 기계 카테고리 */}
        {roots.length > 0 ? (
          <section>
            <SectionHeader title="기계 카테고리" href="/products" linkLabel="전체 제품" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {roots.map((c) => {
                const Icon = CATEGORY_ICONS[c.slug] ?? Cog
                const subs = subsByParent.get(c.id) ?? []
                return (
                  <Link
                    key={c.id}
                    href={`/products?${categoryQuery(c)}`}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Icon className="size-7 text-primary" />
                    <span className="text-sm font-semibold leading-snug">{c.name}</span>
                    {subs.length > 0 ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {subs
                          .slice(0, 4)
                          .map((s) => s.name)
                          .join(' · ')}
                        {subs.length > 4 ? ` 외 ${subs.length - 4}` : ''}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* 추천(광고) 제품 */}
        {promoted.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 sm:p-6 dark:border-amber-500/30 dark:bg-amber-500/5">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">AD</span>
              <h2 className="text-lg font-bold sm:text-xl">추천 제품</h2>
            </div>
            <CardGrid items={promoted} />
          </section>
        ) : null}

        {/* 최신 제품 */}
        <section>
          <SectionHeader title="새로 등록된 제품" href="/products" linkLabel="전체 보기" />
          {latest.length > 0 ? (
            <CardGrid items={latest} />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              아직 등록된 제품이 없어요.
            </p>
          )}
        </section>

        {/* 입점 공급사 */}
        {suppliers.length > 0 ? (
          <section>
            <SectionHeader title="입점 공급사" />
            <div className="flex flex-wrap gap-2">
              {suppliers.map((o) => (
                <Link
                  key={o.id}
                  href={`/s/${o.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/50"
                >
                  <Store className="size-3.5 text-muted-foreground" />
                  {o.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* 회사소개 · 문의 */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-bold">{SITE_NAME}는요</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              산업기계·중고기계를 찾는 고객과 공급사를 연결하는 기계 광고 플랫폼입니다. 고객은 여러 공급사의 제품을
              한곳에서 비교하고, 공급사에 바로 전화·문자로 문의할 수 있어요. 거래는 고객과 공급사가 직접 진행합니다.
            </p>
            <div className="mt-1 flex flex-col gap-1.5 text-sm">
              {phone ? (
                <a href={`tel:${phoneDigits(phone)}`} className="inline-flex items-center gap-2 hover:underline">
                  <Phone className="size-4 text-muted-foreground" />
                  {formatKrPhone(phone)}
                </a>
              ) : null}
              {platformOrg?.email ? (
                <a href={`mailto:${platformOrg.email}`} className="inline-flex items-center gap-2 hover:underline">
                  <Mail className="size-4 text-muted-foreground" />
                  {platformOrg.email}
                </a>
              ) : null}
              {platformOrg?.address ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  {platformOrg.address}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-lg font-bold">기계를 판매하시나요?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              공급사로 입점하면 나만의 미니샵이 생기고, 제품을 올려 전국 고객의 문의를 받을 수 있어요. 상단 노출·배너
              광고로 더 많은 고객에게 알릴 수도 있습니다.
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link href="/signup">공급사 입점 신청</Link>
              </Button>
              {phone ? (
                <Button asChild variant="outline">
                  <a href={`tel:${phoneDigits(phone)}`}>
                    <Phone className="size-4" />
                    광고 문의
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
