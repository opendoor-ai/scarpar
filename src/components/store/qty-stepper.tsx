'use client'

import { Minus, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = 'default',
  className,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  size?: 'default' | 'sm'
  className?: string
}) {
  const height = size === 'sm' ? 'h-7' : 'h-8'

  function clamp(n: number): number {
    return Math.min(max, Math.max(min, n))
  }

  return (
    <div className={cn('inline-flex items-center rounded-md border border-input', height, className)}>
      <button
        type="button"
        aria-label="수량 줄이기"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="inline-flex h-full w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="수량"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '')
          if (digits === '') return
          onChange(clamp(Number(digits)))
        }}
        className="h-full w-9 border-x border-input bg-transparent text-center text-[13px] tabular-nums outline-none"
      />
      <button
        type="button"
        aria-label="수량 늘리기"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="inline-flex h-full w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}
