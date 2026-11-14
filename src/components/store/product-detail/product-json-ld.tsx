// 검색엔진용 구조화 데이터(JSON-LD): 구글·네이버가 "제품"과 "경로"를 정확히 이해하도록 돕습니다.
// https://schema.org/Product , https://schema.org/BreadcrumbList

import { fromPaisa } from '@/lib/money'
import type { Product } from '@/types/db'

import type { StoreOrg } from '../get-store-org'

interface Props {
  product: Product
  org: StoreOrg
  url: string
  images: string[]
  categoryTrail: { name: string; url: string }[]
  storeUrl: string
  productsUrl: string
}

const CONDITION_SCHEMA: Record<string, string> = {
  new: 'https://schema.org/NewCondition',
  used: 'https://schema.org/UsedCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
}

/** </script> 같은 문자열이 데이터에 섞여도 태그가 깨지지 않게 이스케이프 */
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
}

export function ProductJsonLd({ product, org, url, images, categoryTrail, storeUrl, productsUrl }: Props) {
  const description =
    product.short_description ||
    (product.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) ||
    `${org.name}의 ${product.name}`

  const seller = { '@type': 'Organization', name: org.name, ...(org.phone ? { telephone: org.phone } : {}) }

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    url,
    sku: `P${product.product_no}`,
    productID: `P${product.product_no}`,
    ...(images.length ? { image: images } : {}),
    ...(product.model_name ? { model: product.model_name, mpn: product.model_name } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(categoryTrail.length ? { category: categoryTrail.map((c) => c.name).join(' > ') } : {}),
    ...(product.condition ? { itemCondition: CONDITION_SCHEMA[product.condition] } : {}),
  }
  // 가격이 있을 때만 판매 정보(offers)를 넣음 — 가격협의(0원)는 가격을 지어내지 않음
  if (product.price > 0) {
    productLd.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: 'KRW',
      price: Math.round(fromPaisa(product.price)),
      availability: 'https://schema.org/InStock',
      ...(product.condition ? { itemCondition: CONDITION_SCHEMA[product.condition] } : {}),
      seller,
    }
  }

  const crumbs = [
    { name: org.name, url: storeUrl },
    { name: '전체 카테고리', url: productsUrl },
    ...categoryTrail,
    { name: product.name, url },
  ]
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbLd) }} />
    </>
  )
}
