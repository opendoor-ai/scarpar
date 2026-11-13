'use client'

import { format, startOfMonth, subDays } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  from: string
  to: string
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function DateRangePicker({ from, to }: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function pushRange(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', nextFrom)
    params.set('to', nextTo)
    router.push(`${pathname}?${params.toString()}`)
  }

  const today = new Date()
  const chips: { label: string; from: string; to: string }[] = [
    { label: '7일', from: toDateStr(subDays(today, 6)), to: toDateStr(today) },
    { label: '30일', from: toDateStr(subDays(today, 29)), to: toDateStr(today) },
    { label: '90일', from: toDateStr(subDays(today, 89)), to: toDateStr(today) },
    { label: '이번 달', from: toDateStr(startOfMonth(today)), to: toDateStr(today) },
  ]

  return (
    <div data-slot="date-range-picker" className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={from}
        max={to}
        onChange={(e) => pushRange(e.target.value, to)}
        className="w-auto"
        aria-label="시작일"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        type="date"
        value={to}
        min={from}
        onChange={(e) => pushRange(from, e.target.value)}
        className="w-auto"
        aria-label="종료일"
      />
      <div className="ml-1 flex items-center gap-1">
        {chips.map((chip) => {
          const active = chip.from === from && chip.to === to
          return (
            <Button
              key={chip.label}
              type="button"
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => pushRange(chip.from, chip.to)}
              className={cn(!active && 'text-muted-foreground')}
            >
              {chip.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export { DateRangePicker }
