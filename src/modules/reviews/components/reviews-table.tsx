'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Review, ReviewStatus } from '@/types/db'

import { bulkPublishReviews, deleteReview, publishReview, rejectReview } from '../actions'
import { RatingStars } from './rating-stars'

export interface ReviewRow extends Review {
  product: { name: string } | null
}

const TABS: { value: ReviewStatus; label: string }[] = [
  { value: 'pending', label: '승인 대기' },
  { value: 'published', label: '게시됨' },
  { value: 'rejected', label: '거절됨' },
]

export function ReviewsTable({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter()
  const [tab, setTab] = React.useState<ReviewStatus>('pending')

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus)}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
            <Badge variant="secondary" className="ml-1">
              {reviews.filter((r) => r.status === t.value).length}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="pt-4">
          <ReviewsPanel
            status={t.value}
            reviews={reviews.filter((r) => r.status === t.value)}
            onChanged={() => router.refresh()}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ReviewsPanel({
  status,
  reviews,
  onChanged,
}: {
  status: ReviewStatus
  reviews: ReviewRow[]
  onChanged: () => void
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    setSelected(new Set())
  }, [reviews])

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === reviews.length ? new Set() : new Set(reviews.map((r) => r.id))))
  }

  async function handlePublish(id: string) {
    const result = await publishReview(id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success('리뷰가 게시되었습니다')
      onChanged()
    }
  }

  async function handleReject(id: string) {
    const result = await rejectReview(id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success('리뷰가 거절되었습니다')
      onChanged()
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteReview(id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success('리뷰가 삭제되었습니다')
      onChanged()
    }
  }

  function handleBulkPublish() {
    const ids = Array.from(selected)
    startTransition(async () => {
      const result = await bulkPublishReviews(ids)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`리뷰 ${result.data?.count ?? ids.length}건을 게시했습니다`)
      setSelected(new Set())
      onChanged()
    })
  }

  const columns = React.useMemo<ColumnDef<ReviewRow>[]>(() => {
    const cols: ColumnDef<ReviewRow>[] = []

    if (status === 'pending') {
      cols.push({
        id: 'select',
        header: () => (
          <Checkbox
            checked={reviews.length > 0 && selected.size === reviews.length}
            onCheckedChange={toggleAll}
            aria-label="전체 선택"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={() => toggleOne(row.original.id)}
            aria-label="선택"
          />
        ),
      })
    }

    cols.push(
      {
        id: 'product',
        accessorFn: (row) => row.product?.name ?? '',
        header: '상품',
        cell: ({ row }) => row.original.product?.name ?? '—',
      },
      {
        accessorKey: 'customer_name',
        header: '고객',
      },
      {
        accessorKey: 'rating',
        header: '별점',
        cell: ({ row }) => <RatingStars rating={row.original.rating} />,
      },
      {
        id: 'content',
        header: '리뷰',
        cell: ({ row }) => {
          const { title, body } = row.original
          const text = [title, body].filter(Boolean).join(' — ')
          if (!text) return <span className="text-muted-foreground">—</span>
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="max-w-64 truncate text-left hover:underline">
                  {text}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                {title ? <p className="mb-1 text-sm font-medium">{title}</p> : null}
                {body ? <p className="text-muted-foreground text-sm whitespace-pre-wrap">{body}</p> : null}
              </PopoverContent>
            </Popover>
          )
        },
      },
      {
        accessorKey: 'is_verified',
        header: '구매 인증',
        cell: ({ row }) => (row.original.is_verified ? <Badge variant="secondary">구매 인증</Badge> : null),
      },
      {
        accessorKey: 'created_at',
        header: '날짜',
        cell: ({ row }) => format(new Date(row.original.created_at), 'yyyy.MM.dd'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const review = row.original
          return (
            <div className="flex items-center justify-end gap-1">
              {review.status !== 'published' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => handlePublish(review.id)}>
                      <Check className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>게시</TooltipContent>
                </Tooltip>
              ) : null}
              {review.status !== 'rejected' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => handleReject(review.id)}>
                      <X className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>거절</TooltipContent>
                </Tooltip>
              ) : null}
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive size-7">
                    <Trash2 className="size-3.5" />
                  </Button>
                }
                title="이 리뷰를 삭제할까요?"
                description="리뷰가 완전히 삭제되며 되돌릴 수 없습니다."
                confirmLabel="삭제"
                destructive
                onConfirm={() => handleDelete(review.id)}
              />
            </div>
          )
        },
      },
    )

    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selected, reviews])

  return (
    <DataTable
      columns={columns}
      data={reviews}
      toolbar={
        status === 'pending' && selected.size > 0 ? (
          <Button size="sm" onClick={handleBulkPublish} disabled={pending}>
            Publish {selected.size} selected
          </Button>
        ) : undefined
      }
      emptyState={<EmptyState icon={Star} title="해당하는 리뷰가 없습니다" description="리뷰가 여기에 표시됩니다." />}
    />
  )
}
