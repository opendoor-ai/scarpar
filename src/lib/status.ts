// Status badge metadata + lifecycle transition maps (docs/architecture.md §3).
// Consumed by src/components/ui/status-badge.tsx via getStatusMeta(kind, value).
//
// Enum unions already canonicalized in src/types/db/commerce.ts (order, both
// payment vocabularies, return, review, product) are imported and reused here
// rather than redefined. delivery/job/listing/enrollment have no db/types file
// yet (0003_delivery_cms_ops.sql isn't typed there yet), so those unions are
// defined locally, matching architecture §3 exactly.
import type {
  OrderStatus,
  PaymentStatus,
  PaymentVerificationStatus,
  ProductStatus,
  ReturnStatus,
  ReviewStatus,
} from '@/types/db/commerce'

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned'

export type JobStatus = 'quoted' | 'scheduled' | 'in_progress' | 'done' | 'invoiced' | 'cancelled'

export type ListingStatus = 'draft' | 'active' | 'under_offer' | 'sold' | 'rented'

export type EnrollmentStatus = 'active' | 'completed' | 'revoked'

export type StatusKind =
  | 'order'
  | 'payment'
  | 'delivery'
  | 'product'
  | 'return'
  | 'job'
  | 'listing'
  | 'review'
  | 'enrollment'

/** Matches the `variant` prop of @/components/ui/badge.tsx's badgeVariants. */
export type StatusVariant = 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

