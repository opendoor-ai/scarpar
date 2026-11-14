import { z } from 'zod'

// CMS zod schemas (docs/conventions.md — Server actions: "Validate with zod schema
// from src/modules/<key>/schemas.ts"). Block schemas mirror src/types/db/cms.ts's
// CmsBlock union exactly (architecture.md §4) — keep both in sync.

export const cmsPageTypeSchema = z.enum(['page', 'home', 'policy'])

export const createPageSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Too long'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(200, 'Too long')
    .regex(/^[\p{L}\p{N}-]+$/u, 'Slug can only contain letters, numbers and hyphens'),
  type: cmsPageTypeSchema,
})
export type CreatePageInput = z.infer<typeof createPageSchema>

export const updatePageTitleSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Too long'),
})

// --- Block schemas -----------------------------------------------------------------------------

const blockBase = { _key: z.string().min(1) }

const heroBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('hero'),
  heading: z.string(),
  subheading: z.string().optional(),
  image: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
})

const richTextBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('richText'),
  html: z.string(),
})

const productGridBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('productGrid'),
  title: z.string().optional(),
  mode: z.enum(['featured', 'latest', 'category', 'manual']),
  categoryId: z.string().nullable().optional(),
  productIds: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
})

const bannerBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('banner'),
  image: z.string(),
  href: z.string().optional(),
})

const imageWithTextBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('imageWithText'),
  image: z.string(),
  heading: z.string(),
  body: z.string(),
  imageSide: z.enum(['left', 'right']),
})

const faqBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('faq'),
  items: z.array(z.object({ q: z.string(), a: z.string() })),
})

const testimonialsBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('testimonials'),
  items: z.array(z.object({ name: z.string(), quote: z.string() })).optional(),
  mode: z.literal('reviews').optional(),
})

const contactBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('contact'),
  heading: z.string(),
  showForm: z.boolean(),
})

const listingsGridBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('listingsGrid'),
  limit: z.number().int().positive().optional(),
})

const coursesGridBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('coursesGrid'),
  limit: z.number().int().positive().optional(),
})

const companyIntroBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('companyIntro'),
  heading: z.string().max(200),
  body: z.string().max(5000),
  image: z.string().optional(),
  stats: z.array(z.object({ label: z.string().max(40), value: z.string().max(40) })).max(6).optional(),
  showContact: z.boolean(),
})

const inquiryCtaBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('inquiryCta'),
  heading: z.string().max(200),
  body: z.string().max(1000).optional(),
  showSms: z.boolean(),
})

const htmlBlockSchema = z.object({
  ...blockBase,
  _type: z.literal('html'),
  raw: z.string(),
})

export const cmsBlockSchema = z.discriminatedUnion('_type', [
  heroBlockSchema,
  richTextBlockSchema,
  productGridBlockSchema,
  bannerBlockSchema,
  imageWithTextBlockSchema,
  faqBlockSchema,
  testimonialsBlockSchema,
  contactBlockSchema,
  listingsGridBlockSchema,
  coursesGridBlockSchema,
  htmlBlockSchema,
  companyIntroBlockSchema,
  inquiryCtaBlockSchema,
])

export const saveDraftSchema = z.object({
  pageId: z.string().uuid(),
  blocks: z.array(cmsBlockSchema),
})

export const publishSchema = z.object({ pageId: z.string().uuid() })
export const discardDraftSchema = z.object({ pageId: z.string().uuid() })
export const restoreRevisionSchema = z.object({
  pageId: z.string().uuid(),
  revisionId: z.number(),
})

// --- Menus ---------------------------------------------------------------------------------

const menuChildSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  href: z.string().trim().min(1, 'Link is required'),
})

const menuItemSchema = z.object({
  label: z.string().trim().min(1, 'Label is required'),
  href: z.string().trim().min(1, 'Link is required'),
  children: z.array(menuChildSchema).optional(),
})

export const saveMenuSchema = z.object({
  handle: z.enum(['header', 'footer']),
  items: z.array(menuItemSchema),
})
export type SaveMenuInput = z.infer<typeof saveMenuSchema>

// --- Product search (productGrid block's manual picker) --------------------------------------

export interface ProductLite {
  id: string
  name: string
  sku: string | null
  price: number
}
