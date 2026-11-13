import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { requireOrg } from "@/lib/auth"
import { requireModule } from "@/lib/modules"
import { getServerClient } from "@/lib/supabase/server"
import { ZoneDialog, ZonesTable } from "@/modules/delivery/components/zones-table"

export const dynamic = "force-dynamic"

export default async function DeliveryZonesPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, "delivery")

  const supabase = await getServerClient()
  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("org_id", ctx.org.id)
    .order("position")

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader
        title="배송 지역"
        actions={
          <ZoneDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                새 배송 지역
              </Button>
            }
          />
        }
      />
      <ZonesTable zones={zones ?? []} />
    </div>
  )
}
