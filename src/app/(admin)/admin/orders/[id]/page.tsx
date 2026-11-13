export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireOrg } from '@/lib/auth'
import { isModuleEnabled, requireModule } from '@/lib/modules'
import { formatMoney } from '@/lib/money'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import type { Order, OrderEvent, OrderItem, Payment } from '@/types/db'
import { CustomerCard } from '@/modules/orders/components/customer-card'
import { NewReturnDialog } from '@/modules/orders/components/new-return-dialog'
import { NotesTagsCard } from '@/modules/orders/components/notes-tags-card'
import { OrderStatusActions } from '@/modules/orders/components/order-status-actions'
import { PaymentsCard } from '@/modules/orders/components/payments-card'
import { RiskCard } from '@/modules/orders/components/risk-card'
import { Timeline } from '@/modules/orders/components/timeline'

export default async function OrderDetailPage({ params }: PageProps<{ id: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'orders')

  const { id } = await params
  const supabase = await getServerClient()

  const [orderResult, itemsResult, paymentsResult, eventsResult] = await Promise.all([
    supabase.from('orders').select('*').eq('org_id', ctx.org.id).eq('id', id).maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
    supabase.from('payments').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    supabase.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
  ])

  if (!orderResult.data) notFound()

  const order = orderResult.data as Order
  const items = (itemsResult.data ?? []) as OrderItem[]
  const payments = (paymentsResult.data ?? []) as Payment[]
  const events = (eventsResult.data ?? []) as OrderEvent[]

  const verifiedFullBalance = payments
    .filter((p) => p.status === 'verified' && (p.kind === 'full' || p.kind === 'balance'))
    .reduce((sum, p) => sum + p.amount, 0)
  const due = order.total - order.advance_paid - verifiedFullBalance

  const deliveryEnabled = isModuleEnabled(ctx.org, 'delivery')

  return (
    <div className="px-6 py-6">
      <PageHeader
        title={order.order_no}
        backHref="/admin/orders"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/print/invoice/${order.id}`} target="_blank">
거래명세서 인쇄
              </Link>
            </Button>
            {deliveryEnabled ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/deliveries/new?order=${order.id}`}>배송 등록</Link>
              </Button>
            ) : null}
            <NewReturnDialog
              orderId={order.id}
              items={items.map((item) => ({
                id: item.id,
                product_name: item.product_name,
                variant_name: item.variant_name,
                qty: item.qty,
              }))}
            />
            <OrderStatusActions orderId={order.id} status={order.status} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 pb-6">
        <StatusBadge kind="order" value={order.status} />
        <StatusBadge kind="payment" value={order.payment_status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>주문 상품</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{item.product_name}</span>
                          {item.variant_name ? (
                            <span className="text-muted-foreground text-xs">{item.variant_name}</span>
                          ) : null}
                          {item.sku ? <span className="text-muted-foreground text-xs">SKU {item.sku}</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.unit_price)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-col gap-1.5 border-t pt-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상품 금액</span>
                  <span className="tabular-nums">{formatMoney(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      할인{order.discount_code ? ` (${order.discount_code})` : ''}
                    </span>
                    <span className="tabular-nums">-{formatMoney(order.discount_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">배송비</span>
                  <span className="tabular-nums">{formatMoney(order.delivery_charge)}</span>
                </div>
                {order.tax_amount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">부가세</span>
                    <span className="tabular-nums">{formatMoney(order.tax_amount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-1.5 text-[14px] font-semibold">
                  <span>합계</span>
                  <span className="tabular-nums">{formatMoney(order.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">선결제 금액</span>
                  <span className="tabular-nums">{formatMoney(order.advance_paid)}</span>
                </div>
                <div
                  className={
                    due > 0
                      ? 'text-warning flex justify-between text-[16px] font-semibold'
                      : 'flex justify-between text-[14px] font-semibold'
                  }
                >
                  <span>남은 금액</span>
                  <span className="tabular-nums">{formatMoney(due)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <PaymentsCard orderId={order.id} payments={payments} />
        </div>

        <div className="flex flex-col gap-6">
          <CustomerCard
            customerId={order.customer_id}
            customerName={order.customer_name}
            customerPhone={order.customer_phone}
            customerEmail={order.customer_email}
            address={order.address}
          />
          <RiskCard orderId={order.id} riskLevel={order.risk_level} riskNote={order.risk_note} />
          <NotesTagsCard
            orderId={order.id}
            noteInternal={order.note_internal}
            noteCustomer={order.note_customer}
            tags={order.tags}
          />
          <Card>
            <CardHeader>
              <CardTitle>처리 기록</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={events} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