export interface StatusMeta {
  label: string
  variant: StatusVariant
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** 한국어 상태 이름. kind별로 뜻이 다른 값은 KO_LABELS_BY_KIND에서 덮어씁니다. */
const KO_LABELS: Record<string, string> = {
  pending: '대기',
  confirmed: '확인됨',
  packed: '포장 완료',
  dispatched: '출고',
  delivered: '배송 완료',
  completed: '완료',
  cancelled: '취소',
  returned: '반품',
  failed: '실패',
  verified: '확인됨',
  refunded: '환불',
  unpaid: '미결제',
  advance_paid: '선결제 완료',
  paid: '결제 완료',
  partial_refund: '부분 환불',
  assigned: '배정됨',
  picked_up: '집하 완료',
  in_transit: '배송 중',
  draft: '임시저장',
  active: '활성',
  archived: '보관',
  requested: '요청됨',
  approved: '승인',
  rejected: '거절',
  received: '수령',
  quoted: '견적',
  scheduled: '예약됨',
  in_progress: '진행 중',
  done: '완료',
  invoiced: '청구 완료',
  under_offer: '협의 중',
  sold: '판매 완료',
  rented: '임대 완료',
  published: '게시됨',
  revoked: '취소됨',
}

const KO_LABELS_BY_KIND: Partial<Record<StatusKind, Record<string, string>>> = {
  product: { active: '판매중' },
  review: { pending: '승인 대기' },
  return: { refunded: '환불 완료' },
}

function koLabel(kind: StatusKind | undefined, value: string): string {
  return (kind && KO_LABELS_BY_KIND[kind]?.[value]) ?? KO_LABELS[value] ?? titleCase(value)
}

function buildStatusGroup(entries: [string, StatusVariant][], kind?: StatusKind): Record<string, StatusMeta> {
  const group: Record<string, StatusMeta> = {}
  for (const [value, variant] of entries) {
    group[value] = { label: koLabel(kind, value), variant }
  }
  return group
}

// order.status
const ORDER_ENTRIES: [OrderStatus, StatusVariant][] = [
  ['pending', 'warning'],
  ['confirmed', 'secondary'],
  ['packed', 'secondary'],
  ['dispatched', 'secondary'],
  ['delivered', 'success'],
  ['completed', 'success'],
  ['cancelled', 'destructive'],
  ['returned', 'destructive'],
  ['failed', 'destructive'],
]

// Merges payments.status (pending|verified|failed|refunded) and
// orders.payment_status (unpaid|advance_paid|paid|refunded|partial_refund) —
// both are legitimately passed to kind="payment"; 'refunded' is shared by both.
const PAYMENT_ENTRIES: [PaymentVerificationStatus | PaymentStatus, StatusVariant][] = [
  ['pending', 'warning'],
  ['verified', 'success'],
  ['failed', 'destructive'],
  ['refunded', 'destructive'],
  ['unpaid', 'warning'],
  ['advance_paid', 'warning'],
  ['paid', 'success'],
  ['partial_refund', 'destructive'],
]

const DELIVERY_ENTRIES: [DeliveryStatus, StatusVariant][] = [
  ['pending', 'warning'],
  ['assigned', 'secondary'],
  ['picked_up', 'secondary'],
  ['in_transit', 'secondary'],
  ['delivered', 'success'],
  ['failed', 'destructive'],
  ['returned', 'destructive'],
]

const PRODUCT_ENTRIES: [ProductStatus, StatusVariant][] = [
  ['draft', 'outline'],
  ['active', 'success'],
  ['archived', 'secondary'],
]

// Note: 'refunded' here means the return completed successfully (customer
// paid back as intended) — success, unlike the payment-side 'refunded' above.
const RETURN_ENTRIES: [ReturnStatus, StatusVariant][] = [
  ['requested', 'warning'],
  ['approved', 'success'],
  ['rejected', 'destructive'],
  ['received', 'secondary'],
  ['refunded', 'success'],
]

const JOB_ENTRIES: [JobStatus, StatusVariant][] = [
  ['quoted', 'outline'],
  ['scheduled', 'secondary'],
  ['in_progress', 'secondary'],
  ['done', 'success'],
  ['invoiced', 'success'],
  ['cancelled', 'destructive'],
]

const LISTING_ENTRIES: [ListingStatus, StatusVariant][] = [
  ['draft', 'outline'],
  ['active', 'success'],
  ['under_offer', 'warning'],
  ['sold', 'success'],
  ['rented', 'success'],
]

const REVIEW_ENTRIES: [ReviewStatus, StatusVariant][] = [
  ['pending', 'warning'],
  ['published', 'success'],
  ['rejected', 'destructive'],
]

const ENROLLMENT_ENTRIES: [EnrollmentStatus, StatusVariant][] = [
  ['active', 'success'],
  ['completed', 'success'],
  ['revoked', 'destructive'],
]

export const STATUS_MAP: Record<StatusKind, Record<string, StatusMeta>> = {
  order: buildStatusGroup(ORDER_ENTRIES, 'order'),
  payment: buildStatusGroup(PAYMENT_ENTRIES, 'payment'),
  delivery: buildStatusGroup(DELIVERY_ENTRIES, 'delivery'),
  product: buildStatusGroup(PRODUCT_ENTRIES, 'product'),
  return: buildStatusGroup(RETURN_ENTRIES, 'return'),
  job: buildStatusGroup(JOB_ENTRIES, 'job'),
  listing: buildStatusGroup(LISTING_ENTRIES, 'listing'),
  review: buildStatusGroup(REVIEW_ENTRIES, 'review'),
  enrollment: buildStatusGroup(ENROLLMENT_ENTRIES, 'enrollment'),
}

/** Falls back to a plain secondary badge for any value not in STATUS_MAP. */
export function getStatusMeta(kind: StatusKind, value: string): StatusMeta {
  return STATUS_MAP[kind]?.[value] ?? { label: koLabel(kind, value), variant: 'secondary' }
}

// ---------------------------------------------------------------------------
// Lifecycle transition maps — allowed next-status sets.
// ---------------------------------------------------------------------------

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['dispatched', 'cancelled'],
  dispatched: ['delivered', 'failed', 'returned'],
  delivered: ['completed', 'returned'],
  completed: [],
  cancelled: [],
  returned: [],
  failed: [],
}

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'returned', 'failed']

export const DELIVERY_STATUS_FLOW: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['assigned'],
  assigned: ['picked_up', 'failed'],
  picked_up: ['in_transit', 'delivered', 'failed'],
  in_transit: ['delivered', 'failed', 'returned'],
  delivered: [],
  failed: [],
  returned: [],
}
