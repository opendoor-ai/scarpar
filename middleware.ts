import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/lib/env'

// Kept as a literal (not imported from '@/lib/auth') to keep middleware's
// dependency graph minimal — it runs on every request. Keep in sync with
// ORG_COOKIE in src/lib/auth.ts.
const ORG_COOKIE = 'jadong-org'
/** 예전 이름 (자동으로 새 이름으로 옮김) */
const LEGACY_ORG_COOKIE = 'scarpar-org'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Refresh the session so server components downstream see a valid cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAdminPath = pathname.startsWith('/admin')
  const isOnboardingPath = pathname.startsWith('/onboarding')

  if ((isAdminPath || isOnboardingPath) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAdminPath && user) {
    const hasOrgCookie = Boolean(request.cookies.get(ORG_COOKIE)?.value)
    if (!hasOrgCookie) {
      // 선택한 회사가 기억돼 있지 않으면: 예전 이름의 쿠키 → 없으면 내가 속한 첫 회사를 자동으로 고름
      let orgId = request.cookies.get(LEGACY_ORG_COOKIE)?.value ?? null
      if (!orgId) {
        const { data } = await supabase
          .from('org_members')
          .select('org_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        orgId = (data as { org_id: string } | null)?.org_id ?? null
      }
      if (!orgId) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
      request.cookies.set(ORG_COOKIE, orgId)
      const next = NextResponse.next({ request })
      response.cookies.getAll().forEach((c) => next.cookies.set(c))
      next.cookies.set(ORG_COOKIE, orgId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
      next.cookies.delete(LEGACY_ORG_COOKIE)
      return next
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml)$).*)',
  ],
}
