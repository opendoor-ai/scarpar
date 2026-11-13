import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { requireOrg } from "@/lib/auth"
import { requireModule } from "@/lib/modules"
import { getServerClient } from "@/lib/supabase/server"
import { RiderDialog, RidersTable, type RiderListRow } from "@/modules/delivery/components/riders-table"

export const dynamic = "force-dynamic"

/** Deliveries that still count as "in the rider's hands" for the active-count column. */
const ACTIVE_DELIVERY_STATUSES = ["pending", "assigned", "picked_up", "in_transit"]

export default async function RidersPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, "delivery")

  const supabase = await getServerClient()

  const [{ data: riders }, { data: activeDeliveries }] = await Promise.all([
    supabase.from("riders").select("*").eq("org_id", ctx.org.id).order("name"),
    supabase
      .from("deliveries")
      .select("rider_id")
      .eq("org_id", ctx.org.id)
      .not("rider_id", "is", null)
      .in("status", ACTIVE_DELIVERY_STATUSES),
  ])

  const activeCounts = new Map<string, number>()
  for (const row of activeDeliveries ?? []) {
    if (row.rider_id) activeCounts.set(row.rider_id, (activeCounts.get(row.rider_id) ?? 0) + 1)
  }

  const rows: RiderListRow[] = (riders ?? []).map((rider) => ({
    ...rider,
    activeDeliveries: activeCounts.get(rider.id) ?? 0,
  }))

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader
        title="배송기사"
        actions={
          <RiderDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                새 배송기사
              </Button>
            }
          />
        }
      />
      <RidersTable riders={rows} />
    </div>
  )
}
