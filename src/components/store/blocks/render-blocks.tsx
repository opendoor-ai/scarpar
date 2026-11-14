import type { Lang } from '@/lib/i18n'
import type { CmsBlock } from '@/types/db'

import type { StoreOrg } from '../get-store-org'
import { BannerBlockView } from './banner-block'
import { CompanyIntroBlockView } from './company-intro-block'
import { InquiryCtaBlockView } from './inquiry-cta-block'
import { ContactBlockView } from './contact-block'
import { CoursesGridBlockView } from './courses-grid-block'
import { FaqBlockView } from './faq-block'
import { HeroBlockView } from './hero-block'
import { HtmlBlockView } from './html-block'
import { ImageWithTextBlockView } from './image-with-text-block'
import { ListingsGridBlockView } from './listings-grid-block'
import { ProductGridBlockView } from './product-grid-block'
import { RichTextBlockView } from './rich-text-block'
import { TestimonialsBlockView } from './testimonials-block'

export interface BlockRenderContext {
  org: StoreOrg
  lang: Lang
}

/** CMS block switch (docs/architecture.md §4) — one view component per _type, keyed by _key. */
export function RenderBlocks({ blocks, ctx }: { blocks: CmsBlock[]; ctx: BlockRenderContext }) {
  return (
    <>
      {blocks.map((block) => (
        <RenderBlock key={block._key} block={block} ctx={ctx} />
      ))}
    </>
  )
}

function RenderBlock({ block, ctx }: { block: CmsBlock; ctx: BlockRenderContext }) {
  switch (block._type) {
    case 'hero':
      return <HeroBlockView block={block} ctx={ctx} />
    case 'richText':
      return <RichTextBlockView block={block} />
    case 'productGrid':
      return <ProductGridBlockView block={block} ctx={ctx} />
    case 'banner':
      return <BannerBlockView block={block} ctx={ctx} />
    case 'imageWithText':
      return <ImageWithTextBlockView block={block} />
    case 'faq':
      return <FaqBlockView block={block} />
    case 'testimonials':
      return <TestimonialsBlockView block={block} ctx={ctx} />
    case 'contact':
      return <ContactBlockView block={block} ctx={ctx} />
    case 'listingsGrid':
      return <ListingsGridBlockView block={block} ctx={ctx} />
    case 'coursesGrid':
      return <CoursesGridBlockView block={block} ctx={ctx} />
    case 'html':
      return <HtmlBlockView block={block} />
    case 'companyIntro':
      return <CompanyIntroBlockView block={block} ctx={ctx} />
    case 'inquiryCta':
      return <InquiryCtaBlockView block={block} ctx={ctx} />
    default:
      return null
  }
}
