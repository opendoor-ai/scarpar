// Resolves the lucide icon-name strings stored on ModuleDef.nav / CORE_NAV
// entries (src/modules/*) to actual icon components. Explicit imports only —
// no dynamic requires, so bundlers can tree-shake unused icons.
import {
  BadgePercent,
  BarChart3,
  Building2,
  Circle,
  CreditCard,
  GraduationCap,
  Image,
  LayoutDashboard,
  LayoutTemplate,
  type LucideIcon,
  Megaphone,
  MessageSquareText,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  BadgePercent,
  Truck,
  Receipt,
  LayoutTemplate,
  Store,
  BarChart3,
  Wallet,
  Star,
  GraduationCap,
  Wrench,
  Building2,
  LayoutDashboard,
  Image,
  UserCog,
  ScrollText,
  Settings,
  Megaphone,
  MessageSquareText,
}

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
}
