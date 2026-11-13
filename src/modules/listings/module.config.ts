import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'listings',
  name: '매물관리',
  description: '부동산 매물과 구매 문의',
  nav: [{ label: '매물관리', href: '/admin/listings', icon: 'Building2' }],
  dashboardWidgets: ['listings-active', 'inquiries-new'],
}
