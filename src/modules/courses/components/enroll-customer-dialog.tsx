'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

import { enrollCustomer, searchCustomers } from '../actions'
import type { CustomerSearchResult } from '../schemas'

interface EnrollCustomerDialogProps {
  courseId: string
}

function EnrollCustomerDialog({ courseId }: EnrollCustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null)
  const [searching, startSearch] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setQuery('')
    setResults([])
    setSelected(null)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    startSearch(async () => {
      const result = await searchCustomers(value)
      setResults(result.ok ? (result.data ?? []) : [])
    })
  }

  async function handleEnroll() {
    if (!selected) return
    setSubmitting(true)
    const result = await enrollCustomer(courseId, selected.id)
    setSubmitting(false)

    if (result.ok) {
      toast.success('수강 등록되었습니다')
      setOpen(false)
      reset()
    } else {
      toast.error(result.error)
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
        <Button size="sm">
          <UserPlus />
          수강생 등록
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수강생 등록</DialogTitle>
        </DialogHeader>

        <Command shouldFilter={false} className="rounded-md border">
          <CommandInput value={query} onValueChange={handleQueryChange} placeholder="이름 또는 전화번호로 검색..." />
          <CommandList>
            {searching ? <div className="text-muted-foreground p-3 text-[13px]">검색 중...</div> : null}
            <CommandEmpty>고객을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {results.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => setSelected(customer)}
                  data-selected={selected?.id === customer.id}
                  className="data-[selected=true]:bg-accent"
                >
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    <span className="text-muted-foreground text-xs">{customer.phone}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        <DialogFooter>
          <Button onClick={handleEnroll} disabled={!selected || submitting}>
            {submitting ? '등록 중...' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { EnrollCustomerDialog }
