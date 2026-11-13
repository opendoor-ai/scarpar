import type { Vertical } from '@/types/db'

import type { ModuleKey } from './types'

export const VERTICAL_PRESETS: Record<
  Vertical,
  { name: string; description: string; modules: ModuleKey[]; icon: string }
> = {
  ecommerce: {
    name: '쇼핑몰·기계 광고',
    description: '상품을 온라인에 전시하고 판매·문의를 받습니다.',
    modules: [
      'catalog',
      'orders',
      'pos',
      'customers',
      'discounts',
      'delivery',
      'receipts',
      'cms',
      'storefront',
      'reports',
      'expenses',
      'reviews',
    ],
    icon: 'Store',
  },
  courses: {
    name: '온라인 강의',
    description: '온라인 강의를 판매하고 수강생을 관리합니다.',
    modules: [
      'courses',
      'orders',
      'customers',
      'discounts',
      'cms',
      'storefront',
      'receipts',
      'reports',
      'expenses',
    ],
    icon: 'GraduationCap',
  },
  services: {
    name: '서비스업',
    description: '작업, 견적, 예약을 관리합니다.',
    modules: ['services', 'orders', 'customers', 'receipts', 'reports', 'expenses', 'cms'],
    icon: 'Wrench',
  },
  realestate: {
    name: '부동산',
    description: '매물을 등록하고 구매 문의를 관리합니다.',
    modules: ['listings', 'customers', 'cms', 'storefront', 'reports', 'expenses'],
    icon: 'Building2',
  },
}

export const DEFAULT_VERTICAL: Vertical = 'ecommerce'
