// /llms.txt — AI(ChatGPT·Claude·Perplexity 등)가 사이트를 빠르게 이해하도록 만든 요약 안내 (AEO)
// 형식: https://llmstxt.org — 제목, 한 줄 요약, 주요 페이지 링크, 자주 묻는 질문

import { DEFAULT_FAQ } from '@/lib/default-faq'
import { env } from '@/lib/env'
import { categoryQuery, getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { SITE_NAME } from '@/lib/site'
import { getSiteSettings } from '@/lib/site-settings'
import { getAnonClient } from '@/lib/supabase/anon'
import { getSiteConfig } from '@/modules/site-config/get'

export const revalidate = 3600

export async function GET() {
  const base = env.APP_URL.replace(/\/+$/, '')
  const [{ seo }, site, categories] = await Promise.all([getSiteConfig(), getSiteSettings(), getPlatformCategories()])
  const anon = getAnonClient()
  const [{ count: productCount }, { data: orgs }] = await Promise.all([
    anon.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    anon.from('orgs').select('name, slug, item_keywords').eq('is_active', true).order('created_at').limit(200),
  ])
  const shown = visibleCategories(categories)
  const roots = shown.filter((c) => !c.parent_id)
  const faq = seo.faq.length > 0 ? seo.faq : DEFAULT_FAQ

  const out: string[] = []
  out.push(`# ${SITE_NAME}`, '')
  out.push(`> ${seo.description}`, '')
  if (seo.aiSummary.trim()) out.push(seo.aiSummary.trim(), '')
  out.push(
    `- 운영: ${site.company_name || SITE_NAME}${site.ceo ? ` (대표 ${site.ceo})` : ''}`,
    `- 판매중 제품: 약 ${(productCount ?? 0).toLocaleString()}개 · 입점 공급사: ${(orgs ?? []).length}곳`,
    '- 거래 방식: 고객이 제품 페이지의 전화·문자 버튼으로 공급사에 직접 문의하는 직거래 (사이트는 결제·배송을 하지 않는 광고·중개 플랫폼)',
    site.phone ? `- 고객센터: ${site.phone}${site.cs_hours ? ` (${site.cs_hours})` : ''}` : '',
    '',
  )

  out.push('## 주요 페이지', '')
  out.push(
    `- [전체 제품](${base}/products): 모든 공급사의 산업기계·중고기계 제품 목록`,
    `- [공급사 미니샵 목록](${base}/suppliers): 입점 공급사와 취급 품목`,
    `- [구매문의](${base}/requests): 찾는 기계를 등록하면 공급사가 연락하는 서비스`,
    `- [고객센터 · 자주 묻는 질문](${base}/support)`,
    `- [광고상품 안내](${base}/advertise)`,
    '',
  )

  if (roots.length > 0) {
    out.push('## 제품 분류', '')
    for (const r of roots) {
      const children = shown.filter((c) => c.parent_id === r.id).map((c) => c.name)
      out.push(`- [${r.name}](${base}/products?${categoryQuery(r)})${children.length ? `: ${children.slice(0, 12).join(', ')}` : ''}`)
    }
    out.push('')
  }

  if ((orgs ?? []).length > 0) {
    out.push('## 입점 공급사', '')
    for (const o of (orgs ?? []) as { name: string; slug: string; item_keywords: string[] | null }[]) {
      const kw = (o.item_keywords ?? []).slice(0, 6).join(', ')
      out.push(`- [${o.name}](${base}/minishop/${o.slug})${kw ? `: ${kw}` : ''}`)
    }
    out.push('')
  }

  out.push('## 자주 묻는 질문', '')
  for (const f of faq) out.push(`### ${f.q}`, '', f.a, '')

  out.push('## 참고', '', `- [사이트맵](${base}/sitemap.xml)`, `- [최신 제품 RSS](${base}/rss.xml)`, '')

  return new Response(out.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
