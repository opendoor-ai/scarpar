'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { updateReturnStatusAction } from '@/modules/orders/actions'
import { RETURN_STATUS_FLOW } from '@/modules/orders/schemas'
import type { ReturnStatus } from '@/types/db'
import { RefundDialog } from './refund-dialog'

const STATUS_ACTION_LABEL: Record<ReturnStatus, string> = {
  requested: '요청 상태로',
  approved: '승인',
  rejected: '거절',
  received: '수령 완료',
  refunded: '환불',
}

const DESTRUCTIVE_STATUSES = new Set<ReturnStatus>(['rejected'])
const CONFIRM_REQUIRED = new Set<ReturnStatus>(['rejected', 'received'])

interface ReturnStatusActionsProps {
  returnId: string
  orderId: string
  status: ReturnStatus
}

function ReturnStatusActions({ returnId, orderId, status }: ReturnStatusActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<ReturnStatus | null>(null)
  const nextStatuses = RETURN_STATUS_FLOW[status] ?? []

  async function run(nextStatus: ReturnStatus) {
    setBusy(nextStatus)
    try {
      const result = await updateReturnStatusAction({ returnId, nextStatus })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('반품 상태가 변경되었습니다')
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (nextStatuses.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {nextStatuses.map((next) =>
        next === 'refunded' ? (
          <RefundDialog key={next} returnId={returnId} orderId={orderId} />
        ) : CONFIRM_REQUIRED.has(next) ? (
          <ConfirmDialog
            key={next}
            trigger={
              <Button
                variant={DESTRUCTIVE_STATUSES.has(next) ? 'destructive' : 'default'}
                size="sm"
                disabled={busy !== null}
              >
                {STATUS_ACTION_LABEL[next]}
              </Button>
            }
            title={`${STATUS_ACTION_LABEL[next]}?`}
            description={
              next === 'received' ? '반품 수량만큼 재고가 다시 늘어납니다.' : undefined
            }
            destructive={DESTRUCTIVE_STATUSES.has(next)}
            confirmLabel={STATUS_ACTION_LABEL[next]}
            onConfirm={() => run(next)}
          />
        ) : (
          <Button key={next} variant="outline" size="sm" disabled={busy !== null} onClick={() => run(next)}>
            {busy === next ? '처리 중…' : STATUS_ACTION_LABEL[next]}
          </Button>
        ),
      )}
    </div>
  )
}

export { ReturnStatusActions }
