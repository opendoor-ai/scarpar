// 쇼핑몰 화면 글자 사전 (한국어 기본 / 영어).

export type Lang = 'ko' | 'en'

export type StringKey =
  | 'add_to_cart'
  | 'checkout'
  | 'place_order'
  | 'your_cart'
  | 'cart_empty'
  | 'subtotal'
  | 'delivery_charge'
  | 'total'
  | 'advance_payable'
  | 'cash_on_delivery'
  | 'phone'
  | 'name'
  | 'address'
  | 'district'
  | 'track_order'
  | 'order_placed'
  | 'continue_shopping'
  | 'search'
  | 'all_products'
  | 'out_of_stock'
  | 'quantity'
  | 'remove'
  | 'payment_method'
  | 'send_money_instructions'
  | 'transaction_id'
  // Delivery/track-page statuses (src/lib/status.ts DeliveryStatus) — shared across
  // the public /track/[code] page and any storefront delivery-status display.
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned'

export const STRINGS: Record<StringKey, { ko: string; en: string }> = {
  add_to_cart: { en: 'Add to cart', ko: '장바구니 담기' },
  checkout: { en: 'Checkout', ko: '주문하기' },
  place_order: { en: 'Place order', ko: '주문 완료하기' },
  your_cart: { en: 'Your cart', ko: '장바구니' },
  cart_empty: { en: 'Your cart is empty', ko: '장바구니가 비어 있습니다' },
  subtotal: { en: 'Subtotal', ko: '상품 금액' },
  delivery_charge: { en: 'Delivery charge', ko: '배송비' },
  total: { en: 'Total', ko: '합계' },
  advance_payable: { en: 'Advance payable', ko: '선결제 금액' },
  cash_on_delivery: { en: 'Cash on delivery', ko: '착불 결제' },
  phone: { en: 'Phone number', ko: '전화번호' },
  name: { en: 'Name', ko: '이름' },
  address: { en: 'Address', ko: '주소' },
  district: { en: 'District', ko: '지역' },
  track_order: { en: 'Track order', ko: '주문 조회' },
  order_placed: { en: 'Order placed', ko: '주문이 접수되었습니다' },
  continue_shopping: { en: 'Continue shopping', ko: '계속 둘러보기' },
  search: { en: 'Search', ko: '검색' },
  all_products: { en: 'All products', ko: '전체 상품' },
  out_of_stock: { en: 'Out of stock', ko: '품절' },
  quantity: { en: 'Quantity', ko: '수량' },
  remove: { en: 'Remove', ko: '삭제' },
  payment_method: { en: 'Payment method', ko: '결제 방법' },
  send_money_instructions: { en: 'Send money instructions', ko: '송금 안내' },
  transaction_id: { en: 'Transaction ID', ko: '거래 번호' },
  pending: { en: 'Pending', ko: '접수' },
  assigned: { en: 'Assigned', ko: '배정됨' },
  picked_up: { en: 'Picked Up', ko: '집하 완료' },
  in_transit: { en: 'In Transit', ko: '배송 중' },
  delivered: { en: 'Delivered', ko: '배송 완료' },
  failed: { en: 'Failed', ko: '배송 실패' },
  returned: { en: 'Returned', ko: '반송' },
}

export function t(key: StringKey, lang: Lang = 'ko'): string {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.ko ?? key
}
