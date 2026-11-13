// Server-safe presentational component (no 'use client' — pure read-only render,
// used directly from the order detail server component).
import { ArrowRightLeft, MessageSquare, Settings2, Truck, Wallet } from 'lucide-react'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import type { OrderEvent, OrderEventType } from '@/types/db'

const EVENT_ICON: Record<OrderEventType, typeof ArrowRightLeft> = {
  status: ArrowRightLeft,
  payment: Wallet,
  delivery: Truck,
  note: MessageSquare,
  system: Settings2,
}

interface TimelineProps {
  events: OrderEvent[]
}

function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <EmptyState icon={Settings2} title="아직 기록이 없습니다" />
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => {
        const Icon = EVENT_ICON[event.type] ?? Settings2
        return (
          <li key={event.id} className="flex gap-3">
            <div
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted',
              )}
            >
              <Icon className="text-muted-foreground size-3.5" />
            </div>
            <div className="flex flex-col gap-0.5 pb-0.5">
              <p className="text-foreground text-[13px]">{event.message ?? event.type}</p>
              <p className="text-muted-foreground text-xs">
                {format(new Date(event.created_at), 'yyyy.MM.dd HH:mm')}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
