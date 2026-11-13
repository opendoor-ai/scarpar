'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { ShoppingCart } from 'lucide-react'

import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'
import type { Order } from '@/types/db'

export type CustomerOrderRow = Pick<Order, 'id' | 'order_no' | 'placed_at' | 'total' | 'status' | 'payment_status'>

export function CustomerOrdersTable({ orders }: { orders: CustomerOrderRow[] }) {
  const columns = React.useMemo<ColumnDef<CustomerOrderRow>[]>(
    () => [
      {
        accessorKey: 'order_no',
        header: '주문번호',
        cell: ({ row }) => (
          <Link href={`/admin/orders/${row.original.id}`} className="text-primary font-medium hover:underline">
            {row.original.order_no}
          </Link>
        ),
      },
      {
        accessorKey: 'placed_at',
        header: '날짜',
        cell: ({ row }) => format(new Date(row.original.placed_at), 'yyyy.MM.dd'),
      },
      {
        accessorKey: 'total',
        header: '합계',
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.total)}</span>,
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => <StatusBadge kind="order" value={row.original.status} />,
      },
      {
        accessorKey: 'payment_status',
        header: '결제',
        cell: ({ row }) => <StatusBadge kind="payment" value={row.original.payment_status} />,
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={orders}
      emptyState={
        <EmptyState
          icon={ShoppingCart}
          title="아직 주문이 없습니다"
          description="이 고객의 주문이 여기에 표시됩니다."
        />
      }
    />
  )
}
