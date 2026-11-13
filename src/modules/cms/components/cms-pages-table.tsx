'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'

import type { CmsPage } from '@/types/db'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'

export type CmsPageRow = Pick<CmsPage, 'id' | 'title' | 'slug' | 'type' | 'status' | 'draft_blocks' | 'updated_at'>

interface CmsPagesTableProps {
  data: CmsPageRow[]
}

const TYPE_LABELS: Record<CmsPage['type'], string> = {
  page: '일반 페이지',
  home: '메인(홈)',
  policy: '약관/정책',
}

function CmsPagesTable({ data }: CmsPagesTableProps) {
  const columns = React.useMemo<ColumnDef<CmsPageRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: '제목',
        cell: ({ row }) => (
          <Link href={`/admin/cms/pages/${row.original.id}`} className="font-medium hover:underline">
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'slug',
        header: '주소(영문)',
        cell: ({ row }) => <span className="text-muted-foreground">/{row.original.slug}</span>,
      },
      {
        accessorKey: 'type',
        header: '종류',
        cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type]}</Badge>,
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Badge variant={row.original.status === 'published' ? 'success' : 'secondary'}>
              {row.original.status === 'published' ? '게시됨' : '임시저장'}
            </Badge>
            {row.original.draft_blocks !== null ? (
              <span className="size-1.5 rounded-full bg-amber-500" title="게시하지 않은 변경사항 있음" />
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: '수정일',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{format(new Date(row.original.updated_at), 'MM.dd HH:mm')}</span>
        ),
      },
    ],
    [],
  )

  return <DataTable columns={columns} data={data} searchKey="title" searchPlaceholder="Search pages..." />
}

export { CmsPagesTable }
