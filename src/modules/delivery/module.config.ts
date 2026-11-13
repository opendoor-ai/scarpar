import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'delivery',
  name: '배송',
  description: '배송 지역, 배송기사, 택배사, 착불 정산',
  nav: [
    { label: '배송관리', href: '/admin/deliveries', icon: 'Truck' },
    { label: '배송 지역', href: '/admin/delivery-zones', icon: 'Truck' },
    { label: '배송기사', href: '/admin/riders', icon: 'Truck' },
    { label: '착불 정산', href: '/admin/cod', icon: 'Truck' },
  ],
  dashboardWidgets: ['deliveries-pending', 'cod-outstanding'],
}
