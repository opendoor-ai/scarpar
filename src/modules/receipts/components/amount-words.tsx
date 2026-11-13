import { moneyToWords } from '@/lib/money'

// Shared print template component — print.css's `.amount-words` (A4 invoice only;
// thermal/label are too condensed for this line).

export function AmountWords({ paisa }: { paisa: number }) {
  return <p className="amount-words">합계 금액: {moneyToWords(paisa)}</p>
}
