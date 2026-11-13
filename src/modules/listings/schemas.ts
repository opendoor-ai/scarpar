import { z } from 'zod'

import type { Inquiry, Listing } from '@/types/db'

// ---------------------------------------------------------------------------
// Form validation (RHF + zodResolver). Amounts are entered as taka strings
// and converted to paisa via toPaisa() inside the server action.
// ---------------------------------------------------------------------------

const moneyString = z
  .string()
  .trim()
  .min(1, 'Price is required')
  .refine((v) => Number.isFinite(Number(v.replace(/,/g, ''))) && Number(v.replace(/,/g, '')) >= 0, {
    message: '금액을 정확히 입력하세요',
  })

/** Empty string or a non-negative whole number — used for area_sqft/beds/baths text inputs. */
const optionalIntString = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+$/.test(v), { message: '정수를 입력하세요' })

/** Compact "New listing" dialog payload — mirrors new-course-dialog.tsx's minimal-fields pattern. */
export const newListingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  purpose: z.enum(['sale', 'rent']),
  property_type: z.enum(['apartment', 'house', 'land', 'commercial']),
  price: moneyString,
})
export type NewListingValues = z.infer<typeof newListingSchema>

/** Full detail/edit form payload. */
export const listingFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  purpose: z.enum(['sale', 'rent']),
  property_type: z.enum(['apartment', 'house', 'land', 'commercial']),
  price: moneyString,
  area_sqft: optionalIntString,
  beds: optionalIntString,
  baths: optionalIntString,
  address: z.object({
    line1: z.string().trim().min(1, 'Address is required').max(300),
    area: z.string().trim().max(200).optional().or(z.literal('')),
    district: z.string().trim().min(1, 'District is required'),
  }),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  features: z.array(z.string().trim().min(1)),
  media_ids: z.array(z.string().uuid()),
  status: z.enum(['draft', 'active', 'under_offer', 'sold', 'rented']),
})
export type ListingFormValues = z.infer<typeof listingFormSchema>

export const updateInquiryStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']),
})

// ---------------------------------------------------------------------------
// View row types — shapes produced by the server-component queries in
// page.tsx / [id]/page.tsx and consumed by components/*. Kept here (a plain
// module, unlike actions.ts which is 'use server') so both pages and client
// components import one source of truth.
// ---------------------------------------------------------------------------

/** listings.address jsonb shape (this module's own convention — not DB-enforced). */
export interface ListingAddress {
  line1: string
  area?: string
  district: string
}

export type ListingMedia = { id: string; path: string }

export interface ListingListRow extends Listing {
  cover: ListingMedia | null
}

export interface ListingDetailRow extends Listing {
  mediaItems: ListingMedia[]
}

export interface InquiryRow extends Inquiry {
  listing: Pick<Listing, 'title'> | null
}
