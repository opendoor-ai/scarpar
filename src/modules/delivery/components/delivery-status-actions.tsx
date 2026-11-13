"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { DELIVERY_STATUS_FLOW, type DeliveryStatus } from "@/lib/status"
import type { Rider } from "@/types/db"
import {
  assignRiderAction,
  markDeliveredAction,
  markFailedAction,
  markInTransitAction,
  markPickedUpAction,
  markReturnedAction,
} from "../actions"

interface DeliveryStatusActionsProps {
  deliveryId: string
  status: DeliveryStatus
  hasOtp: boolean
  codAmount: number
  riders: Rider[]
}

/** Stepper action row — one button per status DELIVERY_STATUS_FLOW allows next. */
function DeliveryStatusActions({ deliveryId, status, hasOtp, codAmount, riders }: DeliveryStatusActionsProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState<DeliveryStatus | null>(null)

  const nextStatuses = DELIVERY_STATUS_FLOW[status]
  if (!nextStatuses || nextStatuses.length === 0) {
    return <p className="text-muted-foreground text-sm">이미 처리가 끝난 배송입니다.</p>
  }

  async function runDirect(next: DeliveryStatus, action: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(next)
    try {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("배송 상태가 변경되었습니다")
      router.refresh()
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.includes("assigned") ? (
        <AssignRiderDialog deliveryId={deliveryId} riders={riders} onDone={() => router.refresh()} />
      ) : null}

      {nextStatuses.includes("picked_up") ? (
        <Button
          disabled={pending !== null}
          onClick={() => runDirect("picked_up", () => markPickedUpAction({ delivery_id: deliveryId }))}
        >
          {pending === "picked_up" ? "처리 중..." : "집하 완료"}
        </Button>
      ) : null}

      {nextStatuses.includes("in_transit") ? (
        <Button
          variant="secondary"
          disabled={pending !== null}
          onClick={() => runDirect("in_transit", () => markInTransitAction({ delivery_id: deliveryId }))}
        >
          {pending === "in_transit" ? "처리 중..." : "배송 중으로 변경"}
        </Button>
      ) : null}

      {nextStatuses.includes("delivered") ? (
        <DeliverDialog
          deliveryId={deliveryId}
          hasOtp={hasOtp}
          codAmount={codAmount}
          onDone={() => router.refresh()}
        />
      ) : null}

      {nextStatuses.includes("failed") ? (
        <FailDialog deliveryId={deliveryId} onDone={() => router.refresh()} />
      ) : null}

      {nextStatuses.includes("returned") ? (
        <ReturnDialog deliveryId={deliveryId} onDone={() => router.refresh()} />
      ) : null}
    </div>
  )
}

function AssignRiderDialog({
  deliveryId,
  riders,
  onDone,
}: {
  deliveryId: string
  riders: Rider[]
  onDone: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [riderId, setRiderId] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleAssign() {
    if (!riderId) {
      toast.error("배송기사를 선택하세요")
      return
    }
    setLoading(true)
    try {
      const result = await assignRiderAction({ delivery_id: deliveryId, rider_id: riderId })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("배송기사가 배정되었습니다")
      setOpen(false)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>배송기사 배정</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>배송기사 배정</DialogTitle>
          <DialogDescription>이 배송을 맡을 배송기사를 고르세요.</DialogDescription>
        </DialogHeader>
        <Select value={riderId} onValueChange={setRiderId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="배송기사 선택" />
          </SelectTrigger>
          <SelectContent>
            {riders.map((rider) => (
              <SelectItem key={rider.id} value={rider.id}>
                {rider.name} — {rider.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button disabled={loading} onClick={handleAssign}>
            {loading ? "배정 중..." : "배정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeliverDialog({
  deliveryId,
  hasOtp,
  codAmount,
  onDone,
}: {
  deliveryId: string
  hasOtp: boolean
  codAmount: number
  onDone: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [otp, setOtp] = React.useState("")
  const [codCollected, setCodCollected] = React.useState(codAmount > 0)
  const [loading, setLoading] = React.useState(false)

  async function handleDeliver() {
    setLoading(true)
    try {
      const result = await markDeliveredAction({
        delivery_id: deliveryId,
        otp: otp || undefined,
        cod_collected: codCollected,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("배송 완료로 처리했습니다")
      setOpen(false)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>배송 완료</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>배송 완료 처리</DialogTitle>
          <DialogDescription>받는 분에게 전달되었는지 확인하세요.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {hasOtp ? (
            <div className="flex flex-col gap-1.5">
              <Label>받는 분 인증 번호</Label>
              <Input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                maxLength={4}
                placeholder="4자리 번호"
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>착불금 받음</Label>
            <Switch checked={codCollected} onCheckedChange={setCodCollected} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={loading} onClick={handleDeliver}>
            {loading ? "저장 중..." : "배송 완료 확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FailDialog({ deliveryId, onDone }: { deliveryId: string; onDone: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleFail() {
    if (!reason.trim()) {
      toast.error("사유를 입력하세요")
      return
    }
    setLoading(true)
    try {
      const result = await markFailedAction({ delivery_id: deliveryId, reason })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("배송 실패로 처리했습니다")
      setOpen(false)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">배송 실패</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>배송 실패 처리</DialogTitle>
          <DialogDescription>주문은 출고 상태로 남으며, 나중에 다시 배송하거나 반송할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="사유 (연락 안 됨, 수령 거부, 주소 오류...)"
        />
        <DialogFooter>
          <Button variant="destructive" disabled={loading} onClick={handleFail}>
            {loading ? "저장 중..." : "배송 실패 확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReturnDialog({ deliveryId, onDone }: { deliveryId: string; onDone: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleReturn() {
    setLoading(true)
    try {
      const result = await markReturnedAction({ delivery_id: deliveryId, note: note || undefined })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("반송 처리했습니다")
      setOpen(false)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">반송 처리</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>반송 처리</DialogTitle>
          <DialogDescription>주문도 반품 상태로 바뀝니다.</DialogDescription>
        </DialogHeader>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="메모 (선택)" />
        <DialogFooter>
          <Button disabled={loading} onClick={handleReturn}>
            {loading ? "저장 중..." : "반송 확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DeliveryStatusActions }
