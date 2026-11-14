import type { ReactNode } from 'react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { buildNav } from '@/lib/modules'
import { AdminShell } from '@/components/admin/shell'

export const dynamic = 'force-dynamic'

interface MembershipRow {
  org_id: string
  orgs: { id: string; name: string; is_active: boolean } | null
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requireOrg()
  const supabase = await getServerClient()

  let orgs: { id: string; name: string }[] = [{ id: ctx.org.id, name: ctx.org.name }]
  let unreadCount = 0
  let userName = ctx.user.email?.split('@')[0] ?? 'there'

  try {
    const [membershipsResult, profileResult, unreadResult] = await Promise.all([
      supabase
        .from('org_members')
        .select('org_id, orgs(id, name, is_active)')
        .eq('user_id', ctx.user.id),
      supabase.from('profiles').select('full_name').eq('user_id', ctx.user.id).maybeSingle(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.org.id)
        .is('read_at', null)
        .or(`user_id.eq.${ctx.user.id},user_id.is.null`),
    ])

    const memberships = (membershipsResult.data ?? []) as unknown as MembershipRow[]
    const activeOrgs = new Map<string, { id: string; name: string }>()
    for (const row of memberships) {
      if (row.orgs && row.orgs.is_active) {
        activeOrgs.set(row.orgs.id, { id: row.orgs.id, name: row.orgs.name })
      }
    }
    if (activeOrgs.size > 0) orgs = [...activeOrgs.values()]

    const fullName = (profileResult.data as { full_name: string | null } | null)?.full_name
    if (fullName) userName = fullName

    unreadCount = unreadResult.count ?? 0
  } catch {
    // Placeholder-env / transient failure — fall back to the safe defaults above
    // rather than taking the whole admin shell down.
  }

  const nav = buildNav(ctx.org)

  // 플랫폼 관리자(전자동)에게만 "플랫폼 관리" 메뉴 표시 (입점 신청 심사 등)
  try {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
    if (isPlatformAdmin) {
      nav.core.splice(
        1,
        0,
        { label: '플랫폼 관리', href: '/admin/platform', icon: 'Building2' },
        { label: '광고 관리', href: '/admin/ads', icon: 'Megaphone' },
        { label: '콘텐츠 관리', href: '/admin/contents', icon: 'LayoutTemplate' },
        { label: '사이트 설정', href: '/admin/site', icon: 'Settings' },
      )
    }
  } catch {
    // 확인 실패 시 메뉴만 숨김
  }

  return (
    <AdminShell
      org={ctx.org}
      role={ctx.role}
      nav={nav}
      orgs={orgs}
      user={{ name: userName, email: ctx.user.email ?? '' }}
      unreadCount={unreadCount}
    >
      {children}
    </AdminShell>
  )
}
