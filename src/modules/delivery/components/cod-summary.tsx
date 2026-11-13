import { Landmark, PiggyBank, Wallet } from "lucide-react"

import { StatCard } from "@/components/ui/stat-card"
import { formatMoney } from "@/lib/money"

interface CodSummaryProps {
  uncollectedInField: number
  withRiders: number
  settledThisMonth: number
}

/** Top StatCards row for the COD reconciliation page. */
function CodSummary({ uncollectedInField, withRiders, settledThisMonth }: CodSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="미수금 착불 (배송 중)" value={formatMoney(uncollectedInField)} icon={Wallet} />
      <StatCard label="배송기사 보유 현금" value={formatMoney(withRiders)} icon={PiggyBank} />
      <StatCard label="이번 달 정산액" value={formatMoney(settledThisMonth)} icon={Landmark} />
    </div>
  )
}

export { CodSummary }
