'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

import { revokeEnrollment } from '../actions'
import type { EnrollmentRow } from '../schemas'
import { EnrollCustomerDialog } from './enroll-customer-dialog'

interface EnrollmentsPanelProps {
  courseId: string
  enrollments: EnrollmentRow[]
}

function EnrollmentsPanel({ courseId, enrollments }: EnrollmentsPanelProps) {
  async function handleRevoke(enrollmentId: string) {
    const result = await revokeEnrollment(enrollmentId, courseId)
    if (result.ok) toast.success('수강을 취소했습니다')
    else toast.error(result.error)
  }

  const columns = useMemo<ColumnDef<EnrollmentRow>[]>(
    () => [
      {
        id: 'customer',
        header: '고객',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-foreground font-medium">{row.original.customer?.name ?? '알 수 없음'}</span>
            <span className="text-muted-foreground text-xs">{row.original.customer?.phone ?? '—'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => <StatusBadge kind="enrollment" value={row.original.status} />,
      },
      {
        accessorKey: 'enrolled_at',
        header: '등록일',
        cell: ({ row }) => format(new Date(row.original.enrolled_at), 'yyyy.MM.dd'),
      },
      {
        id: 'progress',
        header: () => <div className="text-right">진도</div>,
        cell: ({ row }) => {
          const pct = Number((row.original.progress as { percent?: number })?.percent ?? 0)
          return <div className="text-right tabular-nums">{pct}%</div>
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'active' ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm">
                  수강 취소
                </Button>
              }
              title="수강을 취소할까요?"
              description="고객이 이 강의를 더 이상 볼 수 없습니다."
              confirmLabel="수강 취소"
              destructive
              onConfirm={() => handleRevoke(row.original.id)}
            />
          ) : null,
      },
    ],
    [courseId],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <EnrollCustomerDialog courseId={courseId} />
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="아직 수강생이 없습니다"
          description="고객을 등록하면 이 강의를 볼 수 있습니다."
        />
      ) : (
        <DataTable columns={columns} data={enrollments} />
      )}
    </div>
  )
}

export { EnrollmentsPanel }
