import Link from "next/link"
import { notFound } from "next/navigation"
import { Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { requireOrg } from "@/lib/auth"
import { formatMoney } from "@/lib/money"
import { requireModule } from "@/lib/modules"
import type { DeliveryStatus } from "@/lib/status"
import { getServerClient } from "@/lib/supabase/server"
import type { PageProps } from "@/lib/types"
import { DeliveryMethodBadge } from "@/modules/delivery/components/delivery-method-badge"
import { DeliveryStatusActions } from "@/modules/delivery/components/delivery-status-actions"
import { DeliveryTimeline } from "@/modules/delivery/components/delivery-timeline"

export const dynamic = "force-dynamic"

export default async function DeliveryDetailPage({ params }: PageProps<{ id: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, "delivery")

  const { id } = await params
  const supabase = await getServerClient()

  const { data: delivery } = await supabase
    .from("deliveries")
    .select(
      "*, order:orders(id, order_no, customer_name), rider:riders(id, name, phone), zone:delivery_zones(name)",
    )
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .single()

  if (!delivery) notFound()

  const [{ data: events }, { data: riders }] = await Promise.all([
    supabase.from("delivery_events").select("*").eq("delivery_id", id).order("created_at", { ascending: true }),
    supabase.from("riders").select("*").eq("org_id", ctx.org.id).eq("is_active", true).order("name"),
  ])

  const address = (delivery.address ?? {}) as {
    line1?: string
    area?: string
    district?: string
    postcode?: string
  }
  const addressLine = [address.line1, address.area, address.district, address.postcode].filter(Boolean).join(", ")

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <PageHeader
        title={delivery.delivery_no}
        backHref="/admin/deliveries"
        actions={
          <>
            <StatusBadge kind="delivery" value={delivery.status} />
            <Button asChild variant="outline">
              <Link href={`/print/label/${delivery.id}`} target="_blank" rel="noopener noreferrer">
                <Printer className="size-4" />
                라벨 인쇄
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>받는 분</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">배송 방법</span>
                <DeliveryMethodBadge
                  method={delivery.method}
                  riderName={delivery.rider?.name}
                  courier={delivery.courier}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">이름</span>
                <span>{delivery.recipient_name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">전화번호</span>
                <span>{delivery.recipient_phone ?? "—"}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">주소</span>
                <span className="text-right">{addressLine || "—"}</span>
              </div>
              {delivery.zone ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">배송 지역</span>
                  <span>{delivery.zone.name}</span>
                </div>
              ) : null}
              {delivery.tracking_code ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">송장 번호</span>
                  <span className="flex items-center gap-1">
                    <span className="font-mono">{delivery.tracking_code}</span>
                    <CopyButton text={delivery.tracking_code} />
                  </span>
                </div>
              ) : null}
              {delivery.otp_code ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">OTP</span>
                  <span className="font-mono">{delivery.otp_code}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>주문</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">주문번호</span>
                {delivery.order ? (
                  <Link href={`/admin/orders/${delivery.order.id}`} className="text-primary hover:underline">
                    {delivery.order.order_no}
                  </Link>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">고객</span>
                <span>{delivery.order?.customer_name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">배송비</span>
                <span className="tabular-nums">{formatMoney(delivery.fee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">착불 금액</span>
                <span
                  className={
                    delivery.cod_amount > 0 && !delivery.cod_collected
                      ? "font-medium text-amber-700 tabular-nums dark:text-amber-400"
                      : "tabular-nums"
                  }
                >
                  {formatMoney(delivery.cod_amount)}
                  {delivery.cod_collected ? (
                    <Badge variant="success" className="ml-2">
                      수금 완료
                    </Badge>
                  ) : null}
                </span>
              </div>
              {delivery.failed_reason ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">실패 사유</span>
                  <span className="text-destructive">{delivery.failed_reason}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>처리</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryStatusActions
                deliveryId={delivery.id}
                status={delivery.status as DeliveryStatus}
                hasOtp={!!delivery.otp_code}
                codAmount={delivery.cod_amount}
                riders={riders ?? []}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>처리 기록</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryTimeline events={events ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
