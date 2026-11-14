// 배너 DB 행 ↔ 편집용 데이터 변환 (서버·화면 공용)

import type { BannerItem } from './banner-types'
import { toKstDate } from './schemas'

export type BannerRowDb = {
  id: string
  title: string
  image_pc: string | null
  image_mobile: string | null
  texts: BannerItem['texts'] | null
  link_url: string | null
  link_target: string | null
  colors: string[] | null
  html: string | null
  product_ids: string[] | null
  extra_images: string[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  category_id: string | null
  advertiser_org_id: string | null
  advertiser_name: string | null
  payment_status: BannerItem['payment_status']
  price_won: number | null
  memo: string | null
  sort_order: number
}

export function rowToItem(r: BannerRowDb): BannerItem {
  const colors = [...(r.colors ?? [])]
  while (colors.length < 4) colors.push('')
  return {
    id: r.id,
    title: r.title ?? '',
    image_pc: r.image_pc ?? '',
    image_mobile: r.image_mobile ?? '',
    texts: r.texts && r.texts.length > 0 ? r.texts : [{ text: '' }],
    link_url: r.link_url ?? '',
    link_target: r.link_target === '_blank' ? '_blank' : '_self',
    colors: colors.slice(0, 4),
    html: r.html ?? '',
    product_ids: r.product_ids ?? [],
    extra_images: r.extra_images ?? [],
    always: !r.starts_at && !r.ends_at,
    starts_on: r.starts_at ? toKstDate(r.starts_at) : '',
    ends_on: r.ends_at ? toKstDate(r.ends_at) : '',
    is_active: r.is_active,
    category_id: r.category_id,
    advertiser_org_id: r.advertiser_org_id,
    advertiser_name: r.advertiser_name ?? '',
    payment_status: r.payment_status ?? 'free',
    price_won: r.price_won,
    memo: r.memo ?? '',
  }
}
