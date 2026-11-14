import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'catalog',
  name: '상품관리',
  description: '상품, 카테고리, 재고 관리',
  nav: [
    { label: '상품', href: '/admin/products', icon: 'Package' },
    { label: '카테고리', href: '/admin/categories', icon: 'Package' },
    { label: '상품 Q&A', href: '/admin/questions', icon: 'Package' },
    { label: '광고 성과', href: '/admin/stats', icon: 'Package' },
  ],
  dashboardWidgets: ['low-stock', 'top-products'],
}
