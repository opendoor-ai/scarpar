'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Tag, Truck } from 'lucide-react'

import { formatMoney } from '@/lib/money'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'

export interface RecentDeliveryRow {
  id: string
  delivery_no: string
  recipient_name: string | null
  cod_amount: number
  status: string
}

const columns: ColumnDef<RecentDeliveryRow>[] = [
  { accessorKey: 'delivery_no', header: '배송번호' },
  {
    accessorKey: 'recipient_name',
    header: '받는 분',
    cell: ({ row }) => row.original.recipient_name || '—',
  },
  {
    accessorKey: 'cod_amount',
    header: () => <div className="text-right">착불</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.cod_amount > 0 ? formatMoney(row.original.cod_amount) : '—'}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => <StatusBadge kind="delivery" value={row.original.status} />,
  },
  {
    id: 'actions',
    header: () => <div className="text-right">인쇄</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/print/label/${row.original.id}`} target="_blank" rel="noopener noreferrer">
            <Tag className="size-4" />
            라벨
          </Link>
        </Button>
      </div>
    ),
  },
]

export function RecentDeliveriesTable({ deliveries }: { deliveries: RecentDeliveryRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={deliveries}
      searchKey="delivery_no"
      searchPlaceholder="배송번호로 검색..."
      emptyState={
        <EmptyState
          icon={Truck}
          title="아직 배송이 없습니다"
          description="배송을 등록하면 여기에 표시됩니다."
        />
      }
    />
  )
}
