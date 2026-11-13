import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'receipts',
  name: '영수증·출력',
  description: '거래명세서, 영수증, 라벨 출력',
  nav: [{ label: '영수증·출력', href: '/admin/receipts', icon: 'Receipt' }],
}
