import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'orders',
  name: '주문관리',
  description: '주문 접수부터 배송, 반품까지',
  nav: [
    { label: '주문관리', href: '/admin/orders', icon: 'ShoppingCart' },
    { label: '반품관리', href: '/admin/returns', icon: 'ShoppingCart' },
  ],
  dashboardWidgets: ['sales-today', 'orders-recent'],
}
