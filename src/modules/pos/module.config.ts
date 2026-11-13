import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'pos',
  name: '매장 판매(POS)',
  description: '매장 방문 고객 현장 판매',
  nav: [{ label: '매장 판매(POS)', href: '/admin/pos', icon: 'CreditCard' }],
}
