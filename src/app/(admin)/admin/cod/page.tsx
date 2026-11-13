import { PageHeader } from "@/components/ui/page-header"
import { requireOrg } from "@/lib/auth"
import { requireModule } from "@/lib/modules"
import { getServerClient } from "@/lib/supabase/server"
import { CodRiderTable, type CodRiderGroup } from "@/modules/delivery/components/cod-rider-table"
import { CodSettlementsTable, type CodSettlementRow } from "@/modules/delivery/components/cod-settlements-table"
import { CodSummary } from "@/modules/delivery/components/cod-summary"
import type { Rider } from "@/types/db"

export const dynamic = "force-dynamic"

/** Deliveries still "in the field" with COD not yet collected. */
const IN_FIELD_STATUSES = ["assigned", "picked_up", "in_transit"]

export default async function CodPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, "delivery")

  const supabase = await getServerClient()

  const [{ data: riders }, { data: inFieldDeliveries }, { data: settleableDeliveries }, { data: settlements }] =
    await Promise.all([
      supabase.from("riders").select("*").eq("org_id", ctx.org.id).order("name"),
      supabase
        .from("deliveries")
        .select("cod_amount")
        .eq("org_id", ctx.org.id)
        .eq("cod_collected", false)
        .in("status", IN_FIELD_STATUSES),
      supabase
        .from("deliveries")
        .select("id, delivery_no, recipient_name, cod_amount, rider_id")
        .eq("org_id", ctx.org.id)
        .eq("cod_collected", true)
        .is("settlement_id", null),
      supabase
        .from("cod_settlements")
        .select("id, amount, delivery_ids, note, created_at, rider:riders(name)")
        .eq("org_id", ctx.org.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ])

  // supabase-js infers the rider:riders(name) embed as an array without a
  // generated Database schema to resolve FK cardinality — it's really a
  // single many-to-one row (cod_settlements.rider_id -> riders.id).
  const typedSettlements = (settlements ?? []) as unknown as Array<{
    id: string
    amount: number
    delivery_ids: string[]
    note: string | null
    created_at: string
    rider: { name: string } | null
  }>

  const uncollectedInField = (inFieldDeliveries ?? []).reduce((sum, row) => sum + row.cod_amount, 0)
  const withRiders = (riders ?? []).reduce((sum, rider: Rider) => sum + rider.cash_on_hand, 0)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const settledThisMonth = typedSettlements
    .filter((settlement) => new Date(settlement.created_at) >= monthStart)
    .reduce((sum, settlement) => sum + settlement.amount, 0)

  const groups: CodRiderGroup[] = (riders ?? [])
    .map((rider: Rider) => ({
      rider,
      deliveries: (settleableDeliveries ?? []).filter((delivery) => delivery.rider_id === rider.id),
    }))
    .filter((group) => group.deliveries.length > 0)

  const settlementRows: CodSettlementRow[] = typedSettlements.map((settlement) => ({
    id: settlement.id,
    rider_name: settlement.rider?.name ?? "—",
    amount: settlement.amount,
    delivery_count: Array.isArray(settlement.delivery_ids) ? settlement.delivery_ids.length : 0,
    note: settlement.note,
    created_at: settlement.created_at,
  }))

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader title="착불 정산" />

      <CodSummary
        uncollectedInField={uncollectedInField}
        withRiders={withRiders}
        settledThisMonth={settledThisMonth}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">정산 대기</h2>
        <CodRiderTable groups={groups} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">정산 내역</h2>
        <CodSettlementsTable settlements={settlementRows} />
      </div>
    </div>
  )
}
