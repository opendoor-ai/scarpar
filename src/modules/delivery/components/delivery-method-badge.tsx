import { Bike, Store, Truck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { DeliveryCourier, DeliveryMethod } from "@/types/db"

const COURIER_LABELS: Record<DeliveryCourier, string> = {
  cj: "CJ대한통운",
  hanjin: "한진택배",
  lotte: "롯데택배",
  manual: "직접 배송",
}

interface DeliveryMethodBadgeProps {
  method: DeliveryMethod
  riderName?: string | null
  courier?: DeliveryCourier | null
  className?: string
}

/** Shared method+carrier chip — used by both the deliveries list and detail header. */
function DeliveryMethodBadge({ method, riderName, courier, className }: DeliveryMethodBadgeProps) {
  if (method === "rider") {
    return (
      <Badge variant="outline" className={className}>
        <Bike className="size-3" />
        {riderName ?? "배송기사 (미배정)"}
      </Badge>
    )
  }

  if (method === "courier") {
    return (
      <Badge variant="outline" className={className}>
        <Truck className="size-3" />
        {courier ? COURIER_LABELS[courier] : "택배"}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={className}>
      <Store className="size-3" />
      방문 수령
    </Badge>
  )
}

export { DeliveryMethodBadge }
