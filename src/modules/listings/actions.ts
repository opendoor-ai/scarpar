'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import { toPaisa } from '@/lib/money'
import { randomKey, slugify } from '@/lib/utils'
import type { ActionResult } from '@/lib/types'
import type { InquiryStatus } from '@/types/db'

import {
  listingFormSchema,
  newListingSchema,
  updateInquiryStatusSchema,
  type ListingFormValues,
  type NewListingValues,
} from './schemas'

type ServerClient = Awaited<ReturnType<typeof getServerClient>>

async function requireListingsCtx() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'listings')
  return ctx
}

/** Slugify the title, retrying with a short random suffix on collision (org-scoped unique). */
async function uniqueListingSlug(supabase: ServerClient, orgId: string, title: string): Promise<string> {
  const base = slugify(title) || 'listing'
  let candidate = base

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', candidate)
      .maybeSingle()

    if (!data) return candidate
    candidate = `${base}-${randomKey(4).toLowerCase()}`
  }

  return `${base}-${randomKey(6).toLowerCase()}`
}

/** '' -> null, otherwise parses a validated whole-number string (see optionalIntString in schemas.ts). */
function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export async function createListing(input: NewListingValues): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireListingsCtx()
  requireRole(ctx, 'staff')

  const parsed = newListingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const slug = await uniqueListingSlug(supabase, ctx.org.id, parsed.data.title)

  const { data, error } = await supabase
    .from('listings')
    .insert({
      org_id: ctx.org.id,
      title: parsed.data.title,
      slug,
      purpose: parsed.data.purpose,
      property_type: parsed.data.property_type,
      price: toPaisa(parsed.data.price),
      area_sqft: null,
      beds: null,
      baths: null,
      address: null,
      description: null,
      features: [],
      media_ids: [],
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? '매물을 등록하지 못했습니다' }
  }

  audit(ctx, 'listing.create', 'listing', data.id, undefined, { title: parsed.data.title, slug })
  revalidatePath('/admin/listings')

  return { ok: true, data: { id: data.id } }
}

export async function updateListing(listingId: string, input: ListingFormValues): Promise<ActionResult> {
  const ctx = await requireListingsCtx()
  requireRole(ctx, 'staff')

  const parsed = listingFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const { data: before } = await supabase
    .from('listings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', listingId)
    .maybeSingle()

  if (!before) return { ok: false, error: '매물을 찾을 수 없습니다' }

  const address = {
    line1: parsed.data.address.line1,
    district: parsed.data.address.district,
    ...(parsed.data.address.area ? { area: parsed.data.address.area } : {}),
  }

  const { error } = await supabase
    .from('listings')
    .update({
      title: parsed.data.title,
      purpose: parsed.data.purpose,
      property_type: parsed.data.property_type,
      price: toPaisa(parsed.data.price),
      area_sqft: parseOptionalInt(parsed.data.area_sqft),
      beds: parseOptionalInt(parsed.data.beds),
      baths: parseOptionalInt(parsed.data.baths),
      address,
      description: parsed.data.description || null,
      features: parsed.data.features,
      media_ids: parsed.data.media_ids,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', ctx.org.id)
    .eq('id', listingId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'listing.update', 'listing', listingId, before, parsed.data)
  revalidatePath(`/admin/listings/${listingId}`)
  revalidatePath('/admin/listings')

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Inquiries
// ---------------------------------------------------------------------------

export async function updateInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<ActionResult> {
  const ctx = await requireListingsCtx()
  requireRole(ctx, 'staff')

  const parsed = updateInquiryStatusSchema.safeParse({ status })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '상태값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('inquiries')
    .update({ status: parsed.data.status })
    .eq('org_id', ctx.org.id)
    .eq('id', inquiryId)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'inquiry.update_status', 'inquiry', inquiryId, undefined, { status: parsed.data.status })
  revalidatePath('/admin/listings')

  return { ok: true }
}
