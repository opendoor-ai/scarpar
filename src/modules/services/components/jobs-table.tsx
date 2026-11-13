'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'

import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'

import type { JobListRow } from '../schemas'

interface JobsTableProps {
  jobs: JobListRow[]
}

function JobsTable({ jobs }: JobsTableProps) {
  const router = useRouter()

  const columns = useMemo<ColumnDef<JobListRow>[]>(
    () => [
      { accessorKey: 'job_no', header: '작업번호' },
      {
        accessorKey: 'title',
        header: '작업명',
        cell: ({ row }) => <span className="text-foreground font-medium">{row.original.title}</span>,
      },
      {
        id: 'customer',
        header: '고객',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.customer?.name ?? '알 수 없음'}</span>
            <span className="text-muted-foreground text-xs">{row.original.customer?.phone ?? '—'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'scheduled_at',
        header: '예정일',
        cell: ({ row }) =>
          row.original.scheduled_at ? format(new Date(row.original.scheduled_at), 'MM.dd HH:mm') : '—',
      },
      {
        id: 'assigned_to',
        header: '담당자',
        cell: ({ row }) =>
          row.original.assigned_to_name ? (
            row.original.assigned_to_name
          ) : (
            <span className="text-muted-foreground">미배정</span>
          ),
      },
      {
        id: 'amount',
        header: () => <div className="text-right">금액</div>,
        cell: ({ row }) => {
          const amount = row.original.final_amount ?? row.original.quote_amount
          return (
            <div className="text-right tabular-nums">
              {amount != null ? formatMoney(amount) : '—'}
              {row.original.final_amount != null ? (
                <span className="text-muted-foreground ml-1 text-xs">(최종)</span>
              ) : row.original.quote_amount != null ? (
                <span className="text-muted-foreground ml-1 text-xs">(견적)</span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => <StatusBadge kind="job" value={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={jobs}
      searchKey="title"
      searchPlaceholder="Search jobs..."
      onRowClick={(job) => router.push(`/admin/services/${job.id}`)}
    />
  )
}

export { JobsTable }
