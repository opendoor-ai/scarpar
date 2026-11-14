// 공급사 관리자 메뉴 정의 (화면·서버 모두에서 씀)

/** 공급사 관리자 메뉴 — 위쪽 큰 메뉴(구역) + 왼쪽 세부 메뉴 (카페24 공급사관리자페이지처럼) */
export interface SupplierSection {
  key: string
  label: string
  icon: string
  items: { label: string; href: string }[]
}

export const SUPPLIER_SECTIONS: SupplierSection[] = [
  {
    key: 'store',
    label: '상점관리',
    icon: 'Store',
    items: [
      { label: '대시보드', href: '/admin' },
      { label: '공급사 기본정보', href: '/admin/supplier-info' },
      { label: '직원·로그인 계정', href: '/admin/staff' },
      { label: '활동 기록', href: '/admin/audit' },
    ],
  },
  {
    key: 'products',
    label: '상품관리',
    icon: 'Package',
    items: [
      { label: '상품 목록', href: '/admin/products' },
      { label: '상품 등록', href: '/admin/products/new' },
      { label: '엑셀 대량 등록', href: '/admin/products/import' },
      { label: '상품분류 보기', href: '/admin/categories' },
    ],
  },
  {
    key: 'board',
    label: '문의관리',
    icon: 'MessageSquareText',
    items: [
      { label: '상품 Q&A', href: '/admin/questions' },
      { label: '구매문의', href: '/admin/requests' },
    ],
  },
  {
    key: 'design',
    label: '디자인관리',
    icon: 'LayoutTemplate',
    items: [
      { label: '미니샵 설정', href: '/admin/storefront' },
      { label: '판매정보 표시설정', href: '/admin/seller-display' },
      { label: '미니샵 배너', href: '/admin/banners' },
      { label: '미니샵 페이지', href: '/admin/cms/pages' },
      { label: '미니샵 메뉴', href: '/admin/cms/menus' },
    ],
  },
  {
    key: 'marketing',
    label: '광고·성과',
    icon: 'BarChart3',
    items: [
      { label: '광고 성과', href: '/admin/stats' },
      { label: '점프 (상품 목록)', href: '/admin/products?sort=display_desc' },
    ],
  },
]

