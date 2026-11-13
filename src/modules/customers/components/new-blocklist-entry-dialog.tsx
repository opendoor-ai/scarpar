'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
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

import { addBlocklistEntry } from '../actions'
import { blocklistEntrySchema, type BlocklistEntryInput } from '../schemas'

const DEFAULT_VALUES: BlocklistEntryInput = { kind: 'phone', value: '', reason: '' }

export function NewBlocklistEntryDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const form = useForm<BlocklistEntryInput>({
    resolver: zodResolver(blocklistEntrySchema),
    defaultValues: DEFAULT_VALUES,
  })

  async function onSubmit(values: BlocklistEntryInput) {
    const result = await addBlocklistEntry(values)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('차단 목록에 추가했습니다')
    setOpen(false)
    form.reset(DEFAULT_VALUES)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset(DEFAULT_VALUES)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> 항목 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>차단 항목 추가</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                      <SelectItem value="phone">전화번호</SelectItem>
                      <SelectItem value="address">주소</SelectItem>
                      <SelectItem value="ip">IP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>값</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사유 (선택)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '추가 중...' : '항목 추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
