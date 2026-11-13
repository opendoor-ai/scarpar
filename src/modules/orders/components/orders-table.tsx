'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Circle, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { updateOrderStatusAction } from '@/modules/orders/actions'

export interface OrderRow {
  id: string
  order_no: string
  placed_at: string
  customer_name: string
  customer_phone: string
  channel: string
  status: string
  payment_status: string
  risk_level: string | null
  total: number
  items_count: number
}

const CHANNEL_LABEL: Record<string, string> = {
  storefront: '쇼핑몰',
  pos: '매장(POS)',
  manual: '직접 등록',
}

interface OrdersTableProps {
  data: OrderRow[]
}

function OrdersTable({ data }: OrdersTableProps) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = React.useState(false)

  // Selection can go stale across a searchParams-driven refetch (new `data`
  // identity) — drop anything no longer present in the current page of rows.
  React.useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(data.map((r) => r.id))
      const next = new Set(Array.from(prev).filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [data])

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(data.map((r) => r.id)) : new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function bulkConfirm() {
    setBulkBusy(true)
    try {
      const ids = Array.from(selected)
      const results = await Promise.all(
        ids.map((id) => updateOrderStatusAction({ orderId: id, nextStatus: 'confirmed' })),
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) {
        toast.error(`${ids.length}건 중 ${failed}건을 확인 처리하지 못했습니다`)
      } else {
        toast.success(`${ids.length}건 확인 처리되었습니다`)
      }
      setSelected(new Set())
      router.refresh()
    } finally {
      setBulkBusy(false)
    }
  }

  const columns = React.useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={data.length > 0 && selected.size === data.length}
            onCheckedChange={(v) => toggleAll(Boolean(v))}
            aria-label="전체 선택"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={(v) => toggleOne(row.original.id, Boolean(v))}
            onClick={(e) => e.stopPropagation()}
            aria-label="선택"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'order_no',
        header: '주문번호',
        cell: ({ row }) => <span className="font-medium">{row.original.order_no}</span>,
      },
      {
        accessorKey: 'placed_at',
        header: '주문일',
        cell: ({ row }) => format(new Date(row.original.placed_at), 'MM.dd HH:mm'),
      },
      {
        id: 'customer',
        header: '고객',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.customer_name}</span>
            <span className="text-muted-foreground text-xs">{row.original.customer_phone}</span>
          </div>
        ),
      },
      {
        accessorKey: 'channel',
        header: '경로',
        cell: ({ row }) => <Badge variant="outline">{CHANNEL_LABEL[row.original.channel] ?? row.original.channel}</Badge>,
      },
      {
        accessorKey: 'items_count',
        header: '수량',
        cell: ({ row }) => <span className="tabular-nums">{row.original.items_count}</span>,
      },
      {
        accessorKey: 'total',
        header: '합계',
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.total)}</span>,
      },
      {
        accessorKey: 'payment_status',
        header: '결제',
        cell: ({ row }) => <StatusBadge kind="payment" value={row.original.payment_status} />,
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {row.original.risk_level === 'high' || row.original.risk_level === 'medium' ? (
              <Circle
                className={cn(
                  'size-2 fill-current',
                  row.original.risk_level === 'high' ? 'text-destructive' : 'text-amber-600 dark:text-amber-500',
                )}
                aria-label={`위험도 ${row.original.risk_level}`}
              />
            ) : null}
            <StatusBadge kind="order" value={row.original.status} />
          </div>
        ),
      },
    ],
    [data, selected],
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      pageSize={50}
      onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
      emptyState={
        <EmptyState icon={ShoppingCart} title="주문이 없습니다" description="다른 조건이나 기간으로 검색해 보세요." />
      }
      toolbar={
        selected.size > 0 ? (
          <Button size="sm" onClick={bulkConfirm} disabled={bulkBusy}>
            {bulkBusy ? '처리 중…' : `선택한 ${selected.size}건 확인 처리`}
          </Button>
        ) : undefined
      }
    />
  )
}

export { OrdersTable }
