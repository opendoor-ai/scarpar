'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerClient } from '@/lib/supabase/server'
import { ORG_COOKIE, requireUser } from '@/lib/auth'

/** 이 공급사의 직원(또는 메인 관리자)인지 확인한 뒤, 관리자 화면에서 볼 공급사로 정하고 /admin으로 이동 */
export async function setActiveOrg(orgId: string): Promise<void> {
  const user = await requireUser()
  const supabase = await getServerClient()

  const { data: membership, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (error || !membership) {
    // 메인(플랫폼) 관리자는 어느 공급사든 들어갈 수 있음
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
    if (!isPlatformAdmin) redirect('/onboarding')
  }

  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  redirect('/admin')
}
