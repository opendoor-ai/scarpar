import { formatMoney } from '@/lib/money'

// Shared print template component — print.css scopes `.receipt-totals .row` /
// `.row--total` under both `.print-a4` and `.print-thermal`, so this same markup
// renders correctly (just differently styled) on both formats.

export interface ReceiptTotalsRow {
  label: string
  amountMinor: number
}

export interface ReceiptTotalsProps {
  subtotalMinor: number
  discountMinor?: number
  discountCode?: string | null
  deliveryChargeMinor?: number
  /** Extra rows between delivery and the total line — e.g. a VAT row per settings.tax.mode. */
  taxRows?: ReceiptTotalsRow[]
  totalMinor: number
  /** When > 0, also renders "Advance Paid" (negative) and "Balance Due" rows. */
  advancePaidMinor?: number
}

export function ReceiptTotals({
  subtotalMinor,
  discountMinor = 0,
  discountCode,
  deliveryChargeMinor = 0,
  taxRows = [],
  totalMinor,
  advancePaidMinor = 0,
}: ReceiptTotalsProps) {
  const balanceDue = Math.max(totalMinor - advancePaidMinor, 0)

  return (
    <div className="receipt-totals">
      <div className="row">
        <span>상품 금액</span>
        <span>{formatMoney(subtotalMinor)}</span>
      </div>

      {discountMinor > 0 ? (
        <div className="row">
          <span>할인{discountCode ? ` (${discountCode})` : ''}</span>
          <span>-{formatMoney(discountMinor)}</span>
        </div>
      ) : null}

      {deliveryChargeMinor > 0 ? (
        <div className="row">
          <span>배송비</span>
          <span>{formatMoney(deliveryChargeMinor)}</span>
        </div>
      ) : null}

      {taxRows.map((row) => (
        <div className="row" key={row.label}>
          <span>{row.label}</span>
          <span>{formatMoney(row.amountMinor)}</span>
        </div>
      ))}

      <div className="row row--total">
        <span>합계</span>
        <span>{formatMoney(totalMinor)}</span>
      </div>

      {advancePaidMinor > 0 ? (
        <>
          <div className="row">
            <span>선결제</span>
            <span>-{formatMoney(advancePaidMinor)}</span>
          </div>
          <div className="row">
            <span>잔액</span>
            <span>{formatMoney(balanceDue)}</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
