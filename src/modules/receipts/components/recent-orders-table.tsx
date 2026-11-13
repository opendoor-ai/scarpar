'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Receipt as ReceiptIcon, Printer } from 'lucide-react'

import { formatMoney } from '@/lib/money'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'

export interface RecentOrderRow {
  id: string
  order_no: string
  customer_name: string
  total: number
  payment_status: string
  placed_at: string
}

const columns: ColumnDef<RecentOrderRow>[] = [
  { accessorKey: 'order_no', header: '주문번호' },
  { accessorKey: 'customer_name', header: '고객' },
  {
    accessorKey: 'placed_at',
    header: '날짜',
    cell: ({ row }) => format(new Date(row.original.placed_at), 'yyyy.MM.dd'),
  },
  {
    accessorKey: 'total',
    header: () => <div className="text-right">합계</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{formatMoney(row.original.total)}</div>,
  },
  {
    accessorKey: 'payment_status',
    header: '결제',
    cell: ({ row }) => <StatusBadge kind="payment" value={row.original.payment_status} />,
  },
  {
    id: 'actions',
    header: () => <div className="text-right">인쇄</div>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/print/invoice/${row.original.id}`} target="_blank" rel="noopener noreferrer">
            <ReceiptIcon className="size-4" />
            명세서
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/print/thermal/${row.original.id}`} target="_blank" rel="noopener noreferrer">
            <Printer className="size-4" />
            영수증
          </Link>
        </Button>
      </div>
    ),
  },
]

export function RecentOrdersTable({ orders }: { orders: RecentOrderRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={orders}
      searchKey="order_no"
      searchPlaceholder="주문번호로 검색..."
      emptyState={
        <EmptyState
          icon={ReceiptIcon}
          title="아직 주문이 없습니다"
          description="주문이 들어오면 여기에 표시됩니다."
        />
      }
    />
  )
}
