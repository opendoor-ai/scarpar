// 관리자 화면 모드
// - main(메인 관리자): 전자동(플랫폼) 관리자가 전자동 회사로 들어왔을 때 — 사이트 전체 관리 메뉴
// - supplier(공급사 관리자): 공급사 직원, 또는 메인 관리자가 특정 공급사 화면을 열었을 때 — 그 공급사 메뉴만

import { cache } from 'react'

import type { OrgContext } from '@/lib/auth'
import type { NavItem } from '@/lib/modules'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { SUPPLIER_SECTIONS } from '@/lib/supplier-menu'

export type AdminMode = 'main' | 'supplier'

export const getAdminMode = cache(async (ctx: OrgContext): Promise<AdminMode> => {
  if (ctx.org.slug !== PLATFORM_ORG_SLUG) return 'supplier'
  return (await isPlatformAdmin()) ? 'main' : 'supplier'
})

/** 사이드바·검색창용 평평한 메뉴 (공급사 관리자) */
export function supplierNav(): { main: NavItem[]; core: NavItem[] } {
  const main: NavItem[] = SUPPLIER_SECTIONS.flatMap((sec) =>
    sec.items.filter((it) => it.href !== '/admin').map((it) => ({ group: sec.label, label: it.label, href: it.href, icon: sec.icon })),
  )
  return { main, core: [{ label: '대시보드', href: '/admin', icon: 'LayoutDashboard' }] }
}
