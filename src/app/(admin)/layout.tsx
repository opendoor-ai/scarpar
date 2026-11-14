import type { ReactNode } from 'react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { buildNav } from '@/lib/modules'
import { getAdminMode, supplierNav } from '@/lib/admin-mode'
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
    // 메인 관리자가 대신 보고 있는 공급사도 목록에 보이게
    if (!orgs.some((o) => o.id === ctx.org.id)) orgs = [{ id: ctx.org.id, name: ctx.org.name }, ...orgs]

    const fullName = (profileResult.data as { full_name: string | null } | null)?.full_name
    if (fullName) userName = fullName

    unreadCount = unreadResult.count ?? 0
  } catch {
    // Placeholder-env / transient failure — fall back to the safe defaults above
    // rather than taking the whole admin shell down.
  }

  // 메인 관리자(전자동) / 공급사 관리자 — 모드마다 메뉴가 달라요
  const mode = await getAdminMode(ctx)
  const nav = mode === 'supplier' ? supplierNav() : buildNav(ctx.org)
  let platformAdmin = false

  // 메인 관리자 메뉴 (입점 신청 심사, 공급사 관리 등)
  try {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
    platformAdmin = Boolean(isPlatformAdmin)
    if (isPlatformAdmin && mode === 'main') {
      nav.core.splice(
        1,
        0,
        { label: '플랫폼 관리', href: '/admin/platform', icon: 'Building2' },
        { label: '공급사 관리', href: '/admin/suppliers', icon: 'Store' },
        { label: '광고 관리', href: '/admin/ads', icon: 'Megaphone' },
        { label: '콘텐츠 관리', href: '/admin/contents', icon: 'LayoutTemplate' },
      )
      // 사이트 설정 묶음 (카페24 쇼핑몰 설정처럼)
      nav.main.push(
        { group: '사이트 설정', label: '내 쇼핑몰 정보', href: '/admin/site', icon: 'Settings' },
        { group: '사이트 설정', label: '검색엔진 최적화(SEO)', href: '/admin/site/seo', icon: 'Settings' },
        { group: '사이트 설정', label: '상품검색 설정', href: '/admin/site/search', icon: 'Settings' },
        { group: '사이트 설정', label: '상품정보표시 설정', href: '/admin/site/display', icon: 'Settings' },
        { group: '사이트 설정', label: '바로가기 설정', href: '/admin/site/app', icon: 'Settings' },
        { group: '사이트 설정', label: '도메인 안내', href: '/admin/site/domain', icon: 'Settings' },
      )
    }
  } catch {
    // 확인 실패 시 메뉴만 숨김
  }

  return (
    <AdminShell
      mode={mode}
      org={ctx.org}
      role={ctx.role}
      nav={nav}
      orgs={orgs}
      user={{ name: userName, email: ctx.user.email ?? '' }}
      unreadCount={unreadCount}
    >
      {(platformAdmin && mode === 'supplier') || !ctx.org.is_active ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40 px-4 py-2.5 text-sm">
          <b className="text-indigo-600">메인 관리자가 보는 중</b>
          <span>
            지금 <b>{ctx.org.name}</b>의 공급사 관리자 화면을 대신 보고 있어요.
            {!ctx.org.is_active ? <b className="ml-1 text-red-600">(운영 중지된 공급사)</b> : null} 여기서 바꾸는 내용은 이 공급사에 바로 반영돼요.
          </span>
          <a href="/admin/main?to=/admin/suppliers" className="ml-auto font-semibold text-primary hover:underline">
            메인 관리자로 돌아가기 →
          </a>
        </div>
      ) : null}
      {children}
    </AdminShell>
  )
}
