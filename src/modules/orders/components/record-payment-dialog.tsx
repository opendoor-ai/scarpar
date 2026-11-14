'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { recordPaymentAction } from '@/modules/orders/actions'
import { RecordPaymentSchema, type RecordPaymentInput } from '@/modules/orders/schemas'

const KIND_OPTIONS = [
  { value: 'advance', label: '선결제' },
  { value: 'full', label: '전액' },
  { value: 'balance', label: '잔금' },
]

const METHOD_OPTIONS = [
  { value: 'cod', label: '착불' },
  { value: 'transfer', label: '계좌이체' },
  { value: 'card', label: '카드' },
  { value: 'bank', label: '계좌이체' },
  { value: 'cash', label: '현금' },
]

const DEFAULT_VALUES = {
  kind: 'advance' as const,
  method: 'transfer' as const,
  amount: '',
  provider_ref: '',
  sender_number: '',
  note: '',
}

interface RecordPaymentDialogProps {
  orderId: string
}

function RecordPaymentDialog({ orderId }: RecordPaymentDialogProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const form = useForm<RecordPaymentInput>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: { orderId, ...DEFAULT_VALUES },
  })

  async function onSubmit(values: RecordPaymentInput) {
    const result = await recordPaymentAction(values)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('결제가 기록되었습니다 — 확인 대기')
    setOpen(false)
    form.reset({ orderId, ...DEFAULT_VALUES })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">결제 기록</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>결제 기록</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>구분</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KIND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>결제 방법</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METHOD_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>금액 (원)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="provider_ref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>거래 번호</FormLabel>
                    <FormControl>
                      <Input placeholder="trxID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sender_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>입금자 번호</FormLabel>
                    <FormControl>
                      <Input placeholder="017XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '저장 중…' : '결제 기록'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export { RecordPaymentDialog }
