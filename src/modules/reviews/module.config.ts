import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'reviews',
  name: '리뷰관리',
  description: '고객 상품 리뷰 관리',
  nav: [{ label: '리뷰관리', href: '/admin/reviews', icon: 'Star' }],
  dashboardWidgets: ['reviews-pending'],
}
