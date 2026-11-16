// 공급사 미니샵 서브도메인 연결 — `공급사아이디.jeonjadong.com/...` → 내부 `/minishop/공급사아이디/...` 화면
// NEXT_PUBLIC_ROOT_DOMAIN 이 비어 있으면 아무것도 하지 않아요. (자세한 설명: src/lib/domains.ts)
//
// 서브도메인(미니샵)에서
//   /, /products, /products/10001, /cart, /checkout, /order/.., /회사소개 같은 미니샵 화면 → 내부 미니샵 화면으로 연결
//   /admin                    → 대표 도메인의 공급사 관리자 로그인(/minishop/아이디/admin)으로 이동
//   /login, /requests 등 대표 사이트 화면 → 대표 도메인으로 이동 (로그인·관리자는 항상 대표 도메인에서)
//   /minishop/아이디/...       → 깔끔한 주소(/...)로 이동
// 대표 도메인에서
//   /minishop/아이디/...       → 아이디.jeonjadong.com/... 로 이동 (예전 주소·검색엔진 주소 정리)

import { NextResponse, type NextRequest } from 'next/server'

import { ROOT_DOMAIN } from '@/lib/domains'

/** 서브도메인에서도 그대로 두는 주소 (공통 기능) */
const PASS_THROUGH = new Set(['api', 'track', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'llms.txt', 'rss.xml', 'favicon.ico', 'icon', 'apple-icon'])
/** 대표 도메인에서만 여는 화면 */
const ROOT_ONLY = new Set([
  'login', 'signup', 'forgot-password', 'reset-password', 'invite', 'onboarding', 'auth', 'print',
  'requests', 'suppliers', 'advertise', 'magazine', 'support', 'minishop',
])
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function middleware(req: NextRequest) {
  if (!ROOT_DOMAIN) return NextResponse.next()

  const host = (req.headers.get('host') ?? '').toLowerCase()
  const { pathname, search, protocol } = req.nextUrl
  const rootOrigin = `${protocol}//${ROOT_DOMAIN}`

  // 대표 도메인 (www 포함)
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    const m = pathname.match(/^\/minishop\/([a-z0-9-]+)(\/.*)?$/)
    // 관리자 로그인(/minishop/아이디/admin)은 대표 도메인에 그대로 (로그인 정보가 대표 도메인에 있어요)
    if (m && req.method === 'GET' && !(m[2] ?? '').startsWith('/admin')) {
      return NextResponse.redirect(`${protocol}//${m[1]}.${ROOT_DOMAIN}${m[2] ?? '/'}${search}`, 308)
    }
    return NextResponse.next()
  }

  // 공급사 서브도메인
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return NextResponse.next()
  const sub = host.slice(0, -(ROOT_DOMAIN.length + 1))
  if (!SLUG.test(sub)) return NextResponse.next()

  const first = pathname.split('/')[1] ?? ''
  if (PASS_THROUGH.has(first)) return NextResponse.next()

  if (first === 'admin') return NextResponse.redirect(`${rootOrigin}/minishop/${sub}/admin`, 307)

  if (first === 'minishop') {
    const m = pathname.match(/^\/minishop\/([a-z0-9-]+)(\/.*)?$/)
    if (m && m[1] === sub && !(m[2] ?? '').startsWith('/admin')) {
      return NextResponse.redirect(new URL(`${m[2] ?? '/'}${search}`, req.url), 308)
    }
    return NextResponse.redirect(`${rootOrigin}${pathname}${search}`, 307)
  }

  if (ROOT_ONLY.has(first)) return NextResponse.redirect(`${rootOrigin}${pathname}${search}`, 307)

  const url = req.nextUrl.clone()
  url.pathname = `/minishop/${sub}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // 화면 주소만 (Next 내부 파일·이미지·확장자 있는 파일은 제외)
  matcher: ['/((?!_next/static|_next/image|_next/data|.*\\.[a-zA-Z0-9]{2,5}$).*)'],
}
