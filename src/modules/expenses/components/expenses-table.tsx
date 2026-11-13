'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { mediaUrl } from '@/lib/media-url'
import { formatMoney } from '@/lib/money'
import { deleteExpenseAction } from '@/modules/expenses/actions'

import { ExpenseFormDialog, type ExpenseWithReceipt } from './expense-form-dialog'

interface ExpensesTableProps {
  expenses: ExpenseWithReceipt[]
}

function ExpensesTable({ expenses }: ExpensesTableProps) {
  const router = useRouter()

  async function handleDelete(id: string) {
    const result = await deleteExpenseAction({ id })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('지출이 삭제되었습니다')
    router.refresh()
  }

  const columns: ColumnDef<ExpenseWithReceipt, unknown>[] = [
    {
      accessorKey: 'spent_at',
      header: '날짜',
      cell: ({ row }) => format(parseISO(row.original.spent_at), 'yyyy.MM.dd'),
    },
    {
      accessorKey: 'category',
      header: '분류',
      cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">금액</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatMoney(row.original.amount)}</div>,
    },
    {
      accessorKey: 'note',
      header: '메모',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.note || '—'}</span>,
    },
    {
      id: 'receipt',
      header: '영수증',
      cell: ({ row }) => {
        const path = row.original.receiptPath
        if (!path) return <span className="text-muted-foreground">—</span>
        const src = mediaUrl(path)
        return (
          <a href={src} target="_blank" rel="noreferrer" className="block w-fit">
            {/* Plain img: receipt host isn't guaranteed to match next/image's remotePatterns. */}
            <img src={src} alt="영수증" className="size-8 rounded-md border object-cover" />
          </a>
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">관리</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <ExpenseFormDialog
            expense={row.original}
            trigger={
              <Button type="button" variant="ghost" size="icon" className="size-7">
                <Pencil className="size-3.5" />
                <span className="sr-only">수정</span>
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="icon" className="size-7">
                <Trash2 className="size-3.5" />
                <span className="sr-only">삭제</span>
              </Button>
            }
            title="이 지출을 삭제할까요?"
            description="되돌릴 수 없습니다."
            confirmLabel="삭제"
            destructive
            onConfirm={() => handleDelete(row.original.id)}
          />
        </div>
      ),
    },
  ]

  return (
    <DataTable columns={columns} data={expenses} emptyState={<span className="text-muted-foreground">아직 지출이 없습니다.</span>} />
  )
}

export { ExpensesTable }
