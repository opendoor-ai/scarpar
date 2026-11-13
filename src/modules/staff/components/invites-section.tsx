'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { MailPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'

import type { Role } from '@/types/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CopyButton } from '@/components/ui/copy-button'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { revokeInviteAction } from '@/modules/staff/actions'
import { ROLE_LABELS } from './members-table'

export interface InviteRow {
  id: string
  email: string
  role: Role
  expiresAt: string
  link: string
}

function InvitesSection({ invites }: { invites: InviteRow[] }) {
  const router = useRouter()

  async function handleRevoke(id: string) {
    const result = await revokeInviteAction({ inviteId: id })
    if (result.ok) {
      toast.success('초대가 취소되었습니다')
      router.refresh()
    } else {
      toast.error(result.error)
      throw new Error(result.error)
    }
  }

  const columns: ColumnDef<InviteRow>[] = [
    {
      accessorKey: 'email',
      header: '이메일',
      cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
    },
    {
      accessorKey: 'role',
      header: '권한',
      cell: ({ row }) => <Badge variant="secondary">{ROLE_LABELS[row.original.role]}</Badge>,
    },
    {
      id: 'expiresAt',
      header: '만료일',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.expiresAt), 'yyyy.MM.dd')}
        </span>
      ),
    },
    {
      id: 'link',
      header: '초대 링크',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="max-w-56 truncate text-xs text-muted-foreground">
            {row.original.link}
          </span>
          <CopyButton text={row.original.link} />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm">
취소하기
              </Button>
            }
            title="이 초대를 취소할까요?"
            description={`${row.original.email} 님은 더 이상 이 초대를 수락할 수 없습니다.`}
            confirmLabel="초대 취소"
            destructive
            onConfirm={() => handleRevoke(row.original.id)}
          />
        </div>
      ),
    },
  ]

  if (invites.length === 0) {
    return (
      <EmptyState
        icon={MailPlus}
        title="대기 중인 초대가 없습니다"
        description="초대한 직원은 수락하거나 만료될 때까지 여기에 표시됩니다."
      />
    )
  }

  return <DataTable columns={columns} data={invites} />
}

export { InvitesSection }
