import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'reports',
  name: '보고서',
  description: '매출, 배송, 재무 보고서',
  nav: [{ label: '보고서', href: '/admin/reports', icon: 'BarChart3' }],
}
