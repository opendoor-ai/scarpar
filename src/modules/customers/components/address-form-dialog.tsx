'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REGIONS } from '@/lib/regions'
import type { CustomerAddress } from '@/types/db'

import { addCustomerAddress, updateCustomerAddress } from '../actions'
import { addressFormSchema, type AddressFormInput } from '../schemas'

const DISTRICT_OPTIONS = REGIONS.map((d) => d.name).sort((a, b) => a.localeCompare(b))

const EMPTY_VALUES: AddressFormInput = {
  label: '',
  recipient: '',
  phone: '',
  line1: '',
  area: '',
  district: '',
  postcode: '',
  is_default: false,
}

function valuesFromAddress(address?: CustomerAddress): AddressFormInput {
  if (!address) return EMPTY_VALUES
  return {
    label: address.label ?? '',
    recipient: address.recipient,
    phone: address.phone,
    line1: address.line1,
    area: address.area ?? '',
    district: address.district,
    postcode: address.postcode ?? '',
    is_default: address.is_default,
  }
}

interface AddressFormDialogProps {
  customerId: string
  address?: CustomerAddress
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AddressFormDialog({
  customerId,
  address,
  open,
  onOpenChange,
  onSaved,
}: AddressFormDialogProps) {
  const isEdit = Boolean(address)

  const form = useForm<AddressFormInput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: valuesFromAddress(address),
  })

  React.useEffect(() => {
    if (open) form.reset(valuesFromAddress(address))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address])

  async function onSubmit(values: AddressFormInput) {
    const result =
      isEdit && address
        ? await updateCustomerAddress(address.id, customerId, values)
        : await addCustomerAddress(customerId, values)

    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(isEdit ? '주소가 수정되었습니다' : '주소가 추가되었습니다')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '주소 수정' : '주소 추가'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="본사, 공장..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>받는 분</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전화번호</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지역</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="지역 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DISTRICT_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
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
                name="line1"
                render={({ field }) => (
                  <FormItem className="col-span-2">
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
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>동/읍/면</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>우편번호</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">기본 주소</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '저장 중...' : isEdit ? '변경사항 저장' : '주소 추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
