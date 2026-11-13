import type { CmsBlock } from '@/types/db'

export interface CategoryOption {
  id: string
  name: string
}

export const BLOCK_TYPES: CmsBlock['_type'][] = [
  'hero',
  'richText',
  'productGrid',
  'banner',
  'imageWithText',
  'faq',
  'testimonials',
  'contact',
  'listingsGrid',
  'coursesGrid',
  'html',
]

export const BLOCK_LABELS: Record<CmsBlock['_type'], string> = {
  hero: '메인 배너(히어로)',
  richText: '글(텍스트)',
  productGrid: '상품 목록',
  banner: '배너',
  imageWithText: '이미지 + 글',
  faq: '자주 묻는 질문',
  testimonials: '고객 후기',
  contact: '문의하기',
  listingsGrid: '매물 목록',
  coursesGrid: '강의 목록',
  html: '직접 입력 HTML',
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** One-line summary shown on a block's card in the left-column list. */
export function blockSummary(block: CmsBlock): string {
  switch (block._type) {
    case 'hero':
      return block.heading || 'Untitled heading'
    case 'richText':
      return block.html ? stripHtml(block.html).slice(0, 60) : '비어 있음'
    case 'productGrid': {
      const modeLabel = block.mode === 'featured' ? '추천 상품' : block.mode === 'category' ? '카테고리' : '직접 선택'
      return `${modeLabel}${block.limit ? ` · 최대 ${block.limit}개` : ''}`
    }
    case 'banner':
      return block.href || 'No link'
    case 'imageWithText':
      return block.heading || 'Untitled heading'
    case 'faq':
      return `질문 ${block.items.length}개`
    case 'testimonials':
      return block.mode === 'reviews' ? '게시된 리뷰에서 가져옴' : `후기 ${block.items?.length ?? 0}개`
    case 'contact':
      return block.heading || 'Untitled heading'
    case 'listingsGrid':
      return block.limit ? `최대 ${block.limit}개` : '활성 매물 전체'
    case 'coursesGrid':
      return block.limit ? `최대 ${block.limit}개` : '활성 강의 전체'
    case 'html':
      return block.raw ? block.raw.slice(0, 60) : '비어 있음'
    default:
      return ''
  }
}

export function createBlock(type: CmsBlock['_type'], key: string): CmsBlock {
  switch (type) {
    case 'hero':
      return { _key: key, _type: 'hero', heading: '' }
    case 'richText':
      return { _key: key, _type: 'richText', html: '' }
    case 'productGrid':
      return { _key: key, _type: 'productGrid', mode: 'featured', limit: 8 }
    case 'banner':
      return { _key: key, _type: 'banner', image: '' }
    case 'imageWithText':
      return { _key: key, _type: 'imageWithText', image: '', heading: '', body: '', imageSide: 'left' }
    case 'faq':
      return { _key: key, _type: 'faq', items: [] }
    case 'testimonials':
      return { _key: key, _type: 'testimonials', items: [] }
    case 'contact':
      return { _key: key, _type: 'contact', heading: '', showForm: true }
    case 'listingsGrid':
      return { _key: key, _type: 'listingsGrid', limit: 6 }
    case 'coursesGrid':
      return { _key: key, _type: 'coursesGrid', limit: 6 }
    case 'html':
      return { _key: key, _type: 'html', raw: '' }
  }
}
