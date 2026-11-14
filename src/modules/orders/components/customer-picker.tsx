'use client'

import * as React from 'react'
import { Check, Search, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchCustomersAction, type CustomerSearchResult } from '@/modules/orders/actions'

export interface CustomerPickerValue {
  mode: 'existing' | 'new'
  id?: string
  name: string
  phone: string
  email: string
}

const EMPTY_VALUE: CustomerPickerValue = { mode: 'new', name: '', phone: '', email: '' }

interface CustomerPickerProps {
  value: CustomerPickerValue
  onChange: (value: CustomerPickerValue) => void
}

function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<CustomerSearchResult[]>([])
  const [open, setOpen] = React.useState(false)
  const [searching, setSearching] = React.useState(false)

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const handle = setTimeout(async () => {
      const result = await searchCustomersAction(query)
      if (result.ok) setResults(result.data ?? [])
      setSearching(false)
      setOpen(true)
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  function selectCustomer(customer: CustomerSearchResult) {
    onChange({ mode: 'existing', id: customer.id, name: customer.name, phone: customer.phone, email: customer.email ?? '' })
    setQuery('')
    setOpen(false)
  }

  function switchToNew() {
    onChange(EMPTY_VALUE)
    setQuery('')
    setOpen(false)
  }

  function switchToSearch() {
    onChange(EMPTY_VALUE)
  }

  if (value.mode === 'existing') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <Check className="text-primary size-4" />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">{value.name}</span>
            <span className="text-muted-foreground text-xs tabular-nums">{value.phone}</span>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={switchToSearch}>
변경
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="이름 또는 전화번호로 고객 검색"
          className="pl-8"
        />
        {open && query ? (
          <div className="bg-popover text-popover-foreground absolute z-10 mt-1 w-full rounded-md border shadow-xs">
            {searching ? (
              <div className="text-muted-foreground p-3 text-[13px]">검색 중…</div>
            ) : results.length === 0 ? (
              <div className="text-muted-foreground p-3 text-[13px]">일치하는 고객이 없습니다</div>
            ) : (
              <ul className="max-h-64 overflow-y-auto p-1">
                {results.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="hover:bg-accent flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-[13px]"
                    >
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {customer.phone} · {customer.orders_count} order{customer.orders_count === 1 ? '' : 's'}
                        {customer.is_blocked ? ' · 차단됨' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={switchToNew}
        className="text-primary inline-flex w-fit items-center gap-1.5 text-[13px] font-medium hover:underline"
      >
        <UserPlus className="size-4" />
새 고객
      </button>

      {value.mode === 'new' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-name">이름</Label>
            <Input
              id="customer-name"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              placeholder="고객 이름"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-phone">전화번호</Label>
            <Input
              type="tel"
              id="customer-phone"
              value={value.phone}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="010-0000-0000"
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="customer-email">이메일 (선택)</Label>
            <Input
              id="customer-email"
              type="email"
              value={value.email}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { CustomerPicker, EMPTY_VALUE as EMPTY_CUSTOMER_VALUE }
