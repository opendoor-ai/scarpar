'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { formatMoney } from '@/lib/money'
import type { Customer } from '@/types/db'

interface CustomersTableProps {
  customers: Customer[]
}

export function CustomersTable({ customers }: CustomersTableProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
  }, [customers, search])

  const columns = React.useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '이름',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_blocked ? <Badge variant="destructive">차단됨</Badge> : null}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: '전화번호',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="tabular-nums">{row.original.phone}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <CopyButton text={row.original.phone} />
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'orders_count',
        header: '주문 수',
        cell: ({ row }) => <span className="tabular-nums">{row.original.orders_count}</span>,
      },
      {
        accessorKey: 'total_spent',
        header: '총 구매액',
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.total_spent)}</span>,
      },
      {
        accessorKey: 'last_order_at',
        header: '최근 주문',
        cell: ({ row }) =>
          row.original.last_order_at ? format(new Date(row.original.last_order_at), 'yyyy.MM.dd') : '—',
      },
      {
        id: 'tags',
        header: '태그',
        cell: ({ row }) => {
          const tags = row.original.tags ?? []
          if (tags.length === 0) return null
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 ? (
                <span className="text-muted-foreground text-xs">+{tags.length - 3}</span>
              ) : null}
            </div>
          )
        },
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="이름 또는 전화번호로 검색..."
        className="max-w-sm"
      />
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => router.push(`/admin/customers/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title="아직 고객이 없습니다"
            description="고객을 추가하면 여기에 표시됩니다."
          />
        }
      />
    </div>
  )
}
