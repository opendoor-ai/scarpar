'use server'

// 관리자(공급사 직원)용 Q&A 답변·숨김·삭제

import { revalidatePath } from 'next/cache'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

import { answerQuestionSchema, type AnswerQuestionInput } from './schemas'

export async function answerQuestionAction(input: AnswerQuestionInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')
  const parsed = answerQuestionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('product_questions')
    .select('id, answer, status')
    .eq('id', parsed.data.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle()
  if (!before) return { ok: false, error: '질문을 찾을 수 없습니다.' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('product_questions')
    .update({ answer: parsed.data.answer, answered_at: now, answered_by: ctx.user.id, status: 'answered', updated_at: now })
    .eq('id', parsed.data.id)
    .eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }

  audit(ctx, 'question.answered', 'product_question', parsed.data.id, before, { answer: parsed.data.answer })
  revalidatePath('/admin/questions')
  return { ok: true }
}

export async function setQuestionHiddenAction(id: string, hidden: boolean): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('product_questions')
    .select('id, status, answer')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .maybeSingle()
  if (!before) return { ok: false, error: '질문을 찾을 수 없습니다.' }

  const next = hidden ? 'hidden' : (before as { answer: string | null }).answer ? 'answered' : 'pending'
  const { error } = await supabase
    .from('product_questions')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }

  audit(ctx, hidden ? 'question.hidden' : 'question.shown', 'product_question', id, before, { status: next })
  revalidatePath('/admin/questions')
  return { ok: true }
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = await getServerClient()
  const { error } = await supabase.from('product_questions').delete().eq('id', id).eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }

  audit(ctx, 'question.deleted', 'product_question', id, undefined, undefined)
  revalidatePath('/admin/questions')
  return { ok: true }
}
