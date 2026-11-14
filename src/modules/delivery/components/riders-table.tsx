"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, UserX } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Rider } from "@/types/db"
import { deactivateRiderAction, upsertRiderAction } from "../actions"

/** Rider row + the active-deliveries count computed by the riders list page.tsx. */
export interface RiderListRow extends Rider {
  activeDeliveries: number
}

function RiderDialog({ rider, trigger }: { rider?: Rider; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(rider?.name ?? "")
  const [phone, setPhone] = React.useState(rider?.phone ?? "")
  const [vehicle, setVehicle] = React.useState(rider?.vehicle ?? "")
  const [isActive, setIsActive] = React.useState(rider?.is_active ?? true)
  const [userId, setUserId] = React.useState(rider?.user_id ?? "")
  const [loading, setLoading] = React.useState(false)

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(rider?.name ?? "")
      setPhone(rider?.phone ?? "")
      setVehicle(rider?.vehicle ?? "")
      setIsActive(rider?.is_active ?? true)
      setUserId(rider?.user_id ?? "")
    }
    setOpen(next)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("이름을 입력하세요")
      return
    }
    if (!phone.trim()) {
      toast.error("전화번호를 입력하세요")
      return
    }

    setLoading(true)
    try {
      const result = await upsertRiderAction({
        id: rider?.id,
        name: name.trim(),
        phone: phone.trim(),
        vehicle,
        is_active: isActive,
        user_id: userId,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(rider ? "배송기사가 수정되었습니다" : "배송기사가 추가되었습니다")
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rider ? "배송기사 수정" : "새 배송기사"}</DialogTitle>
          <DialogDescription>배송기사는 배송을 맡고 착불금을 받을 수 있습니다.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>이름</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>전화번호</Label>
              <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>운송 수단</Label>
              <Input
                value={vehicle}
                onChange={(event) => setVehicle(event.target.value)}
                placeholder="오토바이, 화물차..."
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>연결할 직원 회원 ID (선택)</Label>
            <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="uuid" />
            <p className="text-muted-foreground text-xs">
              직원 회원 ID를 넣으면 이 배송기사가 로그인해 자기 배송만 볼 수 있습니다.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>활성</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={loading} onClick={handleSave}>
            {loading ? "저장 중..." : "배송기사 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RiderRowActions({ rider }: { rider: Rider }) {
  const router = useRouter()

  async function handleDeactivate() {
    const result = await deactivateRiderAction({ id: rider.id })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("배송기사를 비활성화했습니다")
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1">
      <RiderDialog
        rider={rider}
        trigger={
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
            <span className="sr-only">수정</span>
          </Button>
        }
      />
      {rider.is_active ? (
        <ConfirmDialog
          title="이 배송기사를 비활성화할까요?"
          description={`"${rider.name}" will no longer be assignable to new deliveries.`}
          confirmLabel="비활성화"
          destructive
          onConfirm={handleDeactivate}
          trigger={
            <Button variant="ghost" size="icon">
              <UserX className="size-4" />
              <span className="sr-only">비활성화</span>
            </Button>
          }
        />
      ) : null}
    </div>
  )
}

const columns: ColumnDef<RiderListRow>[] = [
  { accessorKey: "name", header: "이름" },
  { accessorKey: "phone", header: "전화번호" },
  { accessorKey: "vehicle", header: "운송 수단", cell: ({ row }) => row.original.vehicle ?? "—" },
  {
    accessorKey: "activeDeliveries",
    header: () => <div className="text-right">활성</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.activeDeliveries}</div>,
  },
  {
    accessorKey: "cash_on_hand",
    header: () => <div className="text-right">보유 현금</div>,
    cell: ({ row }) => (
      <div
        className={cn(
          "text-right tabular-nums",
          row.original.cash_on_hand > 0 ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {formatMoney(row.original.cash_on_hand)}
      </div>
    ),
  },
  {
    id: "is_active",
    header: "상태",
    cell: ({ row }) =>
      row.original.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="secondary">비활성</Badge>,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <RiderRowActions rider={row.original} />,
  },
]

function RidersTable({ riders }: { riders: RiderListRow[] }) {
  return <DataTable columns={columns} data={riders} searchKey="name" searchPlaceholder="배송기사 검색..." />
}

export { RidersTable, RiderDialog }
