'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { ShieldBan, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import type { BlocklistEntry } from '@/types/db'

import { removeBlocklistEntry } from '../actions'

export interface BlocklistRow extends BlocklistEntry {
  creatorName: string | null
}

const KIND_LABEL: Record<BlocklistEntry['kind'], string> = {
  phone: '전화번호',
  address: '주소',
  ip: 'IP',
}

export function BlocklistTable({ entries }: { entries: BlocklistRow[] }) {
  const router = useRouter()

  async function handleRemove(id: string) {
    const result = await removeBlocklistEntry(id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('차단 목록에서 삭제했습니다')
    router.refresh()
  }

  const columns = React.useMemo<ColumnDef<BlocklistRow>[]>(
    () => [
      {
        accessorKey: 'kind',
        header: '구분',
        cell: ({ row }) => <Badge variant="outline">{KIND_LABEL[row.original.kind]}</Badge>,
      },
      { accessorKey: 'value', header: '값' },
      {
        accessorKey: 'reason',
        header: '사유',
        cell: ({ row }) => row.original.reason ?? <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'creatorName',
        header: '등록자',
        cell: ({ row }) => row.original.creatorName ?? <span className="text-muted-foreground">시스템</span>,
      },
      {
        accessorKey: 'created_at',
        header: '날짜',
        cell: ({ row }) => format(new Date(row.original.created_at), 'yyyy.MM.dd'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive size-7">
                  <Trash2 className="size-3.5" />
                </Button>
              }
              title="이 항목을 삭제할까요?"
              description="이제 이 값으로 주문해도 위험 주문으로 표시되지 않습니다."
              confirmLabel="삭제"
              destructive
              onConfirm={() => handleRemove(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={entries}
      emptyState={
        <EmptyState
          icon={ShieldBan}
          title="차단 목록이 비어 있습니다"
          description="차단한 전화번호, 주소, IP가 여기에 표시됩니다."
        />
      }
    />
  )
}
