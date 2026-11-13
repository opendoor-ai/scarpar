export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { formatMoney } from '@/lib/money'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import type { OrderItem, ReturnItem, ReturnRequest } from '@/types/db'
import { ReturnStatusActions } from '@/modules/orders/components/return-status-actions'

interface ReturnDetailRow extends ReturnRequest {
  orders: { order_no: string } | { order_no: string }[] | null
}

export default async function ReturnDetailPage({ params }: PageProps<{ id: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'orders')

  const { id } = await params
  const supabase = await getServerClient()

  const { data: returnData } = await supabase
    .from('returns')
    .select('*, orders(order_no)')
    .eq('org_id', ctx.org.id)
    .eq('id', id)
    .maybeSingle()

  if (!returnData) notFound()

  const ret = returnData as unknown as ReturnDetailRow
  const orderJoin = ret.orders
  const orderNo = Array.isArray(orderJoin) ? orderJoin[0]?.order_no : orderJoin?.order_no

  const { data: returnItemsData } = await supabase.from('return_items').select('*').eq('return_id', id)
  const returnItems = (returnItemsData ?? []) as ReturnItem[]

  const orderItemIds = returnItems.map((ri) => ri.order_item_id)
  const { data: orderItemsData } =
    orderItemIds.length > 0
      ? await supabase.from('order_items').select('*').in('id', orderItemIds)
      : { data: [] as OrderItem[] }

  const orderItemsById = new Map(((orderItemsData ?? []) as OrderItem[]).map((item) => [item.id, item]))

  return (
    <div className="px-6 py-6">
      <PageHeader
        title={ret.return_no}
        backHref="/admin/returns"
        actions={<ReturnStatusActions returnId={ret.id} orderId={ret.order_id} status={ret.status} />}
      />

      <div className="flex flex-wrap items-center gap-2 pb-6">
        <StatusBadge kind="return" value={ret.status} />
        <Link href={`/admin/orders/${ret.order_id}`} className="text-primary text-[13px] hover:underline">
          Order {orderNo ?? ''}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>반품 상품</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((ri) => {
                    const orderItem = orderItemsById.get(ri.order_item_id)
                    return (
                      <TableRow key={ri.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{orderItem?.product_name ?? '—'}</span>
                            {orderItem?.variant_name ? (
                              <span className="text-muted-foreground text-xs">{orderItem.variant_name}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{ri.qty}</TableCell>
                        <TableCell className="text-muted-foreground">{ri.condition ?? '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">사유</span>
                <span>{ret.reason ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">처리 방식</span>
                <span className="capitalize">{ret.resolution?.replace('_', ' ') ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">환불 금액</span>
                <span className="tabular-nums">
                  {ret.refund_amount != null ? formatMoney(ret.refund_amount) : '—'}
                </span>
              </div>
              {ret.note ? (
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-muted-foreground">메모</span>
                  <span>{ret.note}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
