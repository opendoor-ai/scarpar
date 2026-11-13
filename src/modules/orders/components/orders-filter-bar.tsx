'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const STATUS_TABS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'confirmed', label: '확인됨' },
  { value: 'packed', label: '포장 완료' },
  { value: 'dispatched', label: '출고' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
  { value: 'returned', label: '반품' },
  { value: 'failed', label: '실패' },
] as const

interface OrdersFilterBarProps {
  status: string
  q: string
  from: string
  to: string
}

function OrdersFilterBar({ status, q, from, to }: OrdersFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <Tabs value={status || 'all'} onValueChange={(v) => setParam('status', v === 'all' ? '' : v)}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="주문번호 또는 전화번호" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="orders-from">시작일</Label>
          <Input
            id="orders-from"
            type="date"
            value={from}
            onChange={(e) => setParam('from', e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="orders-to">종료일</Label>
          <Input id="orders-to" type="date" value={to} onChange={(e) => setParam('to', e.target.value)} className="w-36" />
        </div>
      </div>
    </div>
  )
}

export { OrdersFilterBar }
