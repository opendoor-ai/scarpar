// /robots.txt — 검색엔진·AI 로봇에 "어디는 가져가도 되고, 어디는 안 되는지" 알려줘요.
// 관리자 → 사이트 설정 → 검색엔진 최적화에서 로봇별 허용·차단, 추가 차단 주소, 다음 인증 문구를 정해요.

import { env } from '@/lib/env'
import { getSiteConfig } from '@/modules/site-config/get'

export const revalidate = 300

const ALWAYS_DISALLOW = [
  '/admin',
  '/api/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite/',
  '/onboarding',
  '/print/',
  '/minishop/*/admin',
  '/minishop/*/cart',
  '/minishop/*/checkout',
  '/minishop/*/order/',
  // 공급사 서브도메인(아이디.jeonjadong.com)에서의 같은 화면
  '/cart',
  '/checkout',
  '/order/',
  '/products?q=',
]

export async function GET() {
  const base = env.APP_URL.replace(/\/+$/, '')
  const { seo } = await getSiteConfig()
  const extra = seo.extraDisallow
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('/') && !/\s/.test(l))
  const lines: string[] = []
  const pin = seo.daumPin.trim()
  if (pin) lines.push(pin.startsWith('#') ? pin : `#${pin}`, '')

  // 막은 로봇
  for (const bot of seo.blockedCrawlers) {
    if (!/^[\w.-]+$/.test(bot)) continue
    lines.push(`User-agent: ${bot}`, 'Disallow: /', '')
  }

  // 나머지 모든 로봇
  lines.push('User-agent: *', 'Allow: /')
  for (const p of [...ALWAYS_DISALLOW, ...extra]) lines.push(`Disallow: ${p}`)
  lines.push('', `Sitemap: ${base}/sitemap.xml`, `Host: ${base}`, '')

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
