// 카카오·네이버 간편로그인 후 돌아오는 주소 (/auth/callback)
// Supabase가 넘겨준 일회용 code를 로그인 세션(쿠키)으로 바꾼 뒤 원래 가려던 곳으로 보냅니다.

import { NextResponse, type NextRequest } from 'next/server'

import { getServerClient } from '@/lib/supabase/server'

/** 외부 주소로 튕겨 나가지 않도록 우리 사이트 안 경로만 허용 */
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('://')) return '/admin'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  // 사용자가 로그인 화면에서 "취소"를 누른 경우 등
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (providerError) {
    const url = new URL('/login', origin)
    url.searchParams.set('error', '간편로그인이 취소되었거나 실패했습니다. 다시 시도해 주세요.')
    return NextResponse.redirect(url)
  }

  if (code) {
    const supabase = await getServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
    console.error('[auth/callback] exchange failed:', error.message)
  }

  const url = new URL('/login', origin)
  url.searchParams.set('error', '간편로그인에 실패했습니다. 다시 시도해 주세요.')
  return NextResponse.redirect(url)
}
