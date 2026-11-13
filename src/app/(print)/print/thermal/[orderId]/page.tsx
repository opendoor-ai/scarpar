import { notFound } from 'next/navigation'
import { format } from 'date-fns'

import { requireOrg } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import { formatMoney } from '@/lib/money'
import { getReceiptContext, qrDataUrl } from '@/lib/receipt'
import { ReceiptTotals } from '@/modules/receipts/components/receipt-totals'
import { CodBig } from '@/modules/receipts/components/cod-big'
import { QrBlock } from '@/modules/receipts/components/qr-block'
import type { PageProps } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ThermalPage({ params }: PageProps<{ orderId: string }>) {
  const { orderId } = await params
  const ctx = await requireOrg()

  const context = await getReceiptContext(orderId)
  if (!context || context.order.org_id !== ctx.org.id) notFound()

  const { org, order, items } = context

  const supabase = getAdminClient()
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('tracking_code')
    .eq('order_id', orderId)
    .maybeSingle()

  const trackCode = delivery?.tracking_code || order.order_no
  const qrSrc = await qrDataUrl(`${env.APP_URL}/track/${trackCode}`)

  const balanceDue = Math.max(order.total - order.advance_paid, 0)

  return (
    <div className="print-thermal">
      <div className="receipt-brand">{org.name}</div>
      <div className="receipt-meta">
        Order {order.order_no}
        <br />
        {format(new Date(order.placed_at), 'yyyy.MM.dd HH:mm')}
      </div>

      <div className="receipt-items">
        {items.map((item) => (
          <div className="item-row" key={item.id}>
            <span className="item-name">
              {item.product_name}
              {item.variant_name ? ` (${item.variant_name})` : ''}
            </span>
            <span className="item-qty">x{item.qty}</span>
            <span className="item-amount">{formatMoney(item.line_total)}</span>
          </div>
        ))}
      </div>

      <ReceiptTotals
        subtotalPaisa={order.subtotal}
        discountPaisa={order.discount_amount}
        discountCode={order.discount_code}
        deliveryChargePaisa={order.delivery_charge}
        totalPaisa={order.total}
        advancePaidPaisa={order.advance_paid}
      />

      {order.payment_method === 'cod' && balanceDue > 0 ? (
        <CodBig amountPaisa={balanceDue} label="결제할 금액" />
      ) : null}

      <QrBlock dataUrl={qrSrc} />

      <div className="receipt-footer">
        주문해 주셔서 감사합니다!
        {org.phone ? (
          <>
            <br />
            Call us: {org.phone}
          </>
        ) : null}
      </div>
    </div>
  )
}
