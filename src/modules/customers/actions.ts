'use server'

import { revalidatePath } from 'next/cache'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

import {
  addressFormSchema,
  blocklistEntrySchema,
  customerEditSchema,
  customerFormSchema,
  type AddressFormInput,
  type BlocklistEntryInput,
  type CustomerEditInput,
  type CustomerFormInput,
} from './schemas'

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505'
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function createCustomer(input: CustomerFormInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const parsed = customerFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const { address, ...customer } = parsed.data

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({
      org_id: ctx.org.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return {
      ok: false,
      error: isUniqueViolation(error)
        ? '같은 전화번호의 고객이 이미 있습니다.'
        : (error?.message ?? '고객을 추가하지 못했습니다.'),
    }
  }

  // Address is optional on quick-add; only insert if the core required fields
  // (line1 + district) were filled in. recipient/phone fall back to the
  // customer's own name/phone since the dialog doesn't re-ask for them.
  if (address?.line1 && address?.district) {
    const { error: addressError } = await supabase.from('customer_addresses').insert({
      org_id: ctx.org.id,
      customer_id: data.id,
      label: address.label || null,
      recipient: address.recipient || customer.name,
      phone: address.phone || customer.phone,
      line1: address.line1,
      area: address.area || null,
      district: address.district,
      postcode: address.postcode || null,
      is_default: true,
    })
    if (addressError) console.error('[createCustomer] address insert failed', addressError)
  }

  audit(ctx, 'customer.create', 'customer', data.id, null, { name: customer.name, phone: customer.phone })
  revalidatePath('/admin/customers')
  return { ok: true, data: { id: data.id } }
}

export async function updateCustomer(customerId: string, input: CustomerEditInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const parsed = customerEditSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('customers')
    .select('name, phone, email')
    .eq('id', customerId)
    .eq('org_id', ctx.org.id)
    .single()

  const { error } = await supabase
    .from('customers')
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
    })
    .eq('id', customerId)
    .eq('org_id', ctx.org.id)

  if (error) {
    return {
      ok: false,
      error: isUniqueViolation(error) ? '같은 전화번호의 고객이 이미 있습니다.' : error.message,
    }
  }

  audit(ctx, 'customer.update', 'customer', customerId, before ?? null, parsed.data)
  revalidatePath(`/admin/customers/${customerId}`)
  revalidatePath('/admin/customers')
  return { ok: true }
}

/**
 * Toggles customers.is_blocked AND keeps the blocklist(kind='phone') entry in
 * sync: blocking upserts a matching entry, unblocking removes it. Checkout
 * (orders slice) reads the blocklist to auto-flag high-risk orders.
 */
export async function toggleCustomerBlock(customerId: string, block: boolean): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = await getServerClient()
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('id, phone, is_blocked')
    .eq('id', customerId)
    .eq('org_id', ctx.org.id)
    .single()

  if (fetchError || !customer) return { ok: false, error: '고객을 찾을 수 없습니다.' }

  const { error: updateError } = await supabase
    .from('customers')
    .update({ is_blocked: block })
    .eq('id', customerId)
    .eq('org_id', ctx.org.id)

  if (updateError) return { ok: false, error: updateError.message }

  if (block) {
    const { error: blockError } = await supabase.from('blocklist').upsert(
      {
        org_id: ctx.org.id,
        kind: 'phone',
        value: customer.phone,
        reason: '고객 상세 화면에서 차단',
        created_by: ctx.user.id,
      },
      { onConflict: 'org_id,kind,value' },
    )
    if (blockError) return { ok: false, error: blockError.message }
  } else {
    await supabase
      .from('blocklist')
      .delete()
      .eq('org_id', ctx.org.id)
      .eq('kind', 'phone')
      .eq('value', customer.phone)
  }

  audit(
    ctx,
    block ? 'customer.block' : 'customer.unblock',
    'customer',
    customerId,
    { is_blocked: customer.is_blocked },
    { is_blocked: block },
  )
  revalidatePath(`/admin/customers/${customerId}`)
  revalidatePath('/admin/customers')
  revalidatePath('/admin/blocklist')
  return { ok: true }
}

