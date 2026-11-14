// 판매정보 상자 — 공급사가 "판매정보 표시설정"에서 정한 대로
// 직접 쓴 내용이 있으면 그것을, 없으면 기본 공급사 소개 카드를 보여줘요. 꺼 두면 안 보여요.

import { sanitizeDetailHtml } from '@/lib/detail-html'

import type { StoreOrg } from './get-store-org'
import { SupplierCard } from './product-detail/supplier-card'

export function SellerInfo({ org, place, productId }: { org: StoreOrg; place: 'detail' | 'shop'; productId?: string }) {
  const enabled = place === 'detail' ? org.seller_info_detail_enabled : org.seller_info_shop_enabled
  if (enabled === false) return null
  const html = place === 'detail' ? org.seller_info_detail_html : org.seller_info_shop_html
  if (html && html.trim()) {
    return (
      <section
        className="seller-info overflow-hidden rounded-lg border border-border bg-card p-4 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_th]:w-32 [&_th]:border-b [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold"
        aria-label="판매정보"
        dangerouslySetInnerHTML={{ __html: sanitizeDetailHtml(html) }}
      />
    )
  }
  return <SupplierCard org={org} productId={productId} />
}
