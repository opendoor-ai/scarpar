import Link from "next/link"
import { PackageSearch } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { requireOrg } from "@/lib/auth"
import { requireModule } from "@/lib/modules"
import type { PageProps } from "@/lib/types"
import { getServerClient } from "@/lib/supabase/server"
import { NewDeliveryForm } from "@/modules/delivery/components/new-delivery-form"

export const dynamic = "force-dynamic"

function NoOrderState() {
  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader title="새 배송" backHref="/admin/deliveries" />
      <EmptyState
        icon={PackageSearch}
        title="먼저 주문을 선택하세요"
        description="주문 상세 화면에서 배송을 등록하거나, 주문 목록에서 주문을 고르세요."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/orders">주문 목록으로</Link>
          </Button>
        }
      />
    </div>
  )
}

export default async function NewDeliveryPage({ searchParams }: PageProps) {
  const ctx = await requireOrg()
  requireModule(ctx.org, "delivery")

  const params = await searchParams
  const orderId = typeof params.order === "string" ? params.order : undefined

  if (!orderId) return <NoOrderState />

  const supabase = await getServerClient()

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_no, customer_name, customer_phone, address, total, advance_paid")
    .eq("id", orderId)
    .eq("org_id", ctx.org.id)
    .single()

  if (!order) return <NoOrderState />

  const [{ data: zones }, { data: riders }] = await Promise.all([
    supabase.from("delivery_zones").select("*").eq("org_id", ctx.org.id).eq("is_active", true).order("position"),
    supabase.from("riders").select("*").eq("org_id", ctx.org.id).eq("is_active", true).order("name"),
  ])

  const district = (order.address as { district?: string } | null)?.district
  const defaultZone = district ? (zones ?? []).find((zone) => zone.districts.includes(district)) : undefined

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader title="새 배송" description={`주문 ${order.order_no}`} backHref="/admin/deliveries" />
      <NewDeliveryForm
        order={order}
        zones={zones ?? []}
        riders={riders ?? []}
        defaultZoneId={defaultZone?.id ?? null}
      />
    </div>
  )
}
