import { notFound, permanentRedirect } from 'next/navigation'

import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import { decodeParam } from '@/lib/utils'

import { getStoreOrg } from '@/components/store/get-store-org'
import { productPath } from '@/components/store/store-links'

export const dynamic = 'force-dynamic'

/**
 * 예전 상품 주소(/minishop/{공급사}/product/{slug})를 새 주소(/minishop/{공급사}/products/{상품번호})로 영구 이동(308).
 * 이미 공유된 링크와 검색엔진에 등록된 주소가 끊기지 않게 하기 위한 페이지입니다.
 */
export default async function LegacyProductRedirect({ params }: PageProps<{ org: string; slug: string }>) {
  const { org: orgSlug, slug: rawSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const slug = decodeParam(rawSlug)
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('products')
    .select('product_no')
    .eq('org_id', org.id)
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  const productNo = (data as { product_no: number } | null)?.product_no
  if (!productNo) notFound()

  permanentRedirect(productPath(org.slug, productNo))
}
