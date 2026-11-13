'use client'

// "Adjust stock" dialog: product search (Command+Popover combobox) -> variant
// select if the product has any -> qty delta + note -> adjustStock action.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { adjustStock } from '../actions'

export interface StockAdjustProduct {
  id: string
  name: string
  sku: string | null
  trackStock: boolean
  stockQty: number
  variants: { id: string; name: string; stockQty: number }[]
}

interface AdjustStockDialogProps {
  products: StockAdjustProduct[]
}

const NO_VARIANT = '__product_level__'

function AdjustStockDialog({ products }: AdjustStockDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [productId, setProductId] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<string>(NO_VARIANT)
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedProduct = products.find((p) => p.id === productId) ?? null

  function reset() {
    setProductId(null)
    setVariantId(NO_VARIANT)
    setDelta('')
    setNote('')
  }

  async function handleSubmit() {
    if (!selectedProduct) {
      toast.error('상품을 선택하세요')
      return
    }
    const qtyDelta = Number(delta)
    if (!Number.isInteger(qtyDelta) || qtyDelta === 0) {
      toast.error('0이 아닌 정수를 입력하세요')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await adjustStock({
        product_id: selectedProduct.id,
        variant_id: variantId === NO_VARIANT ? null : variantId,
        qty_delta: qtyDelta,
        note: note.trim() ? note.trim() : null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('재고가 조정되었습니다')
      setOpen(false)
      reset()
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <PackagePlus className="size-4" />
재고 조정
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>재고 조정</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>상품</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                  {selectedProduct ? selectedProduct.name : '상품 검색...'}
                  <ChevronsUpDown className="text-muted-foreground size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder="상품명 또는 SKU로 검색..." />
                  <CommandList>
                    <CommandEmpty>상품을 찾을 수 없습니다.</CommandEmpty>
                    <CommandGroup>
                      {products.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.sku ?? ''}`}
                          onSelect={() => {
                            setProductId(p.id)
                            setVariantId(NO_VARIANT)
                            setPickerOpen(false)
                          }}
                        >
                          <Check className={cn('size-4', p.id === productId ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex flex-1 flex-col">
                            <span>{p.name}</span>
                            {p.sku ? <span className="text-muted-foreground text-xs">{p.sku}</span> : null}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedProduct && selectedProduct.variants.length > 0 ? (
            <div className="flex flex-col gap-1">
              <Label>옵션</Label>
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VARIANT}>Product-level stock ({selectedProduct.stockQty})</SelectItem>
                  {selectedProduct.variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.stockQty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedProduct && !selectedProduct.trackStock ? (
            <p className="text-muted-foreground text-xs">
              이 상품은 재고 관리를 하지 않지만, 변동 내역은 기록됩니다.
            </p>
          ) : null}

          <div className="flex flex-col gap-1">
            <Label>수량 변경 (+입고 / -출고)</Label>
            <Input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 10 or -3" inputMode="numeric" />
          </div>

          <div className="flex flex-col gap-1">
            <Label>메모</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="조정 사유" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '조정 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { AdjustStockDialog }
