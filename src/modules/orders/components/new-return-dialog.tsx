'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { createReturnAction } from '@/modules/orders/actions'

interface ReturnableItem {
  id: string
  product_name: string
  variant_name: string | null
  qty: number
}

interface RowState {
  checked: boolean
  qty: number
  condition: string
}

interface NewReturnDialogProps {
  orderId: string
  items: ReturnableItem[]
}

function NewReturnDialog({ orderId, items }: NewReturnDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [rows, setRows] = React.useState<Record<string, RowState>>(() =>
    Object.fromEntries(items.map((item) => [item.id, { checked: false, qty: item.qty, condition: '' }])),
  )
  const [submitting, setSubmitting] = React.useState(false)
  const router = useRouter()

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function handleSubmit() {
    const selected = items
      .filter((item) => rows[item.id]?.checked)
      .map((item) => ({
        order_item_id: item.id,
        qty: Math.min(rows[item.id].qty, item.qty),
        condition: rows[item.id].condition || undefined,
      }))
      .filter((row) => row.qty > 0)

    if (selected.length === 0) {
      toast.error('상품을 1개 이상 선택하세요')
      return
    }

    setSubmitting(true)
    try {
      const result = await createReturnAction({ orderId, items: selected, reason: reason.trim() || undefined })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`반품 ${result.data?.returnNo}이(가) 생성되었습니다`)
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Undo2 className="size-4" />
반품 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>반품 등록</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>상품</TableHead>
                <TableHead className="w-20 text-right">수량</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={rows[item.id]?.checked ?? false}
                      onCheckedChange={(v) => updateRow(item.id, { checked: Boolean(v) })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{item.product_name}</span>
                      {item.variant_name ? <span className="text-muted-foreground text-xs">{item.variant_name}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={1}
                      max={item.qty}
                      value={rows[item.id]?.qty ?? item.qty}
                      onChange={(e) => updateRow(item.id, { qty: Number(e.target.value) })}
                      className="h-7 w-16 text-right tabular-nums"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={rows[item.id]?.condition ?? ''}
                      onChange={(e) => updateRow(item.id, { condition: e.target.value })}
                      placeholder="예: 미개봉"
                      className="h-7"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-reason">사유</Label>
            <Textarea id="return-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '만드는 중…' : '반품 등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { NewReturnDialog }
