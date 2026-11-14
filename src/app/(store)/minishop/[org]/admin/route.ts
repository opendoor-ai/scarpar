// 공급사별 관리자 입구: /minishop/{공급사아이디}/admin
// - 로그인 안 했으면 → 로그인 화면 (로그인 후 다시 여기로)
// - 이 공급사의 직원이거나 메인(플랫폼) 관리자면 → 이 공급사를 고른 상태로 관리자 화면(/admin)
// - 그 외 → 미니샵으로 돌려보냄

import { NextResponse, type NextRequest } from 'next/server'

import { ORG_COOKIE } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { decodeParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ org: string }> }) {
  const slug = decodeParam((await params).org)
  const here = `/minishop/${encodeURIComponent(slug)}/admin`
  const supabase = await getServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(here)}`, request.url))
  }

  // 이 공급사 찾기 (직원·메인 관리자만 보임 — 공개 정보로도 확인)
  const { data: org } = await supabase.from('orgs').select('id').eq('slug', slug).maybeSingle()
  const orgId = (org as { id: string } | null)?.id
  if (!orgId) {
    return NextResponse.redirect(new URL(`/minishop/${encodeURIComponent(slug)}?admin=denied`, request.url))
  }

  const [{ data: member }, { data: isPlatformAdmin }] = await Promise.all([
    supabase.from('org_members').select('org_id').eq('org_id', orgId).eq('user_id', user.id).maybeSingle(),
    supabase.rpc('is_platform_admin'),
  ])
  if (!member && !isPlatformAdmin) {
    return NextResponse.redirect(new URL(`/minishop/${encodeURIComponent(slug)}?admin=denied`, request.url))
  }

  const res = NextResponse.redirect(new URL('/admin', request.url))
  res.cookies.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
