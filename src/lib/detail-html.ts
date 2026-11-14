// 상품 상세 내용(detail_html) 정화기 — 서버 전용.
// 공급사마다 다른 사람이 작성하므로, 허용한 태그·속성만 남기는 allowlist 방식으로 거릅니다.
// 저장할 때(catalog actions)와 화면에 그릴 때(상품 상세 페이지) 두 번 모두 거칩니다.

import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'div', 'span',
  'h2', 'h3', 'h4',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
]

export function sanitizeDetailHtml(html: string | null | undefined): string {
  if (!html) return ''
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      '*': ['class'],
    },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowProtocolRelative: false,
    transformTags: {
      // 외부 링크는 새 창 + 보안 속성
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }),
    },
  })
}
