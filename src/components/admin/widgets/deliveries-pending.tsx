import Link from 'next/link'
import { Truck } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

const ACTIVE_STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit'] as const

interface DeliveryRow {
  id: string
  delivery_no: string
  status: string
  recipient_name: string | null
}

/** Counts by (non-terminal) status + the 5 latest active deliveries. */
export async function DeliveriesPendingWidget() {
  const ctx = await requireOrg()

  let rows: DeliveryRow[] = []

  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_no, status, recipient_name')
      .eq('org_id', ctx.org.id)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(50)

    rows = (data ?? []) as DeliveryRow[]
  } catch {
    // placeholder-env safety — empty on failure
  }

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})
  const latest = rows.slice(0, 5)

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">진행 중인 배송</CardTitle>
        <Link href="/admin/deliveries" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        {rows.length === 0 ? (
          <EmptyState icon={Truck} title="진행 중인 배송이 없습니다" className="py-8" />
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              {ACTIVE_STATUSES.filter((status) => counts[status]).map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {counts[status]}
                  </span>
                  <StatusBadge kind="delivery" value={status} />
                </div>
              ))}
            </div>
            <ul className="flex flex-col gap-1">
              {latest.map((delivery) => (
                <li key={delivery.id}>
                  <Link
                    href={`/admin/deliveries/${delivery.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent"
                  >
                    <span className="truncate text-foreground">
                      {delivery.delivery_no} · {delivery.recipient_name ?? '알 수 없음'}
                    </span>
                    <StatusBadge kind="delivery" value={delivery.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
