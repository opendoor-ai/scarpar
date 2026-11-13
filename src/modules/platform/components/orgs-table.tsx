'use client'

import { format } from 'date-fns'
import { Building2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { OrgActiveSwitch } from './org-active-switch'

export interface PlatformOrgRow {
  id: string
  name: string
  slug: string
  vertical: string
  plan: string
  membersCount: number
  ordersCount: number
  createdAt: string
  isActive: boolean
}

function OrgsTable({ orgs }: { orgs: PlatformOrgRow[] }) {
  if (orgs.length === 0) {
    return <EmptyState icon={Building2} title="아직 조직(공급사)이 없습니다" />
  }

  const columns: ColumnDef<PlatformOrgRow>[] = [
    {
      accessorKey: 'name',
      header: '조직(공급사)',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'vertical',
      header: '사업 유형',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.vertical}
        </Badge>
      ),
    },
    {
      accessorKey: 'plan',
      header: '요금제',
      cell: ({ row }) => <span className="capitalize">{row.original.plan}</span>,
    },
    {
      accessorKey: 'membersCount',
      header: '직원 수',
      cell: ({ row }) => <span className="tabular-nums">{row.original.membersCount}</span>,
    },
    {
      accessorKey: 'ordersCount',
      header: '주문 수',
      cell: ({ row }) => <span className="tabular-nums">{row.original.ordersCount}</span>,
    },
    {
      id: 'createdAt',
      header: '생성일',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.createdAt), 'yyyy.MM.dd')}
        </span>
      ),
    },
    {
      id: 'isActive',
      header: '활성',
      cell: ({ row }) => (
        <OrgActiveSwitch orgId={row.original.id} isActive={row.original.isActive} />
      ),
    },
  ]

  return (
    <DataTable columns={columns} data={orgs} searchKey="name" searchPlaceholder="조직 검색..." />
  )
}

export { OrgsTable }
