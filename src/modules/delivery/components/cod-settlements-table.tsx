"use client"

import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { formatMoney } from "@/lib/money"

/** Flattened view-model built by the COD page.tsx query (rider name pre-joined). */
export interface CodSettlementRow {
  id: string
  rider_name: string
  amount: number
  delivery_count: number
  note: string | null
  created_at: string
}

const columns: ColumnDef<CodSettlementRow>[] = [
  { accessorKey: "rider_name", header: "배송기사" },
  {
    accessorKey: "delivery_count",
    header: () => <div className="text-right">배송 건수</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.delivery_count}</div>,
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">금액</div>,
    cell: ({ row }) => <div className="text-right font-medium tabular-nums">{formatMoney(row.original.amount)}</div>,
  },
  { accessorKey: "note", header: "메모", cell: ({ row }) => row.original.note ?? "—" },
  {
    accessorKey: "created_at",
    header: "정산일",
    cell: ({ row }) => format(new Date(row.original.created_at), "d MMM yyyy, h:mm a"),
  },
]

function CodSettlementsTable({ settlements }: { settlements: CodSettlementRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={settlements}
      emptyState={<span className="text-muted-foreground">아직 정산 내역이 없습니다.</span>}
    />
  )
}

export { CodSettlementsTable }
