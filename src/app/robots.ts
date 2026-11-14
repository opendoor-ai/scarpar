// /robots.txt — 검색엔진에 "어디는 수집해도 되고, 어디는 안 되는지" 알려줍니다.
// 관리자·로그인·장바구니·주문 화면은 검색 결과에 나오지 않게 막습니다.

import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = env.APP_URL.replace(/\/+$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/s/', '/track'],
        disallow: [
          '/admin',
          '/api/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/invite/',
          '/onboarding',
          '/print/',
          '/s/*/cart',
          '/s/*/checkout',
          '/s/*/order/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
