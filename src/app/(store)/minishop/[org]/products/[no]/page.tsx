import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'

import { env } from '@/lib/env'
import { getPlatformCategories, categoryQuery } from '@/lib/platform-categories'

import { type Lang } from '@/lib/i18n'
import { mediaUrl } from '@/lib/media-url'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { Product, ProductVariant } from '@/types/db'

import Link from 'next/link'

import { ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/money'
import { formatKrPhone } from '@/lib/phone'
import { DetailSection } from '@/components/store/product-detail/detail-section'
import { fillTemplate } from '@/modules/site-config/schemas'
import { getSiteConfig } from '@/modules/site-config/get'
import { InfoTable } from '@/components/store/product-detail/info-table'
import {
  BADGE_CLASS,
  BADGE_LABEL,
  CONDITION_BADGE_CLASS,
  CONDITION_LABEL,
  isProductBadge,
  productCode,
} from '@/components/store/product-detail/labels'
import { RelatedProducts } from '@/components/store/product-detail/related-products'
import { SellerInfo } from '@/components/store/seller-info'
import { ProductJsonLd } from '@/components/store/product-detail/product-json-ld'
import { TrackView } from '@/components/store/product-detail/track-view'
import { SITE_NAME } from '@/lib/site'
import { ChannelBanners } from '@/components/store/product-detail/channel-banners'
import { DetailMiniBanners } from '@/components/store/product-detail/detail-mini-banners'
import { PurchaseGuide } from '@/components/store/product-detail/purchase-guide'
import { QuestionsSection, getQuestionCount } from '@/components/store/product-detail/questions-section'
import { getStoreOrg } from '@/components/store/get-store-org'
import { productPath, storePath } from '@/components/store/store-links'
import { ProductGallery } from '@/components/store/product-gallery'
import { ProductInquiryActions } from '@/components/store/product-inquiry-actions'
import { ProductPurchasePanel } from '@/components/store/product-purchase-panel'
import { ReviewsSection } from '@/components/store/reviews-section'

export const dynamic = 'force-dynamic'

interface ImageJoinRow {
  id: string
  position: number
  media: { path: string } | { path: string }[] | null
}

/** 공유용 제목·설명·대표 사진(Open Graph). 카카오톡·문자 등에 링크를 보내면 미리보기로 보입니다. */
/** URL의 상품번호 → 숫자. "10001" 만 허용(숫자가 아니면 null). */
function parseProductNo(value: string): number | null {
  return /^\d{1,15}$/.test(value) ? Number(value) : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; no: string }>
}): Promise<Metadata> {
  const { org: orgSlug, no } = await params
  const productNo = parseProductNo(no)
  const org = await getStoreOrg(orgSlug)
  if (!org || productNo === null) return {}
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('products')
    .select('id, product_no, name, description, brand, short_description, spec_summary, model_name, price, category_id, seo')
    .eq('org_id', org.id)
    .eq('product_no', productNo)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return {}
  const product = data as Pick<
    Product,
    'id' | 'product_no' | 'name' | 'description' | 'brand' | 'short_description' | 'spec_summary' | 'model_name' | 'price' | 'category_id' | 'seo'
  >
  // 상품 등록 화면의 "검색 노출 문구"(AI 작성 가능)가 있으면 우선 사용
  const seoTitle = typeof product.seo?.title === 'string' && product.seo.title.trim() ? product.seo.title.trim() : null
  const seoDescription =
    typeof product.seo?.description === 'string' && product.seo.description.trim() ? product.seo.description.trim() : null

  const { data: imageRow } = await supabase
    .from('product_images')
    .select('media:media_id(path)')
    .eq('org_id', org.id)
    .eq('product_id', product.id)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()
  const media = (imageRow as { media: { path: string } | { path: string }[] | null } | null)?.media
  const imagePath = Array.isArray(media) ? media[0]?.path : media?.path
  const image = imagePath ? mediaUrl(imagePath) : undefined

  // 관리자 → SEO → 개별 페이지 SEO 태그의 문구 틀
  const [{ seo }, categories] = await Promise.all([getSiteConfig(), getPlatformCategories()])
  const cat = product.category_id ? categories.find((c) => c.id === product.category_id) : undefined
  const parentCat = cat?.parent_id ? categories.find((c) => c.id === cat.parent_id) : undefined
  const summary = product.short_description || product.spec_summary || (product.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 100)
  const vars = {
    상품명: product.name,
    모델명: product.model_name,
    제조사: product.brand,
    분류: [parentCat?.name, cat?.name].filter(Boolean).join(' > '),
    공급사: org.name,
    판매가: formatPrice(product.price),
    요약: summary,
    상품코드: `P${product.product_no}`,
    사이트명: SITE_NAME,
  }
  const templTitle = fillTemplate(seo.productTitle, vars)
  const description =
    seoDescription ||
    fillTemplate(seo.productDescription, vars).slice(0, 200) ||
    `${org.name}의 ${product.name}${product.brand ? ` (${product.brand})` : ''} 제품 정보와 문의`
  const url = `${env.APP_URL}${productPath(org.slug, productNo)}`
  const fullTitle = `${seoTitle ?? (templTitle || product.name)} | ${SITE_NAME}`

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${seoTitle ?? product.name} · ${org.name}`,
      description,
      url,
      siteName: org.name,
      locale: 'ko_KR',
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.name,
      description,
    },
  }
}

export default async function ProductPage({ params }: PageProps<{ org: string; no: string }>) {
  const { org: orgSlug, no } = await params
  const productNo = parseProductNo(no)
  if (productNo === null) notFound()
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const [settings, siteConfig] = await Promise.all([getOrgSettings(org.id), getSiteConfig()])
  const lang = settingStr(settings, 'localization.language') as Lang

  const supabase = getAnonClient()
  const { data: productRow } = await supabase
    .from('products')
    .select('*')
    .eq('org_id', org.id)
    .eq('product_no', productNo)
    .eq('status', 'active')
    .maybeSingle()

  if (!productRow) notFound()
  const product = productRow as Product

  const [{ data: variantRows }, { data: imageRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('*')
      .eq('org_id', org.id)
      .eq('product_id', product.id)
      .order('position', { ascending: true }),
    supabase
      .from('product_images')
      .select('id, position, media:media_id(path)')
      .eq('org_id', org.id)
      .eq('product_id', product.id)
      .order('position', { ascending: true }),
  ])

  const variants = (variantRows ?? []) as ProductVariant[]

  // 카테고리: 상위 카테고리가 있으면 "상위 > 하위" 순서로 보여준다.
  let categoryTrail: { name: string; slug: string; query: string }[] = []
  if (product.category_id) {
    const rows = await getPlatformCategories()
    const byId = new Map(rows.map((r) => [r.id, r]))
    let current = byId.get(product.category_id)
    while (current && categoryTrail.length < 5) {
      categoryTrail = [{ name: current.name, slug: current.slug, query: categoryQuery(current) }, ...categoryTrail]
      current = current.parent_id ? byId.get(current.parent_id) : undefined
    }
  }

  const imageUrls = ((imageRows ?? []) as unknown as ImageJoinRow[])
    .map((row) => {
      const media = Array.isArray(row.media) ? row.media[0] : row.media
      return media?.path ? mediaUrl(media.path) : null
    })
    .filter((url): url is string => Boolean(url))

  const questionCount = await getQuestionCount(product.id)
  const productUrl = `${env.APP_URL}${productPath(org.slug, product.product_no)}`
  const qrDataUrl = await QRCode.toDataURL(productUrl, {
    margin: 1,
    width: 320,
  })

  const topBadges = (product.badges ?? []).filter(isProductBadge).map((b) => ({ label: BADGE_LABEL[b], className: BADGE_CLASS[b] }))
  const conditionBadge = product.condition
    ? { label: CONDITION_LABEL[product.condition], className: CONDITION_BADGE_CLASS[product.condition] }
    : null
  const code = productCode(product.product_no)
  const categoryLabel = categoryTrail.map((c) => c.name).join(' > ')
  const hasPrice = product.price > 0 || variants.some((v) => v.price > 0)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <TrackView
        productId={product.id}
        recent={{
          href: productPath(org.slug, product.product_no),
          name: product.name,
          image: imageUrls[0] ?? null,
          price: formatPrice(product.price),
          supplier: org.name,
        }}
      />
      <ProductJsonLd
        product={product}
        org={org}
        url={productUrl}
        images={imageUrls}
        storeUrl={`${env.APP_URL}${storePath(org.slug)}`}
        productsUrl={`${env.APP_URL}${storePath(org.slug, '/products')}`}
        categoryTrail={categoryTrail.map((c) => ({
          name: c.name,
          url: `${env.APP_URL}${storePath(org.slug, '/products')}?${c.query}`,
        }))}
      />
      {/* 현재 위치 */}
      <nav
        aria-label="현재 위치"
        className="mb-4 flex flex-wrap items-center justify-end gap-1 text-xs text-muted-foreground"
      >
        <Link href={storePath(org.slug)} className="hover:text-foreground">
          홈
        </Link>
        <ChevronRight className="size-3" />
        <Link href={storePath(org.slug, '/products')} className="hover:text-foreground">
          전체 카테고리
        </Link>
        {categoryTrail.map((c, i) => (
          <span key={c.slug} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            <Link
              href={`${storePath(org.slug, '/products')}?${c.query}`}
              className={i === categoryTrail.length - 1 ? 'font-semibold text-foreground' : 'hover:text-foreground'}
            >
              {c.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* 오른쪽 정보칸 — PC에서는 오른쪽에 붙어서 따라오고, 휴대폰에서는 사진 바로 아래 */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <div className="lg:hidden">
            <ProductGallery images={imageUrls} name={product.name} badge={conditionBadge} topBadges={topBadges} />
          </div>
          <div className="flex flex-col gap-1.5">
            {product.condition ? (
              <span
                className={`w-fit rounded px-1.5 py-0.5 text-xs font-semibold ${CONDITION_BADGE_CLASS[product.condition]}`}
              >
                {CONDITION_LABEL[product.condition]}
              </span>
            ) : null}
            <h1 className="text-xl leading-snug font-bold sm:text-2xl">{product.name}</h1>
            {product.model_name ? <p className="text-sm font-medium">{product.model_name}</p> : null}
            {product.short_description ? (
              <p className="text-sm text-muted-foreground">{product.short_description}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{org.name}</span>
            <Link
              href={storePath(org.slug)}
              className="inline-flex items-center gap-0.5 rounded bg-foreground px-2 py-0.5 text-xs text-background hover:bg-foreground/80"
            >
              바로가기
              <ChevronRight className="size-3" />
            </Link>
          </div>

          <ChannelBanners settings={settings} />
          <DetailMiniBanners />

          {/* 관리자 → 상품정보표시 설정(상품상세)의 표시 여부·항목 이름 */}
          <InfoTable
            rows={(
              [
                ['code', '상품코드', code],
                ['category', '제품분류', categoryLabel],
                ['model', '모델명', product.model_name],
                ['spec', '제품사양', product.spec_summary],
                ['brand', '제조사', product.brand],
                ['year', '연식', product.manufacture_year ? `${product.manufacture_year}년` : null],
                ['origin', '원산지', product.origin ?? null],
                ['price', '판매가', formatPrice(product.price)],
                ['supplier', '공급사', org.name],
                ['phone', '연락처', org.phone ? formatKrPhone(org.phone) : null],
              ] as const
            )
              .filter(([key]) => siteConfig.display.detail[key]?.show !== false)
              .map(([key, label, value]) => ({
                label: siteConfig.display.detail[key]?.label?.trim() || label,
                value,
                emphasis: key === 'price',
              }))}
          />

          {hasPrice ? (
            <ProductPurchasePanel product={product} variants={variants} image={imageUrls[0] ?? null} lang={lang} />
          ) : null}
          <ProductInquiryActions
            productId={product.id}
            productName={product.name}
            modelName={product.model_name ?? product.sku}
            supplierName={org.name}
            supplierPhone={org.phone}
            productUrl={productUrl}
            qrDataUrl={qrDataUrl}
          />
        </aside>

        {/* 왼쪽 본문 */}
        <div className="flex min-w-0 flex-col gap-10 lg:order-1">
          <div className="hidden lg:block">
            <ProductGallery images={imageUrls} name={product.name} badge={conditionBadge} topBadges={topBadges} />
          </div>

          <SellerInfo org={org} place="detail" productId={product.id} />

          <RelatedProducts orgId={org.id} orgSlug={org.slug} excludeId={product.id} lang={lang} />

          {/* 탭 */}
          <div>
            <nav
              aria-label="상세 정보 메뉴"
              className="sticky top-14 z-20 grid grid-cols-4 border-b border-border bg-background text-center text-sm"
            >
              <a href="#product-detail" className="border-b-2 border-foreground py-3 font-semibold">
                제품상세
              </a>
              <a href="#product-guide" className="py-3 text-muted-foreground hover:text-foreground">
                구매안내
              </a>
              <a href="#product-qna" className="py-3 text-muted-foreground hover:text-foreground">
                Q&amp;A({questionCount})
              </a>
              <a href="#product-reviews" className="py-3 text-muted-foreground hover:text-foreground">
                리뷰
              </a>
            </nav>
            <div id="product-detail" className="scroll-mt-28 pt-6">
              <DetailSection
                product={product}
                supplierName={org.name}
                supplierPhone={org.phone}
                platformName={SITE_NAME}
              />
            </div>
            <div id="product-guide" className="scroll-mt-28 pt-12">
              <PurchaseGuide settings={settings} />
            </div>
            <div id="product-qna" className="scroll-mt-28 pt-12">
              <QuestionsSection orgId={org.id} orgSlug={org.slug} productId={product.id} />
            </div>
            <div id="product-reviews" className="scroll-mt-28 pt-12">
              <ReviewsSection orgId={org.id} orgSlug={org.slug} productId={product.id} />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-12 border-t border-border pt-6 text-center text-xs leading-relaxed text-muted-foreground">
        {SITE_NAME}는 통신판매중개자이며, 개별 거래의 당사자가 아닙니다. 상품 정보, 거래 조건 및 거래에 대한 책임은
        해당 공급사에 있습니다.
      </p>
    </div>
  )
}
