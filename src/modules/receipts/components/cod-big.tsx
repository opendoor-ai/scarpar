import { formatMoney } from '@/lib/money'

// Shared print template component — print.css's `.cod-big`: "the single most
// operationally important number" on a COD document. Used on the label (courier/rider
// hand-off) and, per docs — "balance due COD emphasized" — on the invoice/thermal
// receipt whenever a COD balance remains.

interface CodBigProps {
  amountMinor: number
  label?: string
}

export function CodBig({ amountMinor, label = '받을 금액' }: CodBigProps) {
  return (
    <div className="cod-big">
      <div className="cod-big-label">{label}</div>
      <div className="cod-big-amount">{formatMoney(amountMinor)}</div>
    </div>
  )
}
