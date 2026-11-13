'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { BD_DISTRICTS } from '@/lib/bd'
import { formatMoney, fromPaisa, toPaisa } from '@/lib/money'
import { createManualOrderAction } from '@/modules/orders/actions'
import type { CreateManualOrderInput } from '@/modules/orders/schemas'
import type { DeliveryZone } from '@/types/db'
import { CustomerPicker, EMPTY_CUSTOMER_VALUE, type CustomerPickerValue } from './customer-picker'
import { ItemBuilder, type OrderLineItem } from './item-builder'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cod', label: '착불(현장 결제)' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'uddoktapay', label: 'UddoktaPay' },
  { value: 'sslcommerz', label: 'SSLCommerz' },
  { value: 'bank', label: '계좌이체' },
  { value: 'cash', label: '현금' },
] as const

export interface DefaultAdvance {
  required: boolean
  type: 'fixed' | 'percent'
  /** paisa — meaningful only when type === 'fixed' (no percent-value setting exists yet). */
  amountPaisa: number
}

interface NewOrderFormProps {
  deliveryZones: DeliveryZone[]
  deliveryEnabled: boolean
  defaultAdvance: DefaultAdvance
}

function NewOrderForm({ deliveryZones, deliveryEnabled, defaultAdvance }: NewOrderFormProps) {
  const router = useRouter()

  const [customer, setCustomer] = React.useState<CustomerPickerValue>(EMPTY_CUSTOMER_VALUE)
  const [line1, setLine1] = React.useState('')
  const [area, setArea] = React.useState('')
  const [district, setDistrict] = React.useState('')
  const [postcode, setPostcode] = React.useState('')
  const [items, setItems] = React.useState<OrderLineItem[]>([])
  const [deliveryZoneId, setDeliveryZoneId] = React.useState<string>('')
  const [manualDeliveryCharge, setManualDeliveryCharge] = React.useState('')
  const [discountCode, setDiscountCode] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState<CreateManualOrderInput['payment_method']>('cod')
  const [advanceAmount, setAdvanceAmount] = React.useState('')
  const [advanceTouched, setAdvanceTouched] = React.useState(false)
  const [noteInternal, setNoteInternal] = React.useState('')
  const [confirmImmediately, setConfirmImmediately] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const useZones = deliveryEnabled && deliveryZones.length > 0

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.qty, 0)
  const deliveryCharge = useZones
    ? (deliveryZones.find((z) => z.id === deliveryZoneId)?.charge ?? 0)
    : toPaisa(manualDeliveryCharge || '0')
  const estimatedTotal = subtotal + deliveryCharge // discount unresolved client-side — server computes the real total

  // Pre-fill the advance amount from settings when COD is selected and the
  // staff hasn't touched the field yet. Only for type 'fixed' — there's no
  // percent-value setting defined in the registry yet to compute a percent default.
  React.useEffect(() => {
    if (paymentMethod === 'cod' && defaultAdvance.required && defaultAdvance.type === 'fixed' && !advanceTouched) {
      setAdvanceAmount(String(fromPaisa(defaultAdvance.amountPaisa)))
    }
  }, [paymentMethod, defaultAdvance, advanceTouched])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error('고객 이름과 전화번호를 입력하세요')
      return
    }
    if (!line1.trim() || !district) {
      toast.error('주소와 지역을 입력하세요')
      return
    }
    if (items.length === 0) {
      toast.error('상품을 1개 이상 추가하세요')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateManualOrderInput = {
        customer: {
          id: customer.mode === 'existing' ? customer.id : undefined,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim() || undefined,
        },
        address: {
          line1: line1.trim(),
          area: area.trim() || undefined,
          district,
          postcode: postcode.trim() || undefined,
        },
        delivery_zone_id: useZones && deliveryZoneId ? deliveryZoneId : undefined,
        manual_delivery_charge: !useZones ? toPaisa(manualDeliveryCharge || '0') : undefined,
        items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku,
          unit_price: item.unit_price,
          qty: item.qty,
        })),
        discount_code: discountCode.trim() || undefined,
        payment_method: paymentMethod,
        advance_amount: advanceAmount.trim() || undefined,
        note_internal: noteInternal.trim() || undefined,
        confirm_immediately: confirmImmediately,
      }

      const result = await createManualOrderAction(payload)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`주문 ${result.data?.orderNo}이(가) 생성되었습니다`)
      router.push(`/admin/orders/${result.data?.orderId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>고객</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>배송 주소</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="address-line1">주소</Label>
                <Input id="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="도로명 주소, 상세 주소" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address-area">동/읍/면</Label>
                <Input id="address-area" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address-district">지역</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger id="address-district" className="w-full">
                    <SelectValue placeholder="지역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {BD_DISTRICTS.map((d) => (
                      <SelectItem key={d.name} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address-postcode">우편번호</Label>
                <Input id="address-postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>상품</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemBuilder value={items} onChange={setItems} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>배송</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {useZones ? (
                <Select value={deliveryZoneId} onValueChange={setDeliveryZoneId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="배송 지역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name} — {formatMoney(zone.charge)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manual-delivery-charge">배송비 (원)</Label>
                  <Input
                    id="manual-delivery-charge"
                    inputMode="decimal"
                    value={manualDeliveryCharge}
                    onChange={(e) => setManualDeliveryCharge(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>할인</CardTitle>
            </CardHeader>
            <CardContent>
              <Input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="할인 코드 (선택)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>결제</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>결제 방법</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="advance-amount">선결제 금액 (원)</Label>
                <Input
                  id="advance-amount"
                  inputMode="decimal"
                  value={advanceAmount}
                  onChange={(e) => {
                    setAdvanceTouched(true)
                    setAdvanceAmount(e.target.value)
                  }}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>메모</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} value={noteInternal} onChange={(e) => setNoteInternal(e.target.value)} placeholder="내부 메모 (선택)" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">예상 합계</span>
                <span className="font-semibold tabular-nums">{formatMoney(estimatedTotal)}</span>
              </div>
              <p className="text-muted-foreground text-xs">
최종 금액(할인 포함)은 저장할 때 다시 계산됩니다.
              </p>
              <label className="flex items-center gap-2 text-[13px]">
                <Checkbox checked={confirmImmediately} onCheckedChange={(v) => setConfirmImmediately(Boolean(v))} />
바로 주문 확인 처리
              </label>
              <Button type="submit" disabled={submitting}>
                {submitting ? '만드는 중…' : '주문 만들기'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

export { NewOrderForm }
