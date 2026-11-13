'use client'

import { Minus, Plus, ShoppingCart, Trash2, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import type { CartLine } from '@/modules/pos/components/pos-terminal'

type TenderMethod = 'cash' | 'bkash' | 'nagad'

interface CartPanelProps {
  cart: CartLine[]
  onUpdateQty: (key: string, qty: number) => void
  onRemove: (key: string) => void
  customerName: string
  onCustomerNameChange: (value: string) => void
  customerPhone: string
  onCustomerPhoneChange: (value: string) => void
  discountTaka: string
  onDiscountTakaChange: (value: string) => void
  tenderMethod: TenderMethod
  onTenderMethodChange: (method: TenderMethod) => void
  amountReceivedTaka: string
  onAmountReceivedTakaChange: (value: string) => void
  subtotal: number
  discountAmount: number
  total: number
  changeDue: number
  isSubmitting: boolean
  onCompleteSale: () => void
}

const TENDER_METHODS: { value: TenderMethod; label: string }[] = [
  { value: 'cash', label: '현금' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
]

export function CartPanel({
  cart,
  onUpdateQty,
  onRemove,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  discountTaka,
  onDiscountTakaChange,
  tenderMethod,
  onTenderMethodChange,
  amountReceivedTaka,
  onAmountReceivedTakaChange,
  subtotal,
  discountAmount,
  total,
  changeDue,
  isSubmitting,
  onCompleteSale,
}: CartPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">장바구니</h2>
        <span className="text-xs text-muted-foreground">
          {cart.length} line{cart.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        {cart.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="장바구니가 비어 있습니다"
            description="왼쪽에서 상품을 눌러 판매를 시작하세요."
          />
        ) : (
          cart.map((line) => (
            <div key={line.key} className="flex items-center gap-2 border-b py-2 text-sm last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{line.name}</div>
                {line.variantName ? (
                  <div className="text-xs text-muted-foreground">{line.variantName}</div>
                ) : null}
                <div className="text-xs tabular-nums text-muted-foreground">
                  {formatMoney(line.unitPrice)} each
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-6"
                  onClick={() => onUpdateQty(line.key, line.qty - 1)}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-5 text-center tabular-nums">{line.qty}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-6"
                  onClick={() => onUpdateQty(line.key, line.qty + 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              <div className="w-16 text-right text-sm font-medium tabular-nums">
                {formatMoney(line.unitPrice * line.qty)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(line.key)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3">
        <Label htmlFor="pos-discount">할인 (원)</Label>
        <Input
          id="pos-discount"
          inputMode="decimal"
          placeholder="0"
          value={discountTaka}
          onChange={(event) => onDiscountTakaChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">상품 금액</span>
          <span className="tabular-nums">{formatMoney(subtotal)}</span>
        </div>
        {discountAmount > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">할인</span>
            <span className="tabular-nums">-{formatMoney(discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-muted-foreground">배송비</span>
          <span className="tabular-nums">{formatMoney(0)}</span>
        </div>
        <div className="flex items-baseline justify-between border-t pt-1.5 text-lg font-semibold">
          <span>합계</span>
          <span className="tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <User className="size-3.5" />
          고객 (선택)
        </div>
        <Input
          placeholder="방문 고객"
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
        />
        <Input
          placeholder="전화번호 (선택)"
          value={customerPhone}
          onChange={(event) => onCustomerPhoneChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <Label>결제 수단</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {TENDER_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => onTenderMethodChange(method.value)}
              className={cn(
                'rounded-md border py-1.5 text-xs font-medium transition-colors',
                tenderMethod === method.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent',
              )}
            >
              {method.label}
            </button>
          ))}
        </div>

        {tenderMethod === 'cash' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-amount-received">받은 금액 (원)</Label>
            <Input
              id="pos-amount-received"
              inputMode="decimal"
              placeholder={(total / 100).toFixed(2)}
              value={amountReceivedTaka}
              onChange={(event) => onAmountReceivedTakaChange(event.target.value)}
            />
            {amountReceivedTaka.trim() ? (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">거스름돈</span>
                <span className="font-medium tabular-nums">{formatMoney(changeDue)}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button
        size="lg"
        className="mt-1 h-11 text-base"
        disabled={cart.length === 0 || isSubmitting}
        onClick={onCompleteSale}
      >
        {isSubmitting ? '처리 중…' : `판매 완료 — ${formatMoney(total)}`}
      </Button>
    </div>
  )
}
