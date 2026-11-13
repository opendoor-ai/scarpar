'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { ServiceJobStatus } from '@/types/db'

import { generateInvoice, updateJobStatus } from '../actions'
import { JOB_STATUS_FLOW } from '../schemas'

interface JobStatusActionsProps {
  jobId: string
  status: ServiceJobStatus
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function JobStatusActions({ jobId, status }: JobStatusActionsProps) {
  const [busy, setBusy] = useState(false)

  const nextStatuses = JOB_STATUS_FLOW[status]
  // "invoiced" only ever happens through Generate invoice below (it also
  // creates the order) — never offer it as a plain status-flip button.
  const genericNext = nextStatuses.filter((next) => next !== 'cancelled' && next !== 'invoiced')

  async function handleTransition(next: ServiceJobStatus) {
    setBusy(true)
    const result = await updateJobStatus(jobId, next)
    setBusy(false)
    if (result.ok) toast.success('작업 상태가 변경되었습니다')
    else toast.error(result.error)
  }

  async function handleInvoice() {
    setBusy(true)
    const result = await generateInvoice(jobId)
    setBusy(false)
    if (result.ok && result.data) toast.success(`청구서 ${result.data.orderNo}이(가) 만들어졌습니다`)
    else if (!result.ok) toast.error(result.error)
  }

  if (nextStatuses.length === 0 && status !== 'done') return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {genericNext.map((next) => (
        <Button key={next} size="sm" disabled={busy} onClick={() => handleTransition(next)}>
          Mark {titleCase(next)}
        </Button>
      ))}

      {status === 'done' ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={handleInvoice}>
          청구서 만들기
        </Button>
      ) : null}

      {nextStatuses.includes('cancelled') ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" disabled={busy}>
              작업 취소
            </Button>
          }
          title="이 작업을 취소할까요?"
          description="여기서는 되돌릴 수 없습니다."
          confirmLabel="작업 취소"
          destructive
          onConfirm={() => handleTransition('cancelled')}
        />
      ) : null}
    </div>
  )
}

export { JobStatusActions }
