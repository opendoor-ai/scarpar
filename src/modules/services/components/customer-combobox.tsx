'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { searchCustomers } from '../actions'
import type { CustomerSearchResult } from '../schemas'

interface CustomerComboboxProps {
  value: CustomerSearchResult | null
  onChange: (customer: CustomerSearchResult | null) => void
  placeholder?: string
}

function CustomerCombobox({ value, onChange, placeholder = '이름 또는 전화번호로 검색...' }: CustomerComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [searching, startSearch] = useTransition()

  function handleQueryChange(next: string) {
    setQuery(next)
    startSearch(async () => {
      const result = await searchCustomers(next)
      setResults(result.ok ? (result.data ?? []) : [])
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value ? `${value.name} · ${value.phone}` : placeholder}
          <ChevronsUpDown className="text-muted-foreground size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={handleQueryChange} placeholder={placeholder} />
          <CommandList>
            {searching ? <div className="text-muted-foreground p-3 text-[13px]">검색 중...</div> : null}
            <CommandEmpty>고객을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {results.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onChange(customer)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', value?.id === customer.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    <span className="text-muted-foreground text-xs">{customer.phone}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { CustomerCombobox }
