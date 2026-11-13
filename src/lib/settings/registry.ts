// Settings engine registry (docs/architecture.md §5 — binding contract).
// Settings UI (src/app/(admin)/admin/settings) renders groups from SETTING_DEFS.
import type { Role } from '@/types/db'

export type SettingType = 'boolean' | 'number' | 'text' | 'select' | 'json'

export type SettingGroup =
  | 'checkout'
  | 'payments'
  | 'delivery'
  | 'fraud'
  | 'inventory'
  | 'notifications'
  | 'tax'
  | 'localization'
  | 'printing'
  | 'storefront'

export interface SettingOption {
  value: string
  label: string
}

export interface SettingDef {
  key: string
  group: SettingGroup
  label: string
  help?: string
  type: SettingType
  options?: SettingOption[]
  default: unknown
  /** Roles allowed to view/edit this setting. Unset = any admin-side role. */
  roles?: Role[]
}

export const SETTING_GROUPS: SettingGroup[] = [
  'checkout',
  'payments',
  'delivery',
  'fraud',
  'inventory',
  'notifications',
  'tax',
  'localization',
  'printing',
  'storefront',
]

export const SETTING_DEFS: SettingDef[] = [
  // checkout ------------------------------------------------------------
  {
    key: 'checkout.guest_enabled',
    group: 'checkout',
    label: '비회원 주문 허용',
    type: 'boolean',
    default: true,
  },
  {
    key: 'checkout.min_order',
    group: 'checkout',
    label: '최소 주문 금액 (원)',
    type: 'number',
    default: 0,
  },

  // payments --------------------------------------------------------------
  {
    key: 'payments.cod_enabled',
    group: 'payments',
    label: '착불(현장 결제) 허용',
    type: 'boolean',
    default: true,
  },
  {
    key: 'payments.advance_required',
    group: 'payments',
    label: '선결제 필수',
    type: 'boolean',
    default: false,
  },
  {
    key: 'payments.advance_amount',
    group: 'payments',
    label: '선결제 금액 (원)',
    help: '선결제 방식이 "고정 금액"일 때 사용',
    type: 'number',
    default: 12000,
  },
  {
    key: 'payments.advance_type',
    group: 'payments',
    label: '선결제 방식',
    type: 'select',
    options: [
      { value: 'fixed', label: '고정 금액' },
      { value: 'percent', label: '합계의 일정 비율(%)' },
    ],
    default: 'fixed',
  },
  {
    key: 'payments.methods',
    group: 'payments',
    label: '사용할 결제 방법',
    help: '사용 가능 값: cod, bkash, nagad, uddoktapay, sslcommerz, bank, cash',
    type: 'json',
    default: ['cod', 'bkash', 'nagad'],
  },
  {
    key: 'payments.uddoktapay.enabled',
    group: 'payments',
    label: 'UddoktaPay 사용 (방글라데시 결제)',
    type: 'boolean',
    default: false,
  },
  {
    key: 'payments.uddoktapay.api_key',
    group: 'payments',
    label: 'UddoktaPay API 키',
    type: 'text',
    default: '',
    roles: ['owner', 'admin'],
  },
  {
    key: 'payments.uddoktapay.base_url',
    group: 'payments',
    label: 'UddoktaPay 주소',
    type: 'text',
    default: '',
    roles: ['owner', 'admin'],
  },
  {
    key: 'payments.manual_mfs.enabled',
    group: 'payments',
    label: 'bKash/Nagad 수동 결제 사용 (방글라데시)',
    type: 'boolean',
    default: true,
  },
  {
    key: 'payments.manual_mfs.numbers',
    group: 'payments',
    label: '송금 받을 번호',
    help: '주문 화면에 표시되어 고객이 어디로 송금할지 알 수 있습니다',
    type: 'json',
    default: { bkash: '', nagad: '' },
  },

  // delivery ----------------------------------------------------------------
  {
    key: 'delivery.default_zone_fallback',
    group: 'delivery',
    label: '기본 배송비 (원)',
    help: '고객 지역이 등록된 배송 지역에 없을 때 적용',
    type: 'number',
    default: 0,
  },
  {
    key: 'delivery.free_above',
    group: 'delivery',
    label: '무료배송 기준 금액 (원)',
    help: '0이면 무료배송 없음',
    type: 'number',
    default: 0,
  },

  // fraud ---------------------------------------------------------------
  {
    key: 'fraud.enabled',
    group: 'fraud',
    label: '부정 주문 검사 사용',
    type: 'boolean',
    default: false,
  },
  {
    key: 'fraud.provider',
    group: 'fraud',
    label: '검사 서비스',
    type: 'select',
    options: [
      { value: 'fraudbd', label: 'FraudBD' },
      { value: 'disabled', label: '사용 안 함' },
    ],
    default: 'disabled',
  },
  {
    key: 'fraud.high_risk_action',
    group: 'fraud',
    label: '위험 주문 처리 방식',
    type: 'select',
    options: [
      { value: 'block', label: '주문 차단' },
      { value: 'require_full_advance', label: '전액 선결제 요구' },
      { value: 'flag', label: '표시만 하기' },
    ],
    default: 'flag',
  },

  // inventory -----------------------------------------------------------
  {
    key: 'inventory.track_stock',
    group: 'inventory',
    label: '재고 수량 관리',
    type: 'boolean',
    default: true,
  },
  {
    key: 'inventory.allow_backorder',
    group: 'inventory',
    label: '품절 시에도 주문 허용',
    type: 'boolean',
    default: false,
  },
  {
    key: 'inventory.low_stock_threshold',
    group: 'inventory',
    label: '재고 부족 기준 수량',
    type: 'number',
    default: 5,
  },

  // notifications -------------------------------------------------------
  {
    key: 'notifications.events',
    group: 'notifications',
    label: '알림 방식 (이벤트별)',
    help: '이벤트별 알림 채널 목록. 없는 이벤트는 기본값 ["inapp"](관리자 화면 알림)',
    type: 'json',
    default: {},
  },

  // tax -------------------------------------------------------------------
  {
    key: 'tax.mode',
    group: 'tax',
    label: '부가세 방식',
    type: 'select',
    options: [
      { value: 'none', label: '없음' },
      { value: 'inclusive', label: '가격에 포함' },
      { value: 'exclusive', label: '별도 부과' },
    ],
    default: 'none',
  },
  {
    key: 'tax.vat_rate',
    group: 'tax',
    label: '부가세율 (%)',
    type: 'number',
    default: 15,
  },
  {
    key: 'tax.mushak_enabled',
    group: 'tax',
    label: 'Mushak 6.3 사용 (방글라데시 세금계산서)',
    type: 'boolean',
    default: false,
  },

  // localization ----------------------------------------------------------
  {
    key: 'localization.language',
    group: 'localization',
    label: '쇼핑몰 언어',
    type: 'select',
    options: [
      { value: 'ko', label: '한국어' },
      { value: 'en', label: 'English' },
      { value: 'bn', label: 'Bengali' },
    ],
    default: 'ko',
  },

  // printing ------------------------------------------------------------
  {
    key: 'printing.invoice_template',
    group: 'printing',
    label: '거래명세서 양식',
    type: 'select',
    options: [
      { value: 'a4_default', label: 'A4 기본' },
      { value: 'a4_mushak', label: 'A4 + Mushak 6.3' },
    ],
    default: 'a4_default',
  },
  {
    key: 'printing.footer_text',
    group: 'printing',
    label: '출력물 하단 문구',
    type: 'text',
    default: '',
  },

  // storefront ------------------------------------------------------------
  {
    key: 'storefront.announcement',
    group: 'storefront',
    label: '상단 공지 문구',
    help: '비워 두면 공지줄이 숨겨집니다',
    type: 'text',
    default: '',
  },
  {
    key: 'storefront.whatsapp_number',
    group: 'storefront',
    label: 'WhatsApp 상담 버튼 번호',
    type: 'text',
    default: '',
  },
  {
    key: 'storefront.primary_color',
    group: 'storefront',
    label: '쇼핑몰 포인트 색상',
    type: 'text',
    default: '#059669',
  },
]

export const DEFAULT_SETTINGS: Record<string, unknown> = Object.fromEntries(
  SETTING_DEFS.map((def) => [def.key, def.default]),
)
