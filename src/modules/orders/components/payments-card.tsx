'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/money'
import { rejectPaymentAction, verifyPaymentAction } from '@/modules/orders/actions'
import { RecordPaymentDialog } from './record-payment-dialog'
import type { Payment } from '@/types/db'

interface PaymentsCardProps {
  orderId: string
  payments: Payment[]
}

function PaymentsCard({ orderId, payments }: PaymentsCardProps) {
  const router = useRouter()
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function handleVerify(paymentId: string) {
    setBusyId(paymentId)
    try {
      const result = await verifyPaymentAction(paymentId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('결제가 확인되었습니다')
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(paymentId: string) {
    setBusyId(paymentId)
    try {
      const result = await rejectPaymentAction({ paymentId })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('결제가 거절되었습니다')
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>결제 내역</CardTitle>
        <RecordPaymentDialog orderId={orderId} />
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="결제 기록이 없습니다"
            description="선결제, 전액, 잔금 결제를 기록하세요."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>구분</TableHead>
                <TableHead>방법</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>거래번호</TableHead>
                <TableHead>확인</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="capitalize">{payment.kind}</TableCell>
                  <TableCell className="uppercase">{payment.method}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(payment.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge kind="payment" value={payment.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {payment.provider_ref || payment.sender_number || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {payment.verified_at ? format(new Date(payment.verified_at), 'MM.dd HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    {payment.status === 'pending' ? (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" disabled={busyId === payment.id} onClick={() => handleVerify(payment.id)}>
확인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === payment.id}
                          onClick={() => handleReject(payment.id)}
                        >
거절
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export { PaymentsCard }
