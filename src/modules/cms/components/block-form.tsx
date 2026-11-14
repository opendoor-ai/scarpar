'use client'

import type { CmsBlock } from '@/types/db'
import type { CategoryOption } from './block-meta'
import { HeroForm } from './blocks/hero-form'
import { RichTextForm } from './blocks/rich-text-form'
import { ProductGridForm } from './blocks/product-grid-form'
import { BannerForm } from './blocks/banner-form'
import { ImageWithTextForm } from './blocks/image-with-text-form'
import { FaqForm } from './blocks/faq-form'
import { TestimonialsForm } from './blocks/testimonials-form'
import { ContactForm } from './blocks/contact-form'
import { ListingsGridForm } from './blocks/listings-grid-form'
import { CoursesGridForm } from './blocks/courses-grid-form'
import { HtmlForm } from './blocks/html-form'
import { CompanyIntroForm } from './blocks/company-intro-form'
import { InquiryCtaForm } from './blocks/inquiry-cta-form'

interface BlockFormProps {
  block: CmsBlock
  categories: CategoryOption[]
  onChange: (next: CmsBlock) => void
}

/** Dispatches to the per-type form. Each leaf form replaces the whole block on change
 *  (not a patch) — sidesteps the fact that Partial<CmsBlock> doesn't distribute over the union. */
function BlockForm({ block, categories, onChange }: BlockFormProps) {
  switch (block._type) {
    case 'hero':
      return <HeroForm block={block} onChange={onChange} />
    case 'richText':
      return <RichTextForm block={block} onChange={onChange} />
    case 'productGrid':
      return <ProductGridForm block={block} categories={categories} onChange={onChange} />
    case 'banner':
      return <BannerForm block={block} onChange={onChange} />
    case 'imageWithText':
      return <ImageWithTextForm block={block} onChange={onChange} />
    case 'faq':
      return <FaqForm block={block} onChange={onChange} />
    case 'testimonials':
      return <TestimonialsForm block={block} onChange={onChange} />
    case 'contact':
      return <ContactForm block={block} onChange={onChange} />
    case 'listingsGrid':
      return <ListingsGridForm block={block} onChange={onChange} />
    case 'coursesGrid':
      return <CoursesGridForm block={block} onChange={onChange} />
    case 'html':
      return <HtmlForm block={block} onChange={onChange} />
    case 'companyIntro':
      return <CompanyIntroForm block={block} onChange={onChange} />
    case 'inquiryCta':
      return <InquiryCtaForm block={block} onChange={onChange} />
    default:
      return null
  }
}

export { BlockForm }
