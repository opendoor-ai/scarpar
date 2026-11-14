// /products/{상품번호} — 상품번호만 알면 어느 공급사 상품이든 바로 찾아가는 주소.
// 전화 상담 중 "10001번 기계" 처럼 번호로 안내할 때 씁니다. 공급사 상세 주소로 영구 이동(308).

import { notFound, permanentRedirect } from 'next/navigation'

import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'

import { productPath } from '@/components/store/store-links'

export const dynamic = 'force-dynamic'

export default async function ProductNoRedirect({ params }: PageProps<{ no: string }>) {
  const { no } = await params
  if (!/^\d{1,15}$/.test(no)) notFound()

  const { data } = await getAnonClient()
    .from('products')
    .select('product_no, org:orgs!inner(slug, is_active)')
    .eq('product_no', Number(no))
    .eq('status', 'active')
    .eq('org.is_active', true)
    .maybeSingle()

  const row = data as { product_no: number; org: { slug: string } | { slug: string }[] | null } | null
  const org = row ? (Array.isArray(row.org) ? row.org[0] : row.org) : null
  if (!row || !org) notFound()

  permanentRedirect(productPath(org.slug, row.product_no))
}
