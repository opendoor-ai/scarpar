import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'discounts',
  name: '할인관리',
  description: '할인 코드와 자동 프로모션',
  nav: [{ label: '할인관리', href: '/admin/discounts', icon: 'BadgePercent' }],
}
