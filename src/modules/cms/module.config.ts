import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'cms',
  name: '콘텐츠 관리',
  description: '홈페이지 페이지 편집과 메뉴 관리',
  nav: [
    { label: '페이지', href: '/admin/cms/pages', icon: 'LayoutTemplate' },
    { label: '메뉴', href: '/admin/cms/menus', icon: 'LayoutTemplate' },
  ],
}
