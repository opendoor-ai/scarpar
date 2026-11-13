'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Undo2 } from 'lucide-react'

import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'

export interface ReturnRow {
  id: string
  return_no: string
  order_id: string
  order_no: string
  status: string
  resolution: string | null
  refund_amount: number | null
  created_at: string
}

interface ReturnsTableProps {
  data: ReturnRow[]
}

function ReturnsTable({ data }: ReturnsTableProps) {
  const router = useRouter()

  const columns = React.useMemo<ColumnDef<ReturnRow>[]>(
    () => [
      {
        accessorKey: 'return_no',
        header: '반품번호',
        cell: ({ row }) => <span className="font-medium">{row.original.return_no}</span>,
      },
      {
        id: 'order',
        header: '주문번호',
        cell: ({ row }) => (
          <Link
            href={`/admin/orders/${row.original.order_id}`}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.order_no}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => <StatusBadge kind="return" value={row.original.status} />,
      },
      {
        accessorKey: 'resolution',
        header: '처리 방식',
        cell: ({ row }) => (
          <span className="text-muted-foreground capitalize">{row.original.resolution?.replace('_', ' ') ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'refund_amount',
        header: '환불액',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.refund_amount != null ? formatMoney(row.original.refund_amount) : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: '등록일',
        cell: ({ row }) => format(new Date(row.original.created_at), 'yyyy.MM.dd HH:mm'),
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      pageSize={50}
      onRowClick={(row) => router.push(`/admin/returns/${row.id}`)}
      emptyState={<EmptyState icon={Undo2} title="아직 반품이 없습니다" description="주문에서 등록한 반품이 여기에 표시됩니다." />}
    />
  )
}

export { ReturnsTable }
