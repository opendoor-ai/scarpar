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
import { refundReturnAction } from '@/modules/orders/actions'
import { RefundReturnSchema, type RefundReturnInput } from '@/modules/orders/schemas'

const METHOD_OPTIONS = [
  { value: 'cod', label: '현금' },
  { value: 'transfer', label: '계좌이체' },
  { value: 'card', label: '카드' },
  { value: 'bank', label: '계좌이체' },
  { value: 'cash', label: '현금' },
]

const RESOLUTION_OPTIONS = [
  { value: 'refund', label: '환불' },
  { value: 'store_credit', label: '적립금' },
  { value: 'exchange', label: '교환' },
]

interface RefundDialogProps {
  returnId: string
  // orderId kept in the prop surface for callers that need it for navigation/refresh
  // context even though the action itself resolves the order from the return row.
  orderId: string
}

function RefundDialog({ returnId }: RefundDialogProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const form = useForm<RefundReturnInput>({
    resolver: zodResolver(RefundReturnSchema),
    defaultValues: { returnId, refund_amount: '', method: 'transfer', resolution: 'refund', note: '' },
  })

  async function onSubmit(values: RefundReturnInput) {
    const result = await refundReturnAction(values)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('환불이 처리되었습니다')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">환불</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>환불 처리</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="refund_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>환불 금액 (원)</FormLabel>
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
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>환불 방법</FormLabel>
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
              <FormField
                control={form.control}
                name="resolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>처리 방식</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESOLUTION_OPTIONS.map((o) => (
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
                {form.formState.isSubmitting ? '처리 중…' : '환불 처리'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export { RefundDialog }
