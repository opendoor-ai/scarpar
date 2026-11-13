'use client'

import { addMonths, format, parse, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'

interface MonthPickerProps {
  month: string // yyyy-MM
}

function MonthPicker({ month }: MonthPickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function pushMonth(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', next)
    router.push(`${pathname}?${params.toString()}`)
  }

  const current = parse(month, 'yyyy-MM', new Date())
  const label = format(current, 'yyyy년 M월')

  return (
    <div data-slot="month-picker" className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => pushMonth(format(subMonths(current, 1), 'yyyy-MM'))}
      >
        <ChevronLeft className="size-4" />
        <span className="sr-only">이전 달</span>
      </Button>
      <span className="min-w-32 text-center text-[13px] font-medium tabular-nums">{label}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => pushMonth(format(addMonths(current, 1), 'yyyy-MM'))}
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">다음 달</span>
      </Button>
    </div>
  )
}

export { MonthPicker }
