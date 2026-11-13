'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ORDER_STATUS_FLOW } from '@/lib/status'
import type { OrderStatus } from '@/types/db'
import { updateOrderStatusAction } from '@/modules/orders/actions'

const STATUS_ACTION_LABEL: Record<OrderStatus, string> = {
  pending: '대기로 변경',
  confirmed: '주문 확인',
  packed: '포장 완료',
  dispatched: '출고',
  delivered: '배송 완료',
  completed: '거래 완료',
  cancelled: '주문 취소',
  returned: '반품 처리',
  failed: '실패 처리',
}

const DESTRUCTIVE_STATUSES = new Set<OrderStatus>(['cancelled', 'failed'])
// Both move real state (stock reservation / cancellation) — confirm before firing.
const CONFIRM_REQUIRED = new Set<OrderStatus>(['cancelled', 'confirmed'])

interface OrderStatusActionsProps {
  orderId: string
  status: OrderStatus
}

function OrderStatusActions({ orderId, status }: OrderStatusActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<OrderStatus | null>(null)
  const nextStatuses = ORDER_STATUS_FLOW[status] ?? []

  async function run(nextStatus: OrderStatus) {
    setBusy(nextStatus)
    try {
      const result = await updateOrderStatusAction({ orderId, nextStatus })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('주문 상태가 변경되었습니다')
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (nextStatuses.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {nextStatuses.map((next) =>
        CONFIRM_REQUIRED.has(next) ? (
          <ConfirmDialog
            key={next}
            trigger={
              <Button variant={DESTRUCTIVE_STATUSES.has(next) ? 'destructive' : 'default'} size="sm" disabled={busy !== null}>
                {STATUS_ACTION_LABEL[next]}
              </Button>
            }
            title={`${STATUS_ACTION_LABEL[next]}?`}
            description={
              next === 'confirmed'
                ? '이 주문의 모든 상품 재고가 차감(예약)됩니다.'
                : '주문이 취소되고 차감된 재고가 복구됩니다.'
            }
            destructive={DESTRUCTIVE_STATUSES.has(next)}
            confirmLabel={STATUS_ACTION_LABEL[next]}
            onConfirm={() => run(next)}
          />
        ) : (
          <Button
            key={next}
            variant={DESTRUCTIVE_STATUSES.has(next) ? 'destructive' : 'outline'}
            size="sm"
            disabled={busy !== null}
            onClick={() => run(next)}
          >
            {busy === next ? '처리 중…' : STATUS_ACTION_LABEL[next]}
          </Button>
        ),
      )}
    </div>
  )
}

export { OrderStatusActions }
