"use client"

import Link from "next/link"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { DeliveryCourier, DeliveryMethod, DeliveryStatus } from "@/types/db"
import { DeliveryMethodBadge } from "./delivery-method-badge"

/** Flattened view-model built by the deliveries list page.tsx query. */
export interface DeliveryListRow {
  id: string
  delivery_no: string
  status: DeliveryStatus
  method: DeliveryMethod
  courier: DeliveryCourier | null
  cod_amount: number
  cod_collected: boolean
  recipient_name: string | null
  district: string | null
  assigned_at: string | null
  delivered_at: string | null
  order: { id: string; order_no: string } | null
  rider: { name: string } | null
}

const columns: ColumnDef<DeliveryListRow>[] = [
  {
    accessorKey: "delivery_no",
    header: "배송번호",
    cell: ({ row }) => (
      <Link href={`/admin/deliveries/${row.original.id}`} className="text-primary font-medium hover:underline">
        {row.original.delivery_no}
      </Link>
    ),
  },
  {
    id: "order",
    header: "주문번호",
    cell: ({ row }) =>
      row.original.order ? (
        <Link href={`/admin/orders/${row.original.order.id}`} className="hover:underline">
          {row.original.order.order_no}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "method",
    header: "방법",
    cell: ({ row }) => (
      <DeliveryMethodBadge
        method={row.original.method}
        riderName={row.original.rider?.name}
        courier={row.original.courier}
      />
    ),
  },
  {
    id: "recipient",
    header: "받는 분",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.recipient_name ?? "—"}</span>
        {row.original.district ? (
          <span className="text-muted-foreground text-xs">{row.original.district}</span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "cod_amount",
    header: () => <div className="text-right">COD</div>,
    cell: ({ row }) => {
      const uncollected = row.original.cod_amount > 0 && !row.original.cod_collected
      return (
        <div
          className={cn(
            "text-right tabular-nums",
            uncollected ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
          )}
        >
          {formatMoney(row.original.cod_amount)}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "상태",
    cell: ({ row }) => <StatusBadge kind="delivery" value={row.original.status} />,
  },
  {
    id: "times",
    header: "배정 / 완료",
    cell: ({ row }) => (
      <div className="text-muted-foreground flex flex-col text-xs">
        <span>{row.original.assigned_at ? format(new Date(row.original.assigned_at), "d MMM, h:mm a") : "—"}</span>
        <span>{row.original.delivered_at ? format(new Date(row.original.delivered_at), "d MMM, h:mm a") : "—"}</span>
      </div>
    ),
  },
]

function DeliveriesTable({ deliveries }: { deliveries: DeliveryListRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={deliveries}
      searchKey="delivery_no"
      searchPlaceholder="Search delivery no..."
    />
  )
}

export { DeliveriesTable }
