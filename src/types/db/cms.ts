// src/types/db/cms.ts
// CMS pages/revisions/menus + expenses, and the CMS block model — mirrors
// supabase/migrations/0003_delivery_cms_ops.sql and docs/architecture.md §4.

export type CmsPageType = 'page' | 'home' | 'policy'
export type CmsPageStatus = 'draft' | 'published'

export interface CmsPage {
  id: string
  org_id: string
  title: string
  slug: string
  type: CmsPageType
  blocks: CmsBlock[]
  draft_blocks: CmsBlock[] | null
  status: CmsPageStatus
  seo: Record<string, unknown> | null
  published_at: string | null
  updated_by: string | null
  updated_at: string
  created_at: string
}

// Timeline table: bigint identity id (see docs/architecture.md §3 "Timeline tables").
export interface CmsRevision {
  id: number
  org_id: string
  page_id: string
  blocks: CmsBlock[]
  saved_by: string | null
  created_at: string
}

export interface MenuItem {
  label: string
  href: string
  children?: MenuItem[]
}

export type MenuHandle = 'header' | 'footer'

export interface Menu {
  id: string
  org_id: string
  handle: MenuHandle
  items: MenuItem[]
  created_at: string
}

export interface Expense {
  id: string
  org_id: string
  category: string
  amount: number
  note: string | null
  spent_at: string
  media_id: string | null
  created_by: string | null
  created_at: string
}

// ---------------------------------------------------------------------------------------------
// CMS block model (Sanity/Payload hybrid) — architecture.md §4.
// `blocks`/`draft_blocks` are a jsonb array of `{ _key: nanoid8, _type, ...props }`. Optional
// fields below reflect that the block editor builds these incrementally (add → fill in → save),
// so a freshly-added block does not yet have every prop populated.
// ---------------------------------------------------------------------------------------------

export interface BlockBase {
  _key: string
  _type: string
}

export interface HeroBlock extends BlockBase {
  _type: 'hero'
  heading: string
  subheading?: string
  image?: string // media storage path
  ctaLabel?: string
  ctaHref?: string
}

export interface RichTextBlock extends BlockBase {
  _type: 'richText'
  html: string
}

export type ProductGridMode = 'featured' | 'latest' | 'category' | 'manual'

export interface ProductGridBlock extends BlockBase {
  _type: 'productGrid'
  title?: string
  mode: ProductGridMode
  categoryId?: string | null
  productIds?: string[]
  limit?: number
}

export interface BannerBlock extends BlockBase {
  _type: 'banner'
  image: string
  href?: string
}

export type ImageWithTextSide = 'left' | 'right'

export interface ImageWithTextBlock extends BlockBase {
  _type: 'imageWithText'
  image: string
  heading: string
  body: string
  imageSide: ImageWithTextSide
}

export interface FaqItem {
  q: string
  a: string
}

export interface FaqBlock extends BlockBase {
  _type: 'faq'
  items: FaqItem[]
}

export interface TestimonialItem {
  name: string
  quote: string
}

export interface TestimonialsBlock extends BlockBase {
  _type: 'testimonials'
  // Either a hand-authored list, or mode:'reviews' to pull from the reviews table at render time.
  items?: TestimonialItem[]
  mode?: 'reviews'
}

export interface ContactBlock extends BlockBase {
  _type: 'contact'
  heading: string
  showForm: boolean
}

export interface ListingsGridBlock extends BlockBase {
  _type: 'listingsGrid' // realestate vertical
  limit?: number
}

export interface CoursesGridBlock extends BlockBase {
  _type: 'coursesGrid' // courses vertical
  limit?: number
}

export interface HtmlBlock extends BlockBase {
  _type: 'html' // raw HTML, admin-only escape hatch
  raw: string
}

/** 회사 소개 (기계 공급사용) — 소개글 + 숫자로 보는 회사 + 연락처 */
export interface CompanyIntroStat {
  label: string
  value: string
}
export interface CompanyIntroBlock extends BlockBase {
  _type: 'companyIntro'
  heading: string
  body: string
  image?: string
  stats?: CompanyIntroStat[]
  showContact: boolean
}

/** 전화·문자 문의 띠 (기계 공급사용) — 미니샵 대표 번호로 바로 연결 */
export interface InquiryCtaBlock extends BlockBase {
  _type: 'inquiryCta'
  heading: string
  body?: string
  showSms: boolean
}

export type CmsBlock =
  | HeroBlock
  | CompanyIntroBlock
  | InquiryCtaBlock
  | RichTextBlock
  | ProductGridBlock
  | BannerBlock
  | ImageWithTextBlock
  | FaqBlock
  | TestimonialsBlock
  | ContactBlock
  | ListingsGridBlock
  | CoursesGridBlock
  | HtmlBlock
