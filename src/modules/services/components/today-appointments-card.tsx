'use client'

import { format } from 'date-fns'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppointmentStatus } from '@/types/db'

import { updateAppointmentStatus } from '../actions'
import type { AppointmentRow } from '../schemas'

const STATUS_VARIANT: Record<AppointmentStatus, 'secondary' | 'success' | 'warning'> = {
  booked: 'secondary',
  done: 'success',
  cancelled: 'secondary',
  no_show: 'warning',
}

interface TodayAppointmentsCardProps {
  appointments: AppointmentRow[]
}

function TodayAppointmentsCard({ appointments }: TodayAppointmentsCardProps) {
  async function handleStatus(id: string, status: AppointmentStatus) {
    const result = await updateAppointmentStatus(id, status)
    if (!result.ok) toast.error(result.error)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>오늘 예약</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">오늘은 예약이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-3 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {format(new Date(appointment.starts_at), 'HH:mm')}
                  </span>
                  <span className="text-foreground font-medium">{appointment.title}</span>
                  {appointment.customer?.name ? (
                    <span className="text-muted-foreground">· {appointment.customer.name}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[appointment.status]}>{appointment.status.replace('_', ' ')}</Badge>
                  {appointment.status === 'booked' ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleStatus(appointment.id, 'done')}>
                        완료
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleStatus(appointment.id, 'cancelled')}>
                        취소
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export { TodayAppointmentsCard }
