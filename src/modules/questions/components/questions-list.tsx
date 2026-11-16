'use client'

// 관리자 상품 Q&A 목록 — 상태별 보기, 답변 작성·수정, 숨김·삭제

import { productPath } from '@/components/store/store-links'
import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Eye, EyeOff, Lock, MessageSquareReply, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ProductQuestion, ProductQuestionStatus } from '@/types/db'

import { answerQuestionAction, deleteQuestionAction, setQuestionHiddenAction } from '../actions'

export interface QuestionRow extends ProductQuestion {
  product: { name: string; product_no: number } | null
}

const FILTERS: { value: ProductQuestionStatus | 'all'; label: string }[] = [
  { value: 'pending', label: '답변대기' },
  { value: 'answered', label: '답변완료' },
  { value: 'hidden', label: '숨김' },
  { value: 'all', label: '전체' },
]

const STATUS_BADGE: Record<ProductQuestionStatus, { label: string; variant: 'warning' | 'success' | 'secondary' }> = {
  pending: { label: '답변대기', variant: 'warning' },
  answered: { label: '답변완료', variant: 'success' },
  hidden: { label: '숨김', variant: 'secondary' },
}

export function QuestionsList({ questions, storeSlug }: { questions: QuestionRow[]; storeSlug: string }) {
  const [filter, setFilter] = useState<ProductQuestionStatus | 'all'>('pending')
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: questions.length, pending: 0, answered: 0, hidden: 0 }
    for (const q of questions) c[q.status] += 1
    return c
  }, [questions])
  const visible = filter === 'all' ? questions : questions.filter((q) => q.status === filter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-accent',
            )}
          >
            {f.label} {counts[f.value]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={MessageSquareReply} title="해당하는 질문이 없습니다" description="고객이 상품 상세페이지에서 남긴 질문이 여기에 표시됩니다." />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((q) => (
            <QuestionItem key={q.id} q={q} storeSlug={storeSlug} />
          ))}
        </ul>
      )}
    </div>
  )
}

function QuestionItem({ q, storeSlug }: { q: QuestionRow; storeSlug: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(q.status === 'pending')
  const [answer, setAnswer] = useState(q.answer ?? '')
  const badge = STATUS_BADGE[q.status]

  function saveAnswer() {
    startTransition(async () => {
      const result = await answerQuestionAction({ id: q.id, answer })
      if (!result.ok) return void toast.error(result.error)
      toast.success('답변이 등록되었습니다')
      setEditing(false)
      router.refresh()
    })
  }

  function toggleHidden() {
    startTransition(async () => {
      const result = await setQuestionHiddenAction(q.id, q.status !== 'hidden')
      if (!result.ok) return void toast.error(result.error)
      toast.success(q.status === 'hidden' ? '다시 공개했습니다' : '숨김 처리했습니다')
      router.refresh()
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {q.is_private ? (
          <span className="flex items-center gap-1">
            <Lock className="size-3" /> 비밀글
          </span>
        ) : null}
        {q.product ? (
          <Link
            href={`${productPath(storeSlug, q.product.product_no)}#product-qna`}
            target="_blank"
            className="font-medium text-foreground hover:underline"
          >
            P{q.product.product_no} · {q.product.name}
          </Link>
        ) : null}
        <span className="ml-auto">{format(new Date(q.created_at), 'yyyy.MM.dd HH:mm')}</span>
      </div>

      <div className="text-sm">
        <p className="mb-1 text-xs text-muted-foreground">
          {q.author_name}
          {q.author_contact ? ` · ${q.author_contact}` : ''}
        </p>
        <p className="whitespace-pre-line">{q.question}</p>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="답변을 입력하세요" />
          <div className="flex justify-end gap-2">
            {q.answer ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                취소
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={isPending || !answer.trim()} onClick={saveAnswer}>
              {isPending ? '저장 중…' : '답변 등록'}
            </Button>
          </div>
        </div>
      ) : q.answer ? (
        <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-line">
          <p className="mb-1 text-xs font-semibold text-primary">답변</p>
          {q.answer}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <MessageSquareReply className="size-4" />
            {q.answer ? '답변 수정' : '답변하기'}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={toggleHidden}>
          {q.status === 'hidden' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {q.status === 'hidden' ? '다시 공개' : '숨기기'}
        </Button>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="size-4" />
              삭제
            </Button>
          }
          title="이 질문을 삭제할까요?"
          description="질문과 답변이 완전히 삭제되며 되돌릴 수 없습니다. 보이지 않게만 하려면 '숨기기'를 쓰세요."
          confirmLabel="삭제"
          destructive
          onConfirm={async () => {
            const result = await deleteQuestionAction(q.id)
            if (!result.ok) return void toast.error(result.error)
            toast.success('질문이 삭제되었습니다')
            router.refresh()
          }}
        />
      </div>
    </li>
  )
}
