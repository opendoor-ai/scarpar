// /manifest.webmanifest — 휴대폰 "홈 화면에 추가" 바로가기 정보
// 관리자 → 사이트 설정 → 바로가기 설정에서 이름·색·아이콘을 정해요.

import type { MetadataRoute } from 'next'

import { mediaUrl } from '@/lib/media-url'
import { SITE_NAME } from '@/lib/site'
import { getSiteConfig } from '@/modules/site-config/get'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { app, seo } = await getSiteConfig()
  const icon = app.icon || seo.favicon
  return {
    name: app.name || SITE_NAME,
    short_name: app.shortName || SITE_NAME,
    description: seo.description,
    start_url: '/',
    scope: '/',
    lang: 'ko',
    display: app.display,
    theme_color: app.themeColor,
    background_color: app.backgroundColor,
    ...(icon
      ? {
          icons: [
            { src: mediaUrl(icon), sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: mediaUrl(icon), sizes: '192x192', type: 'image/png', purpose: 'any' },
          ],
        }
      : {}),
  }
}
