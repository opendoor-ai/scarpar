import { redirect } from 'next/navigation'

import { CORE_NAV, MODULE_LIST } from '@/modules/registry'
import type { DashboardWidgetId, ModuleDef, ModuleKey } from '@/modules/types'
import type { Org } from '@/types/db'

export interface NavItem {
  label: string
  href: string
  icon: string
  moduleKey?: ModuleKey
  /** 사이드바 묶음 이름 (공급사 메뉴처럼 모듈과 상관없이 묶을 때) */
  group?: string
}

/** Enabled modules for an org, in canonical MODULE_LIST order. */
export function enabledModules(org: Pick<Org, 'enabled_modules'>): ModuleDef[] {
  const enabled = new Set<string>(org.enabled_modules)
  return MODULE_LIST.filter((mod) => enabled.has(mod.key))
}

export function isModuleEnabled(org: Pick<Org, 'enabled_modules'>, key: ModuleKey): boolean {
  return org.enabled_modules.includes(key)
}

/** Guard for admin pages: `const ctx = await requireOrg(); requireModule(ctx.org, 'catalog')`. */
export function requireModule(org: Pick<Org, 'enabled_modules'>, key: ModuleKey): void {
  if (!isModuleEnabled(org, key)) {
    redirect('/admin')
  }
}

/** Sidebar data: enabled-module nav flattened, plus the always-on core nav. */
export function buildNav(org: Pick<Org, 'enabled_modules'>): { main: NavItem[]; core: NavItem[] } {
  const main: NavItem[] = enabledModules(org).flatMap((mod) =>
    mod.nav.map((entry) => ({ ...entry, moduleKey: mod.key })),
  )
  const core: NavItem[] = CORE_NAV.map((entry) => ({ ...entry }))
  return { main, core }
}

/** Dashboard widget ids across enabled modules, deduped, in module order. */
export function widgetsForOrg(org: Pick<Org, 'enabled_modules'>): DashboardWidgetId[] {
  const seen = new Set<DashboardWidgetId>()
  const widgets: DashboardWidgetId[] = []
  for (const mod of enabledModules(org)) {
    for (const widget of mod.dashboardWidgets ?? []) {
      if (!seen.has(widget)) {
        seen.add(widget)
        widgets.push(widget)
      }
    }
  }
  return widgets
}
