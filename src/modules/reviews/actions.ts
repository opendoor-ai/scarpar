'use server'

import { revalidatePath } from 'next/cache'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import type { ReviewStatus } from '@/types/db'

async function setReviewStatus(id: string, status: ReviewStatus): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { data: before, error: fetchError } = await supabase
    .from('reviews')
    .select('id, status')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .single()

  if (fetchError || !before) return { ok: false, error: '리뷰를 찾을 수 없습니다.' }

  const { error } = await supabase.from('reviews').update({ status }).eq('id', id).eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }

  audit(ctx, `review.${status}`, 'review', id, { status: before.status }, { status })
  revalidatePath('/admin/reviews')
  return { ok: true }
}

export async function publishReview(id: string): Promise<ActionResult> {
  return setReviewStatus(id, 'published')
}

export async function rejectReview(id: string): Promise<ActionResult> {
  return setReviewStatus(id, 'rejected')
}

export async function bulkPublishReviews(ids: string[]): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  if (ids.length === 0) return { ok: true, data: { count: 0 } }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'published' })
    .eq('org_id', ctx.org.id)
    .in('id', ids)
    .select('id')

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'review.bulk_publish', 'review', ids.join(','), null, { ids, status: 'published' })
  revalidatePath('/admin/reviews')
  return { ok: true, data: { count: data?.length ?? 0 } }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = await getServerClient()
  const { data: before } = await supabase.from('reviews').select('*').eq('id', id).eq('org_id', ctx.org.id).single()

  const { error } = await supabase.from('reviews').delete().eq('id', id).eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }

  audit(ctx, 'review.delete', 'review', id, before ?? null, null)
  revalidatePath('/admin/reviews')
  return { ok: true }
}
