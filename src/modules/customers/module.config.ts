import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'customers',
  name: '고객관리',
  description: '고객 정보, 주문 이력, 차단 목록',
  nav: [{ label: '고객관리', href: '/admin/customers', icon: 'Users' }],
}
