'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { CopyButton } from '@/components/ui/copy-button'
import { DataTable } from '@/components/ui/data-table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InquiryStatus } from '@/types/db'

import { updateInquiryStatus } from '../actions'
import type { InquiryRow } from '../schemas'

interface InquiriesTableProps {
  inquiries: InquiryRow[]
}

function InquiriesTable({ inquiries }: InquiriesTableProps) {
  async function handleStatusChange(inquiryId: string, status: InquiryStatus) {
    const result = await updateInquiryStatus(inquiryId, status)
    if (result.ok) toast.success('문의 상태가 변경되었습니다')
    else toast.error(result.error)
  }

  const columns = useMemo<ColumnDef<InquiryRow>[]>(
    () => [
      {
        id: 'listing',
        header: '매물',
        cell: ({ row }) => (
          <span className="text-foreground font-medium">{row.original.listing?.title ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: '이름',
      },
      {
        id: 'phone',
        header: '전화번호',
        cell: ({ row }) =>
          row.original.phone ? (
            <div className="flex items-center gap-1">
              <span>{row.original.phone}</span>
              <CopyButton text={row.original.phone} />
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'message',
        header: '문의 내용',
        cell: ({ row }) => {
          const message = row.original.message
          if (!message) return <span className="text-muted-foreground">—</span>
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="block max-w-[240px] truncate text-left hover:underline">
                  {message}
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-[13px] whitespace-pre-wrap">{message}</PopoverContent>
            </Popover>
          )
        },
      },
      {
        id: 'status',
        header: '상태',
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onValueChange={(value) => handleStatusChange(row.original.id, value as InquiryStatus)}
          >
            <SelectTrigger size="sm" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">새 문의</SelectItem>
              <SelectItem value="contacted">연락함</SelectItem>
              <SelectItem value="closed">종료</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        id: 'created_at',
        header: '날짜',
        cell: ({ row }) => format(new Date(row.original.created_at), 'yyyy.MM.dd'),
      },
    ],
    [],
  )

  return <DataTable columns={columns} data={inquiries} searchKey="name" searchPlaceholder="Search inquiries..." />
}

export { InquiriesTable }
