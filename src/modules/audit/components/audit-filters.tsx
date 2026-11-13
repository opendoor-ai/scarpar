'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AuditFiltersProps {
  entityOptions: string[]
}

function AuditFilters({ entityOptions }: AuditFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [entity, setEntity] = React.useState(searchParams.get('entity') ?? 'all')
  const [action, setAction] = React.useState(searchParams.get('action') ?? '')
  const [from, setFrom] = React.useState(searchParams.get('from') ?? '')
  const [to, setTo] = React.useState(searchParams.get('to') ?? '')

  function apply() {
    const params = new URLSearchParams()
    if (entity !== 'all') params.set('entity', entity)
    if (action) params.set('action', action)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
  }

  function reset() {
    setEntity('all')
    setAction('')
    setFrom('')
    setTo('')
    router.push(pathname)
  }

  const hasFilters = Boolean(
    searchParams.get('entity') || searchParams.get('action') || searchParams.get('from') || searchParams.get('to'),
  )

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">대상</label>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {entityOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">작업</label>
        <Input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="예: settings.updated"
          className="w-48"
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">시작일</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">종료일</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
      </div>

      <Button size="sm" onClick={apply}>
적용
      </Button>
      {hasFilters ? (
        <Button size="sm" variant="ghost" onClick={reset}>
초기화
        </Button>
      ) : null}
    </div>
  )
}

export { AuditFilters }
