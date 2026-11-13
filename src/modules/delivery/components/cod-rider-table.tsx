"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Wallet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMoney } from "@/lib/money"
import type { Rider } from "@/types/db"
import { settleCodAction } from "../actions"

export interface CodDeliveryRow {
  id: string
  delivery_no: string
  recipient_name: string | null
  cod_amount: number
}

export interface CodRiderGroup {
  rider: Rider
  deliveries: CodDeliveryRow[]
}

function SettleCodDialog({ rider, deliveries }: { rider: Rider; deliveries: CodDeliveryRow[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>(deliveries.map((d) => d.id))
  const [note, setNote] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  function handleOpenChange(next: boolean) {
    if (next) {
      setSelected(deliveries.map((d) => d.id))
      setNote("")
    }
    setOpen(next)
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const amount = deliveries.filter((d) => selected.includes(d.id)).reduce((sum, d) => sum + d.cod_amount, 0)

  async function handleSettle() {
    if (selected.length === 0) {
      toast.error("배송을 1개 이상 선택하세요")
      return
    }
    setLoading(true)
    try {
      const result = await settleCodAction({ rider_id: rider.id, delivery_ids: selected, note: note || undefined })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("착불 정산이 완료되었습니다")
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">정산</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle COD — {rider.name}</DialogTitle>
          <DialogDescription>배송기사에게 현금을 받았는지 확인하고 정산하세요.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72">
          <div className="flex flex-col gap-2 pr-3">
            {deliveries.map((delivery) => (
              <label
                key={delivery.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(delivery.id)}
                    onCheckedChange={(checked) => toggle(delivery.id, checked === true)}
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{delivery.delivery_no}</span>
                    <span className="text-muted-foreground text-xs">{delivery.recipient_name ?? "—"}</span>
                  </span>
                </span>
                <span className="tabular-nums">{formatMoney(delivery.cod_amount)}</span>
              </label>
            ))}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-1.5">
          <Label>메모 (선택)</Label>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="예: 사무실에서 현금으로 받음"
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
          <span className="text-muted-foreground">정산 합계</span>
          <span className="font-semibold tabular-nums">{formatMoney(amount)}</span>
        </div>

        <DialogFooter>
          <Button disabled={loading || selected.length === 0} onClick={handleSettle}>
            {loading ? "정산 중..." : `${formatMoney(amount)} 정산`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Per-rider outstanding-COD table (docs brief: cod page) — one row per rider holding
 *  cod_collected=true / settlement_id=null deliveries. */
function CodRiderTable({ groups }: { groups: CodRiderGroup[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="정산할 금액이 없습니다"
        description="현재 착불금을 가지고 있는 배송기사가 없습니다."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>배송기사</TableHead>
            <TableHead className="text-right">배송 건수</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const amount = group.deliveries.reduce((sum, delivery) => sum + delivery.cod_amount, 0)
            return (
              <TableRow key={group.rider.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{group.rider.name}</span>
                    <span className="text-muted-foreground text-xs">{group.rider.phone}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{group.deliveries.length}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-amber-700 dark:text-amber-400">
                  {formatMoney(amount)}
                </TableCell>
                <TableCell className="text-right">
                  <SettleCodDialog rider={group.rider} deliveries={group.deliveries} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export { CodRiderTable }
