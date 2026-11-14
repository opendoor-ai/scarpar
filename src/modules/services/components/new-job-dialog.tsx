'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REGIONS } from '@/lib/regions'

import { createJob } from '../actions'
import { newJobSchema, type CustomerSearchResult, type NewJobValues } from '../schemas'
import { CustomerCombobox } from './customer-combobox'

const detailsSchema = newJobSchema.omit({ customer: true })
type DetailsValues = Omit<NewJobValues, 'customer'>

function NewJobDialog() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [customerError, setCustomerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      title: '',
      description: '',
      quote_amount: '0',
      scheduled_at: '',
      address_line1: '',
      address_district: '',
    },
  })

  function resetAll() {
    form.reset()
    setMode('existing')
    setSelectedCustomer(null)
    setNewName('')
    setNewPhone('')
    setCustomerError(null)
  }

  async function onSubmit(values: DetailsValues) {
    setCustomerError(null)

    const customer: NewJobValues['customer'] | null =
      mode === 'existing'
        ? selectedCustomer
          ? { mode: 'existing', customer_id: selectedCustomer.id }
          : null
        : newName.trim() && newPhone.trim()
          ? { mode: 'new', customer_name: newName.trim(), customer_phone: newPhone.trim() }
          : null

    if (!customer) {
      setCustomerError('고객을 선택하거나 입력하세요')
      return
    }

    const result = await createJob({ ...values, customer })
    if (result.ok && result.data) {
      toast.success('작업이 만들어졌습니다')
      setOpen(false)
      resetAll()
      router.push(`/admin/services/${result.data.id}`)
    } else if (!result.ok) {
      toast.error(result.error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetAll()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          새 작업
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 작업</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <FormLabel>고객</FormLabel>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'existing' ? 'default' : 'outline'}
                  onClick={() => setMode('existing')}
                >
                  기존 고객 검색
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'new' ? 'default' : 'outline'}
                  onClick={() => setMode('new')}
                >
                  새 고객
                </Button>
              </div>
              {mode === 'existing' ? (
                <CustomerCombobox value={selectedCustomer} onChange={setSelectedCustomer} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="이름" value={newName} onChange={(event) => setNewName(event.target.value)} />
                  <Input type="tel" placeholder="전화번호" value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
                </div>
              )}
              {customerError ? <p className="text-destructive text-xs">{customerError}</p> : null}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>작업명</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quote_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>견적 (원)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduled_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예정 일시</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지역</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="지역 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map((district) => (
                          <SelectItem key={district.name} value={district.name}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '만드는 중...' : '작업 만들기'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export { NewJobDialog }
