"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { BD_DISTRICTS, BD_DIVISIONS, DHAKA_METRO } from "@/lib/bd"
import { formatMoney, fromPaisa, toPaisa } from "@/lib/money"
import type { DeliveryZone } from "@/types/db"
import { deleteZoneAction, upsertZoneAction } from "../actions"

interface ZoneDialogProps {
  zone?: DeliveryZone
  trigger: React.ReactNode
}

/** Create/edit dialog — districts multi-select grouped by division + a district-count summary. */
function ZoneDialog({ zone, trigger }: ZoneDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(zone?.name ?? "")
  const [charge, setCharge] = React.useState(zone ? String(fromPaisa(zone.charge)) : "0")
  const [etaText, setEtaText] = React.useState(zone?.eta_text ?? "")
  const [codAvailable, setCodAvailable] = React.useState(zone?.cod_available ?? true)
  const [advanceRequired, setAdvanceRequired] = React.useState(zone?.advance_required ?? false)
  const [isActive, setIsActive] = React.useState(zone?.is_active ?? true)
  const [districts, setDistricts] = React.useState<string[]>(zone?.districts ?? [])
  const [loading, setLoading] = React.useState(false)

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(zone?.name ?? "")
      setCharge(zone ? String(fromPaisa(zone.charge)) : "0")
      setEtaText(zone?.eta_text ?? "")
      setCodAvailable(zone?.cod_available ?? true)
      setAdvanceRequired(zone?.advance_required ?? false)
      setIsActive(zone?.is_active ?? true)
      setDistricts(zone?.districts ?? [])
    }
    setOpen(next)
  }

  function toggleDistrict(districtName: string, checked: boolean) {
    setDistricts((prev) => (checked ? [...prev, districtName] : prev.filter((d) => d !== districtName)))
  }

  function selectOutsideDhaka() {
    setDistricts(BD_DISTRICTS.filter((d) => !DHAKA_METRO.has(d.name)).map((d) => d.name))
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("이름을 입력하세요")
      return
    }
    if (districts.length === 0) {
      toast.error("지역을 1개 이상 선택하세요")
      return
    }

    setLoading(true)
    try {
      const result = await upsertZoneAction({
        id: zone?.id,
        name: name.trim(),
        districts,
        charge: toPaisa(charge || "0"),
        cod_available: codAvailable,
        advance_required: advanceRequired,
        eta_text: etaText,
        is_active: isActive,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(zone ? "배송 지역이 수정되었습니다" : "배송 지역이 추가되었습니다")
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{zone ? "배송 지역 수정" : "새 배송 지역"}</DialogTitle>
          <DialogDescription>이 배송 지역의 지역 목록, 배송비, 착불 규칙</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>이름</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>배송비 (원)</Label>
              <Input type="number" step="0.01" value={charge} onChange={(event) => setCharge(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>예상 도착 안내</Label>
            <Input value={etaText} onChange={(event) => setEtaText(event.target.value)} placeholder="e.g. 24 hours" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <Label className="text-xs">착불 가능</Label>
              <Switch checked={codAvailable} onCheckedChange={setCodAvailable} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <Label className="text-xs">선결제 필요</Label>
              <Switch checked={advanceRequired} onCheckedChange={setAdvanceRequired} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <Label className="text-xs">활성</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Districts ({districts.length} selected)</Label>
            <Button type="button" variant="outline" size="sm" onClick={selectOutsideDhaka}>
              다카 외 지역 전체 선택
            </Button>
          </div>

          <ScrollArea className="h-64 rounded-md border p-3">
            {BD_DIVISIONS.map((division) => (
              <div key={division} className="mb-3 last:mb-0">
                <p className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wide uppercase">
                  {division}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BD_DISTRICTS.filter((d) => d.division === division).map((d) => (
                    <label key={d.name} className="flex items-center gap-2 text-[13px]">
                      <Checkbox
                        checked={districts.includes(d.name)}
                        onCheckedChange={(checked) => toggleDistrict(d.name, checked === true)}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button disabled={loading} onClick={handleSave}>
            {loading ? "저장 중..." : "배송 지역 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ZoneRowActions({ zone }: { zone: DeliveryZone }) {
  const router = useRouter()

  async function handleDelete() {
    const result = await deleteZoneAction({ id: zone.id })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("배송 지역이 삭제되었습니다")
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1">
      <ZoneDialog
        zone={zone}
        trigger={
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
            <span className="sr-only">수정</span>
          </Button>
        }
      />
      <ConfirmDialog
        title="이 배송 지역을 삭제할까요?"
        description={`"${zone.name}" will be removed. Existing deliveries keep their history.`}
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4" />
            <span className="sr-only">삭제</span>
          </Button>
        }
      />
    </div>
  )
}

const columns: ColumnDef<DeliveryZone>[] = [
  { accessorKey: "name", header: "이름" },
  {
    id: "districts",
    header: "지역",
    cell: ({ row }) => {
      const districts = row.original.districts
      const preview = districts.slice(0, 3)
      return (
        <div className="flex flex-wrap items-center gap-1">
          {preview.map((d) => (
            <Badge key={d} variant="secondary">
              {d}
            </Badge>
          ))}
          {districts.length > preview.length ? (
            <span className="text-muted-foreground text-xs">+{districts.length - preview.length} more</span>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "charge",
    header: () => <div className="text-right">배송비</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{formatMoney(row.original.charge)}</div>,
  },
  {
    id: "cod_available",
    header: "COD",
    cell: ({ row }) =>
      row.original.cod_available ? (
        <Badge variant="success">가능</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      ),
  },
  {
    id: "advance_required",
    header: "선결제",
    cell: ({ row }) =>
      row.original.advance_required ? (
        <Badge variant="warning">필요</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  { accessorKey: "eta_text", header: "예상 도착", cell: ({ row }) => row.original.eta_text ?? "—" },
  {
    id: "is_active",
    header: "상태",
    cell: ({ row }) =>
      row.original.is_active ? (
        <Badge variant="success">활성</Badge>
      ) : (
        <Badge variant="secondary">비활성</Badge>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ZoneRowActions zone={row.original} />,
  },
]

function ZonesTable({ zones }: { zones: DeliveryZone[] }) {
  return <DataTable columns={columns} data={zones} searchKey="name" searchPlaceholder="배송 지역 검색..." />
}

export { ZonesTable, ZoneDialog }
