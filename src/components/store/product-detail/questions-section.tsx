// 상품 Q&A 목록 (서버 컴포넌트)
// 방문자에게는 product_questions 직접 읽기 권한이 없어서, 서버에서 service role로 읽은 뒤
// 비밀글 내용·작성자 연락처를 가려서 보여줍니다.

import { format } from 'date-fns'
import { Lock, MessageCircleQuestion } from 'lucide-react'

import { getAdminClient } from '@/lib/supabase/admin'
import type { ProductQuestion } from '@/types/db'

import { QuestionForm } from './question-form'

type PublicQuestion = Pick<
  ProductQuestion,
  'id' | 'author_name' | 'question' | 'is_private' | 'answer' | 'answered_at' | 'status' | 'created_at'
>

/** 홍길동 → 홍*동, 김철 → 김*  */
function maskName(name: string): string {
  const chars = [...name.trim()]
  if (chars.length <= 1) return '*'
  if (chars.length === 2) return `${chars[0]}*`
  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`
}

export async function getQuestionCount(productId: string): Promise<number> {
  const supabase = getAdminClient()
  const { count } = await supabase
    .from('product_questions')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .neq('status', 'hidden')
  return count ?? 0
}

export async function QuestionsSection({
  orgId,
  orgSlug,
  productId,
}: {
  orgId: string
  orgSlug: string
  productId: string
}) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('product_questions')
    .select('id, author_name, question, is_private, answer, answered_at, status, created_at')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .neq('status', 'hidden')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) console.error('[product page] questions read failed:', error.message)
  const questions = (data ?? []) as PublicQuestion[]

  return (
    <section className="flex flex-col gap-4" aria-labelledby="qa-title">
      <h2 id="qa-title" className="text-lg font-semibold">
        상품 Q&amp;A <span className="text-sm font-normal text-muted-foreground">({questions.length})</span>
      </h2>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          아직 등록된 질문이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {questions.map((q) => (
            <li key={q.id} className="flex flex-col gap-2 p-4 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={
                    q.status === 'answered'
                      ? 'rounded bg-primary px-1.5 py-0.5 font-medium text-primary-foreground'
                      : 'rounded bg-muted px-1.5 py-0.5 font-medium'
                  }
                >
                  {q.status === 'answered' ? '답변완료' : '답변대기'}
                </span>
                <span>{maskName(q.author_name)}</span>
                <span>{format(new Date(q.created_at), 'yyyy.MM.dd')}</span>
              </div>
              {q.is_private ? (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="size-3.5" />
                  비밀글입니다.
                </p>
              ) : (
                <>
                  <p className="flex gap-2 whitespace-pre-line">
                    <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" />
                    {q.question}
                  </p>
                  {q.answer ? (
                    <div className="ml-6 rounded-lg bg-muted/50 p-3 whitespace-pre-line">
                      <p className="mb-1 text-xs font-semibold text-primary">공급사 답변</p>
                      {q.answer}
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <QuestionForm orgSlug={orgSlug} productId={productId} />
    </section>
  )
}
