import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { requireOrg } from "@/lib/auth"
import { requireModule } from "@/lib/modules"
import type { PageProps } from "@/lib/types"
import type { DeliveryStatus } from "@/lib/status"
import { getServerClient } from "@/lib/supabase/server"
import type { DeliveryCourier, DeliveryMethod } from "@/types/db"
import { DeliveriesTable, type DeliveryListRow } from "@/modules/delivery/components/deliveries-table"
import { DeliveryStats } from "@/modules/delivery/components/delivery-stats"
import { DeliveryStatusTabs } from "@/modules/delivery/components/delivery-status-tabs"

export const dynamic = "force-dynamic"

const ALL_STATUSES: DeliveryStatus[] = [
  "pending",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned",
]

export default async function DeliveriesPage({ searchParams }: PageProps) {
  const ctx = await requireOrg()
  requireModule(ctx.org, "delivery")

  const params = await searchParams
  const statusFilter = typeof params.status === "string" ? params.status : undefined

  const supabase = await getServerClient()

  let query = supabase
    .from("deliveries")
    .select(
      "id, delivery_no, status, method, courier, cod_amount, cod_collected, recipient_name, address, assigned_at, delivered_at, order:orders(id, order_no), rider:riders(name)",
    )
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false })

  if (statusFilter) {
    query = query.eq("status", statusFilter)
  }

  const { data: rawRows } = await query
  // supabase-js infers embedded relations as arrays when there's no generated
  // Database schema to resolve FK cardinality — order_id/rider_id are both
  // single (many-to-one) in reality, so cast to the true runtime shape.
  const rows = (rawRows ?? []) as unknown as Array<{
    id: string
    delivery_no: string
    status: string
    method: DeliveryMethod
    courier: DeliveryCourier | null
    cod_amount: number
    cod_collected: boolean
    recipient_name: string | null
    address: { district?: string } | null
    assigned_at: string | null
    delivered_at: string | null
    order: { id: string; order_no: string } | null
    rider: { name: string } | null
  }>

  // Separate unfiltered pass for tab counts + today's delivered count.
  const { data: allStatusRows } = await supabase
    .from("deliveries")
    .select("status, delivered_at")
    .eq("org_id", ctx.org.id)

  const counts: Partial<Record<DeliveryStatus | "all", number>> = { all: allStatusRows?.length ?? 0 }
  for (const status of ALL_STATUSES) counts[status] = 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  let deliveredToday = 0

  for (const row of allStatusRows ?? []) {
    const status = row.status as DeliveryStatus
    counts[status] = (counts[status] ?? 0) + 1
    if (status === "delivered" && row.delivered_at && new Date(row.delivered_at) >= todayStart) {
      deliveredToday += 1
    }
  }

  const deliveries: DeliveryListRow[] = rows.map((row) => ({
    id: row.id,
    delivery_no: row.delivery_no,
    status: row.status as DeliveryStatus,
    method: row.method,
    courier: row.courier,
    cod_amount: row.cod_amount,
    cod_collected: row.cod_collected,
    recipient_name: row.recipient_name,
    district: row.address?.district ?? null,
    assigned_at: row.assigned_at,
    delivered_at: row.delivered_at,
    order: row.order,
    rider: row.rider,
  }))

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader
        title="배송관리"
        actions={
          <Button asChild>
            <Link href="/admin/deliveries/new">
              <Plus className="size-4" />
              새 배송
            </Link>
          </Button>
        }
      />

      <DeliveryStats
        pending={counts.pending ?? 0}
        assigned={counts.assigned ?? 0}
        inTransit={counts.in_transit ?? 0}
        deliveredToday={deliveredToday}
        failed={counts.failed ?? 0}
      />

      <DeliveryStatusTabs counts={counts} />

      <DeliveriesTable deliveries={deliveries} />
    </div>
  )
}