export async function updateCustomerNotes(customerId: string, notes: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const trimmed = notes.trim().slice(0, 5000)
  const supabase = await getServerClient()
  const { error } = await supabase
    .from('customers')
    .update({ notes: trimmed || null })
    .eq('id', customerId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'customer.notes.update', 'customer', customerId, null, { notes: trimmed })
  revalidatePath(`/admin/customers/${customerId}`)
  return { ok: true }
}

export async function updateCustomerTags(customerId: string, tags: string[]): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const cleaned = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0 && tag.length <= 30)),
  ).slice(0, 20)

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('customers')
    .update({ tags: cleaned })
    .eq('id', customerId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'customer.tags.update', 'customer', customerId, null, { tags: cleaned })
  revalidatePath(`/admin/customers/${customerId}`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Customer addresses
// ---------------------------------------------------------------------------

export async function addCustomerAddress(
  customerId: string,
  input: AddressFormInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const parsed = addressFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()

  if (parsed.data.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)
      .eq('org_id', ctx.org.id)
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      org_id: ctx.org.id,
      customer_id: customerId,
      label: parsed.data.label || null,
      recipient: parsed.data.recipient,
      phone: parsed.data.phone,
      line1: parsed.data.line1,
      area: parsed.data.area || null,
      district: parsed.data.district,
      postcode: parsed.data.postcode || null,
      is_default: parsed.data.is_default,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '주소를 추가하지 못했습니다.' }

  audit(ctx, 'customer.address.add', 'customer_address', data.id, null, parsed.data)
  revalidatePath(`/admin/customers/${customerId}`)
  return { ok: true, data: { id: data.id } }
}

export async function updateCustomerAddress(
  addressId: string,
  customerId: string,
  input: AddressFormInput,
): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const parsed = addressFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('org_id', ctx.org.id)
    .single()

  if (parsed.data.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)
      .eq('org_id', ctx.org.id)
  }

  const { error } = await supabase
    .from('customer_addresses')
    .update({
      label: parsed.data.label || null,
      recipient: parsed.data.recipient,
      phone: parsed.data.phone,
      line1: parsed.data.line1,
      area: parsed.data.area || null,
      district: parsed.data.district,
      postcode: parsed.data.postcode || null,
      is_default: parsed.data.is_default,
    })
    .eq('id', addressId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'customer.address.update', 'customer_address', addressId, before ?? null, parsed.data)
  revalidatePath(`/admin/customers/${customerId}`)
  return { ok: true }
}

export async function deleteCustomerAddress(addressId: string, customerId: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('org_id', ctx.org.id)
    .single()

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', addressId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'customer.address.delete', 'customer_address', addressId, before ?? null, null)
  revalidatePath(`/admin/customers/${customerId}`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Blocklist (part of the customers module — architecture.md §1 nests
// /admin/blocklist under the customers module nav)
// ---------------------------------------------------------------------------

export async function addBlocklistEntry(input: BlocklistEntryInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = blocklistEntrySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('blocklist')
    .upsert(
      {
        org_id: ctx.org.id,
        kind: parsed.data.kind,
        value: parsed.data.value,
        reason: parsed.data.reason || null,
        created_by: ctx.user.id,
      },
      { onConflict: 'org_id,kind,value' },
    )
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '항목을 추가하지 못했습니다.' }

  audit(ctx, 'blocklist.add', 'blocklist', data.id, null, parsed.data)
  revalidatePath('/admin/blocklist')
  return { ok: true, data: { id: data.id } }
}

export async function removeBlocklistEntry(entryId: string): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('blocklist')
    .select('*')
    .eq('id', entryId)
    .eq('org_id', ctx.org.id)
    .single()

  const { error } = await supabase.from('blocklist').delete().eq('id', entryId).eq('org_id', ctx.org.id)
  if (error) return { ok: false, error: error.message }

  audit(ctx, 'blocklist.remove', 'blocklist', entryId, before ?? null, null)
  revalidatePath('/admin/blocklist')
  return { ok: true }
}
