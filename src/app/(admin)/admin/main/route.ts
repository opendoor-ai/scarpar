// 메인 관리자 화면으로 돌아가기: /admin/main?to=/admin/suppliers
// 공급사 관리자 화면을 대신 보던 메인 관리자가 전자동(플랫폼) 회사로 다시 바꿔요.

import { NextResponse, type NextRequest } from 'next/server'

import { ORG_COOKIE } from '@/lib/auth'
import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { getServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to') ?? '/admin'
  const safeTo = to.startsWith('/admin') && !to.startsWith('//') ? to : '/admin'
  const supabase = await getServerClient()
  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
  if (!isPlatformAdmin) return NextResponse.redirect(new URL('/admin', request.url))

  const { data: org } = await supabase.from('orgs').select('id').eq('slug', PLATFORM_ORG_SLUG).maybeSingle()
  const res = NextResponse.redirect(new URL(safeTo, request.url))
  const orgId = (org as { id: string } | null)?.id
  if (orgId) {
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return res
}
