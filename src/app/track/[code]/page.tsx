import Link from "next/link"
import { PackageX } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { PageProps } from "@/lib/types"
import { getAnonClient } from "@/lib/supabase/anon"
import { DeliveryTimeline } from "@/modules/delivery/components/delivery-timeline"
import { TrackingStatusStepper } from "@/modules/delivery/components/tracking-status-stepper"

export const dynamic = "force-dynamic"

interface TrackingEvent {
  status: string | null
  note: string | null
  created_at: string
}

/** get_tracking()'s return row — supabase-js can't infer RPC return columns
 *  without a generated Database schema, so the raw result types as `{}`. */
interface TrackingResult {
  delivery_no: string
  status: string
  courier: string | null
  recipient_name: string | null
  eta_text: string | null
  order_no: string
  org_name: string
  events: unknown
}

/**
 * Public, unauthenticated delivery lookup — the ONLY read path onto deliveries
 * for anon (docs/architecture.md §3): get_tracking() is SECURITY DEFINER and
 * returns a fixed, limited column set, never a full delivery row.
 */
export default async function TrackingResultPage({ params }: PageProps<{ code: string }>) {
  const { code } = await params
  const supabase = getAnonClient()

  const { data: rawData, error } = await supabase.rpc("get_tracking", { p_code: code }).maybeSingle()
  if (error) console.error("[track/[code]]", error)
  const data = rawData as unknown as TrackingResult | null

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <EmptyState
          icon={PackageX}
          title="배송 정보를 찾을 수 없습니다"
          description={`"${code}"에 해당하는 배송이 없습니다. 번호를 다시 확인해 주세요.`}
          action={
            <Link href="/track" className="text-primary text-sm hover:underline">
              다른 번호로 조회
            </Link>
          }
        />
      </main>
    )
  }

  const events: TrackingEvent[] = Array.isArray(data.events) ? data.events : []

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-lg">{data.org_name}</CardTitle>
          <p className="text-muted-foreground text-center text-sm">
            {data.order_no} · {data.delivery_no}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TrackingStatusStepper status={data.status} />

          {data.eta_text ? (
            <p className="text-muted-foreground text-center text-sm">Estimated: {data.eta_text}</p>
          ) : null}

          <div className="border-t pt-4">
            <DeliveryTimeline
              events={events.map((event, index) => ({
                id: index,
                status: event.status,
                note: event.note,
                created_at: event.created_at,
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
