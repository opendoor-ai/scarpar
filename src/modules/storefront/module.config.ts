import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'storefront',
  name: '쇼핑몰 설정',
  description: '공개 쇼핑몰 디자인과 주문 설정',
  nav: [{ label: '쇼핑몰 설정', href: '/admin/storefront', icon: 'Store' }],
}
