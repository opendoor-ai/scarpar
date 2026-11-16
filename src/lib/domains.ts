// 공급사 미니샵 서브도메인 — `공급사아이디.jeonjadong.com`
//
// 환경변수 NEXT_PUBLIC_ROOT_DOMAIN 에 대표 도메인(예: jeonjadong.com)을 넣으면 켜져요.
//  - 미니샵 링크가 모두 `https://공급사아이디.jeonjadong.com/...` 으로 만들어지고
//  - src/middleware.ts 가 서브도메인 주소를 내부 `/minishop/공급사아이디/...` 화면으로 연결해요.
//  - 공급사가 새로 생기면(공급사 생성·등록 승인) 따로 할 일 없이 바로 그 주소가 열려요
//    (Vercel 에 `*.jeonjadong.com` 와일드카드 도메인을 한 번만 연결해 두면 됨 — docs/배포-안내.md).
// 비워 두면 지금처럼 `/minishop/공급사아이디` 주소를 써요. (내 컴퓨터 시험: localhost:3000 → abc.localhost:3000)

import { env } from '@/lib/env'

/** 대표 도메인 (예: jeonjadong.com, 시험용 localhost:3000). 비어 있으면 서브도메인 끔 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .replace(/\/+$/, '')

export const subdomainsEnabled = ROOT_DOMAIN !== ''

const PROTO = env.APP_URL.startsWith('http://') ? 'http:' : 'https:'

/** `https://공급사아이디.jeonjadong.com` */
export function minishopOrigin(slug: string): string {
  return `${PROTO}//${slug}.${ROOT_DOMAIN}`
}

/** 대표 사이트(전자동기계광고) 주소 — 미니샵(서브도메인)에서 대표 사이트로 갈 때. 서브도메인이 꺼져 있으면 그대로 */
export function platformUrl(path = '/'): string {
  return subdomainsEnabled ? `${PROTO}//${ROOT_DOMAIN}${path}` : path
}

/** 검색엔진·공유용 미니샵 전체 주소 (항상 https://... 형태) */
export function minishopUrl(slug: string, path = ''): string {
  const clean = !path || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  if (subdomainsEnabled) return `${minishopOrigin(slug)}${clean || '/'}`
  return `${env.APP_URL.replace(/\/+$/, '')}/minishop/${slug}${clean}`
}

/** 화면에 보여줄 미니샵 주소 (예: hanil.jeonjadong.com 또는 /minishop/hanil) */
export function minishopLabel(slug: string): string {
  return subdomainsEnabled ? `${slug}.${ROOT_DOMAIN}` : `/minishop/${slug}`
}

/**
 * 공급사 아이디로 쓸 수 없는 이름 — 대표 사이트 주소와 겹치거나, 서브도메인으로 쓰면 안 되는 이름
 * (공급사 생성 · 공급사 등록 신청 모두 이 목록으로 막아요)
 */
export const RESERVED_SLUGS = new Set([
  // 대표 사이트 주소
  'admin', 'api', 'products', 'product', 'login', 'signup', 'track', 's', 'jadong', 'minishop', 'requests',
  'suppliers', 'support', 'advertise', 'magazine', 'onboarding', 'auth', 'print', 'invite', 'cart', 'checkout', 'order',
  // 서브도메인으로 흔히 쓰는 이름
  'www', 'm', 'mobile', 'app', 'apps', 'mail', 'email', 'webmail', 'smtp', 'imap', 'pop', 'pop3', 'ftp', 'ns', 'ns1', 'ns2',
  'cdn', 'static', 'assets', 'img', 'image', 'images', 'media', 'files', 'blog', 'shop', 'store', 'help', 'dev', 'test',
  'staging', 'stage', 'beta', 'demo', 'status', 'docs', 'dashboard', 'partner', 'partners', 'jeonjadong',
])
