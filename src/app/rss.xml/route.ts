// /rss.xml — 최신 등록·점프 상품 50개 (네이버 서치어드바이저 "RSS 제출"용)

import { minishopUrl } from '@/lib/domains'
import { env } from '@/lib/env'
import { formatPrice } from '@/lib/money'
import { SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'
import { getSiteConfig } from '@/modules/site-config/get'

export const revalidate = 1800

function x(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface Row {
  product_no: number
  name: string
  model_name: string | null
  brand: string | null
  short_description: string | null
  spec_summary: string | null
  price: number
  created_at: string
  display_at?: string
  org: { slug: string; name: string } | { slug: string; name: string }[] | null
}

export async function GET() {
  const base = env.APP_URL.replace(/\/+$/, '')
  const { seo } = await getSiteConfig()
  const { data } = await getAnonClient()
    .from('products')
    .select('product_no, name, model_name, brand, short_description, spec_summary, price, created_at, display_at, org:orgs!inner(slug, name, is_active)')
    .eq('status', 'active')
    .eq('org.is_active', true)
    .order('display_at', { ascending: false })
    .limit(50)

  const items = ((data ?? []) as unknown as Row[])
    .map((r) => {
      const org = Array.isArray(r.org) ? r.org[0] : r.org
      if (!org) return ''
      const link = minishopUrl(org.slug, `/products/${r.product_no}`)
      const title = [r.name, r.model_name].filter(Boolean).join(' ')
      const desc = [r.short_description || r.spec_summary, r.brand ? `제조사 ${r.brand}` : '', `판매가 ${formatPrice(r.price)}`, `공급사 ${org.name}`]
        .filter(Boolean)
        .join(' · ')
      return `    <item>
      <title>${x(title)}</title>
      <link>${x(link)}</link>
      <guid isPermaLink="true">${x(link)}</guid>
      <description>${x(desc)}</description>
      <author>${x(org.name)}</author>
      <pubDate>${new Date(r.display_at ?? r.created_at).toUTCString()}</pubDate>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${x(seo.title || SITE_NAME)}</title>
    <link>${base}</link>
    <description>${x(seo.description)}</description>
    <language>ko</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
