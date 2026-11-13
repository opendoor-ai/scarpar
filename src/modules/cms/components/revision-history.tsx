'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, History } from 'lucide-react'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { restoreRevisionAction } from '@/modules/cms/actions'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface RevisionRow {
  id: number
  created_at: string
  savedByName: string
}

interface RevisionHistoryProps {
  pageId: string
  revisions: RevisionRow[]
}

function RevisionHistory({ pageId, revisions }: RevisionHistoryProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  async function handleRestore(revisionId: number) {
    const result = await restoreRevisionAction({ pageId, revisionId })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('이전 버전을 임시저장본으로 불러왔습니다.')
    router.refresh()
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <History className="size-4 text-muted-foreground" />
          Revision history ({revisions.length})
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="flex flex-col divide-y border-t">
          {revisions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">아직 게시된 버전이 없습니다.</p>
          ) : (
            revisions.map((revision) => (
              <div key={revision.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="flex flex-col">
                  <span className="text-[13px]">{format(new Date(revision.created_at), 'yyyy.MM.dd HH:mm')}</span>
                  <span className="text-xs text-muted-foreground">by {revision.savedByName}</span>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="outline" size="sm">
복원
                    </Button>
                  }
                  title="이 버전으로 복원할까요?"
                  description="이 버전을 임시저장본으로 불러옵니다. 게시하기 전까지는 고객에게 보이지 않습니다."
                  confirmLabel="임시저장본으로 복원"
                  onConfirm={() => handleRestore(revision.id)}
                />
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export { RevisionHistory }
