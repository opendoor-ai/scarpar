import type { ModuleDef, ModuleKey } from './types'

import { config as catalog } from './catalog/module.config'
import { config as orders } from './orders/module.config'
import { config as pos } from './pos/module.config'
import { config as delivery } from './delivery/module.config'
import { config as receipts } from './receipts/module.config'
import { config as customers } from './customers/module.config'
import { config as discounts } from './discounts/module.config'
import { config as reviews } from './reviews/module.config'
import { config as courses } from './courses/module.config'
import { config as services } from './services/module.config'
import { config as listings } from './listings/module.config'
import { config as cms } from './cms/module.config'
import { config as storefront } from './storefront/module.config'
import { config as reports } from './reports/module.config'
import { config as expenses } from './expenses/module.config'

/** Lookup by key. */
export const MODULES: Record<ModuleKey, ModuleDef> = {
  catalog,
  orders,
  pos,
  customers,
  discounts,
  delivery,
  receipts,
  cms,
  storefront,
  reports,
  expenses,
  reviews,
  courses,
  services,
  listings,
}

/** Canonical sidebar/iteration order (distinct from MODULES' key order). */
export const MODULE_LIST: ModuleDef[] = [
  catalog,
  orders,
  pos,
  delivery,
  receipts,
  customers,
  discounts,
  reviews,
  courses,
  services,
  listings,
  cms,
  storefront,
  reports,
  expenses,
]

/**
 * Always-on nav, independent of enabled modules. Dashboard renders first;
 * Media / Staff / Audit Log / Settings render as a separate bottom nav
 * group in the sidebar UI (a rendering concern, not encoded here).
 */
export const CORE_NAV: { label: string; href: string; icon: string }[] = [
  { label: '대시보드', href: '/admin', icon: 'LayoutDashboard' },
  { label: '구매문의', href: '/admin/requests', icon: 'MessageSquareText' },
  { label: '직원관리', href: '/admin/staff', icon: 'UserCog' },
  { label: '활동 기록', href: '/admin/audit', icon: 'ScrollText' },
  { label: '설정', href: '/admin/settings', icon: 'Settings' },
]
