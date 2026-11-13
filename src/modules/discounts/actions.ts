'use server'

import { revalidatePath } from 'next/cache'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { toPaisa } from '@/lib/money'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

import { discountFormSchema, type DiscountFormInput } from './schemas'

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505'
}

function buildDiscountRow(orgId: string, input: DiscountFormInput) {
  const value =
    input.type === 'percent'
      ? Math.round(input.value ?? 0)
      : input.type === 'fixed'
        ? toPaisa(input.value ?? 0)
        : null

  return {
    org_id: orgId,
    code: input.code ? input.code.toUpperCase() : null,
    title: input.title,
    type: input.type,
    value,
    scope: input.scope,
    product_ids: input.scope === 'products' ? input.product_ids : null,
    category_ids: input.scope === 'categories' ? input.category_ids : null,
    min_order: toPaisa(input.min_order),
    max_uses: input.max_uses ?? null,
    starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
    expires_at: input.expires_at ? new Date(input.expires_at).toISOString() : null,
    is_active: input.is_active,
  }
}

export async function createDiscount(input: DiscountFormInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = discountFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const row = buildDiscountRow(ctx.org.id, parsed.data)
  const supabase = await getServerClient()
  const { data, error } = await supabase.from('discounts').insert(row).select('id').single()

  if (error || !data) {
    return {
      ok: false,
      error: isUniqueViolation(error)
        ? '이미 사용 중인 할인 코드입니다.'
        : (error?.message ?? '할인을 만들지 못했습니다.'),
    }
  }

  audit(ctx, 'discount.create', 'discount', data.id, null, row)
  revalidatePath('/admin/discounts')
  return { ok: true, data: { id: data.id } }
}

export async function updateDiscount(id: string, input: DiscountFormInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = discountFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('discounts')
    .select('*')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .single()

  const row = buildDiscountRow(ctx.org.id, parsed.data)
  const { error } = await supabase.from('discounts').update(row).eq('id', id).eq('org_id', ctx.org.id)

  if (error) {
    return {
      ok: false,
      error: isUniqueViolation(error) ? '이미 사용 중인 할인 코드입니다.' : error.message,
    }
  }

  audit(ctx, 'discount.update', 'discount', id, before ?? null, row)
  revalidatePath('/admin/discounts')
  revalidatePath(`/admin/discounts/${id}`)
  return { ok: true }
}

export async function toggleDiscountActive(id: string, isActive: boolean): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('discounts')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(
    ctx,
    isActive ? 'discount.activate' : 'discount.deactivate',
    'discount',
    id,
    { is_active: !isActive },
    { is_active: isActive },
  )
  revalidatePath('/admin/discounts')
  return { ok: true }
}

/** Product search for the discount form's "specific products" picker — ILIKE by name, capped at 20. */
export async function searchProducts(query: string): Promise<ActionResult<{ id: string; name: string }[]>> {
  const ctx = await requireOrg()
  const supabase = await getServerClient()

  let queryBuilder = supabase
    .from('products')
    .select('id, name')
    .eq('org_id', ctx.org.id)
    .order('name', { ascending: true })
    .limit(20)

  const trimmed = query.trim()
  if (trimmed) queryBuilder = queryBuilder.ilike('name', `%${trimmed}%`)

  const { data, error } = await queryBuilder
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data ?? []) as { id: string; name: string }[] }
}
