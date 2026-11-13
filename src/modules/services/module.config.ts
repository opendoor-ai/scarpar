import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'services',
  name: '서비스 작업',
  description: '서비스 작업, 견적, 예약 관리',
  nav: [{ label: '서비스 작업', href: '/admin/services', icon: 'Wrench' }],
  dashboardWidgets: ['jobs-today'],
}
