'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { BadgePercent } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Switch } from '@/components/ui/switch'
import { formatMoney } from '@/lib/money'
import type { Discount } from '@/types/db'

import { toggleDiscountActive } from '../actions'

const TYPE_LABEL: Record<Discount['type'], string> = {
  percent: '비율',
  fixed: '금액',
  free_shipping: '무료배송',
}

const SCOPE_LABEL: Record<Discount['scope'], string> = {
  all: '전체 상품',
  products: '특정 상품',
  categories: '특정 카테고리',
}

function valueLabel(discount: Discount): string {
  if (discount.type === 'percent') return `${discount.value ?? 0}%`
  if (discount.type === 'fixed') return formatMoney(discount.value ?? 0)
  return '—'
}

function windowLabel(discount: Discount): string {
  const parts: string[] = []
  if (discount.starts_at) parts.push(format(new Date(discount.starts_at), 'yyyy.MM.dd'))
  if (discount.expires_at) parts.push(format(new Date(discount.expires_at), 'yyyy.MM.dd'))
  return parts.length > 0 ? parts.join(' – ') : '종료일 없음'
}

function DiscountActiveSwitch({ id, isActive }: { id: string; isActive: boolean }) {
  const [checked, setChecked] = React.useState(isActive)
  const [pending, startTransition] = React.useTransition()

  function handleChange(next: boolean) {
    setChecked(next)
    startTransition(async () => {
      const result = await toggleDiscountActive(id, next)
      if (!result.ok) {
        setChecked(!next)
        toast.error(result.error)
      }
    })
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      aria-label={checked ? '사용 중' : '사용 안 함'}
    />
  )
}

export function DiscountsTable({ discounts }: { discounts: Discount[] }) {
  const router = useRouter()

  const columns = React.useMemo<ColumnDef<Discount>[]>(
    () => [
      {
        accessorKey: 'code',
        header: '코드',
        cell: ({ row }) =>
          row.original.code ? (
            <span className="font-mono text-xs">{row.original.code}</span>
          ) : (
            <Badge variant="outline">자동</Badge>
          ),
      },
      { accessorKey: 'title', header: '이름' },
      {
        accessorKey: 'type',
        header: '방식',
        cell: ({ row }) => TYPE_LABEL[row.original.type],
      },
      {
        id: 'value',
        header: '할인',
        cell: ({ row }) => <span className="tabular-nums">{valueLabel(row.original)}</span>,
      },
      {
        accessorKey: 'scope',
        header: '대상',
        cell: ({ row }) => SCOPE_LABEL[row.original.scope],
      },
      {
        id: 'usage',
        header: '사용 / 최대',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.used_count}
            {row.original.max_uses ? ` / ${row.original.max_uses}` : ''}
          </span>
        ),
      },
      {
        id: 'window',
        header: '기간',
        cell: ({ row }) => <span className="text-muted-foreground">{windowLabel(row.original)}</span>,
      },
      {
        id: 'is_active',
        header: '사용',
        cell: ({ row }) => <DiscountActiveSwitch id={row.original.id} isActive={row.original.is_active} />,
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={discounts}
      onRowClick={(row) => router.push(`/admin/discounts/${row.id}`)}
      emptyState={
        <EmptyState
          icon={BadgePercent}
          title="아직 할인이 없습니다"
          description="할인 코드나 자동 할인을 만들어 보세요."
        />
      }
    />
  )
}
