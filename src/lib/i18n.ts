// Tiny storefront i18n dict (ko/en/bn). Korean is the default for this deployment.
// Bengali rendering: pair with the `.text-bengali` class on the rendered element.

export type Lang = 'ko' | 'en' | 'bn'

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

export const STRINGS: Record<StringKey, { ko: string; en: string; bn: string }> = {
  add_to_cart: { en: 'Add to cart', bn: 'কার্টে যোগ করুন', ko: '장바구니 담기' },
  checkout: { en: 'Checkout', bn: 'চেকআউট', ko: '주문하기' },
  place_order: { en: 'Place order', bn: 'অর্ডার করুন', ko: '주문 완료하기' },
  your_cart: { en: 'Your cart', bn: 'আপনার কার্ট', ko: '장바구니' },
  cart_empty: { en: 'Your cart is empty', bn: 'আপনার কার্ট খালি', ko: '장바구니가 비어 있습니다' },
  subtotal: { en: 'Subtotal', bn: 'সাবটোটাল', ko: '상품 금액' },
  delivery_charge: { en: 'Delivery charge', bn: 'ডেলিভারি চার্জ', ko: '배송비' },
  total: { en: 'Total', bn: 'সর্বমোট', ko: '합계' },
  advance_payable: { en: 'Advance payable', bn: 'অগ্রিম পরিশোধযোগ্য', ko: '선결제 금액' },
  cash_on_delivery: { en: 'Cash on delivery', bn: 'ক্যাশ অন ডেলিভারি', ko: '착불 결제' },
  phone: { en: 'Phone number', bn: 'ফোন নম্বর', ko: '전화번호' },
  name: { en: 'Name', bn: 'নাম', ko: '이름' },
  address: { en: 'Address', bn: 'ঠিকানা', ko: '주소' },
  district: { en: 'District', bn: 'জেলা', ko: '지역' },
  track_order: { en: 'Track order', bn: 'অর্ডার ট্র্যাক করুন', ko: '주문 조회' },
  order_placed: { en: 'Order placed', bn: 'অর্ডার সম্পন্ন হয়েছে', ko: '주문이 접수되었습니다' },
  continue_shopping: { en: 'Continue shopping', bn: 'কেনাকাটা চালিয়ে যান', ko: '계속 둘러보기' },
  search: { en: 'Search', bn: 'খুঁজুন', ko: '검색' },
  all_products: { en: 'All products', bn: 'সকল পণ্য', ko: '전체 상품' },
  out_of_stock: { en: 'Out of stock', bn: 'স্টক নেই', ko: '품절' },
  quantity: { en: 'Quantity', bn: 'পরিমাণ', ko: '수량' },
  remove: { en: 'Remove', bn: 'সরান', ko: '삭제' },
  payment_method: { en: 'Payment method', bn: 'পেমেন্ট পদ্ধতি', ko: '결제 방법' },
  send_money_instructions: { en: 'Send money instructions', bn: 'টাকা পাঠানোর নির্দেশনা', ko: '송금 안내' },
  transaction_id: { en: 'Transaction ID', bn: 'ট্রানজেকশন আইডি', ko: '거래 번호' },
  pending: { en: 'Pending', bn: 'অপেক্ষমাণ', ko: '접수' },
  assigned: { en: 'Assigned', bn: 'বরাদ্দকৃত', ko: '배정됨' },
  picked_up: { en: 'Picked Up', bn: 'সংগৃহীত', ko: '집하 완료' },
  in_transit: { en: 'In Transit', bn: 'পথে আছে', ko: '배송 중' },
  delivered: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন', ko: '배송 완료' },
  failed: { en: 'Failed', bn: 'ব্যর্থ', ko: '배송 실패' },
  returned: { en: 'Returned', bn: 'ফেরত', ko: '반송' },
}

export function t(key: StringKey, lang: Lang = 'ko'): string {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.ko ?? key
}
