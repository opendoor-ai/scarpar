// 구매문의 배지 — 제품상태(무관·신품·중고), 진행상태

import { cn } from '@/lib/utils'

import { CONDITION_LABEL, STATUS_LABEL, type RequestCondition, type RequestStatus } from '../schemas'

const CONDITION_CLASS: Record<RequestCondition, string> = {
  any: 'border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/40',
  new: 'border-indigo-600 bg-indigo-600 text-white',
  used: 'border-red-600 bg-red-600 text-white',
}

/** 무관이면 "신품·중고" 두 개를 함께 보여줘요 (둘 다 받음) */
export function ConditionBadges({ condition, className }: { condition: RequestCondition; className?: string }) {
  const keys: RequestCondition[] = condition === 'any' ? ['new', 'used'] : [condition]
  return (
    <span className={cn('inline-flex shrink-0 gap-1', className)}>
      {keys.map((k) => (
        <span
          key={k}
          className={cn('rounded-[3px] border px-1.5 py-px text-[11px] leading-4 font-bold', CONDITION_CLASS[k])}
        >
          {CONDITION_LABEL[k]}
        </span>
      ))}
    </span>
  )
}

const STATUS_CLASS: Record<RequestStatus, string> = {
  open: 'text-emerald-600',
  in_progress: 'text-primary',
  done: 'text-muted-foreground',
  hidden: 'text-muted-foreground line-through',
}

export function StatusText({ status, className }: { status: RequestStatus; className?: string }) {
  return <span className={cn('text-xs font-semibold', STATUS_CLASS[status], className)}>{STATUS_LABEL[status]}</span>
}
