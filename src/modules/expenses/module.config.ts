import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'expenses',
  name: '지출관리',
  description: '분류별 지출 기록',
  nav: [{ label: '지출관리', href: '/admin/expenses', icon: 'Wallet' }],
  dashboardWidgets: ['expenses-month'],
}
