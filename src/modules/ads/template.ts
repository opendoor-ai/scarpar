// 배너 코드(템플릿) 엔진 — 전자동기계광고 자체 형식 (서버 전용)
//
// <section data-jd-group>                       ← 그룹 틀 (안에 그룹명 자리: data-jd-group-title)
//   <div data-jd-item>                          ← 배너 수만큼 반복
//     <a data-jd-link><img src="{{image_url}}" alt="{{alt}}"></a>   ← 링크가 있으면 a, 없으면 a 를 벗겨 냄
//     <p style="{{text1.style}}">{{text1}}</p>
//     <ul><li data-jd-product>{{p.image}} {{p.name}} {{p.price}}</li></ul>  ← 연결 상품 수만큼 반복
//   </div>
// </section>
//
// 변수는 {{이름}} 형식입니다. 전체 목록은 관리 화면 그룹의 "코드" 창(VARIABLE_GUIDE)에 있어요.

import render from 'dom-serializer'
import { type ChildNode, type Element, Text, isTag } from 'domhandler'
import { findAll, findOne, replaceElement } from 'domutils'
import { parseDocument } from 'htmlparser2'
import sanitizeHtml from 'sanitize-html'

import type { TextItem } from './banner-types'

export const ATTR = {
  group: 'data-jd-group',
  item: 'data-jd-item',
  product: 'data-jd-product',
  link: 'data-jd-link',
  title: 'data-jd-group-title',
} as const

export interface TemplateProduct {
  no: number
  name: string
  link: string
  image: string | null
  price: number // minor
  compare_at_price: number | null
  soldout: boolean
  summary: string | null
  simple: string | null
}

export interface TemplateBanner {
  id: string
  alt: string
  link: string
  link_target: string
  image_pc: string | null
  image_mobile: string | null
  texts: TextItem[]
  colors: string[]
  html: string
  extra_images: string[]
  products: TemplateProduct[]
}

/** 우리 형식의 배너 코드인지 (아니면 사이트 기본 모양을 씀) */
export function isOwnTemplate(template: string | null | undefined): boolean {
  return Boolean(template && template.includes(ATTR.item))
}

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const won = (minor: number | null | undefined) =>
  minor && minor > 0 ? `${Math.round(minor / 100).toLocaleString('ko-KR')}원` : ''

const img = (url: string | null, alt: string) => (url ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">` : '')

function textVars(texts: TextItem[]): Record<string, string> {
  const v: Record<string, string> = {}
  for (let i = 1; i <= 10; i++) {
    const t = texts[i - 1]
    const color = t?.color || ''
    const weight = t?.bold ? '700' : '400'
    const pc = t?.pc_size ? `${t.pc_size}px` : ''
    const m = t?.m_size ? `${t.m_size}px` : pc
    const css = (size: string) =>
      [size && `font-size:${size}`, color && `color:${color}`, t && `font-weight:${weight}`].filter(Boolean).join(';')
    v[`text${i}`] = t?.text ?? '' // <b> 같은 강조 태그 허용 (마지막에 안전하게 정리됨)
    v[`text${i}.size`] = pc
    v[`text${i}.msize`] = m
    v[`text${i}.color`] = color
    v[`text${i}.bold`] = t?.bold ? 'bold' : ''
    v[`text${i}.style`] = css(pc)
    v[`text${i}.mstyle`] = css(m)
    // CSS 변수: --jd-size, --jd-msize, --jd-color, --jd-weight
    v[`text${i}.vars`] = [
      pc && `--jd-size:${pc}`,
      m && `--jd-msize:${m}`,
      color && `--jd-color:${color}`,
      t && `--jd-weight:${weight}`,
    ]
      .filter(Boolean)
      .join(';')
  }
  return v
}

function productVars(p: TemplateProduct, index: number): Record<string, string> {
  const listPrice = p.compare_at_price && p.compare_at_price > p.price ? p.compare_at_price : null
  const discount = listPrice && p.price > 0 ? Math.round(((listPrice - p.price) / listPrice) * 100) : 0
  return {
    'p.name': esc(p.name),
    'p.url': esc(p.link),
    'p.image': img(p.image, p.name),
    'p.image_url': esc(p.image ?? ''),
    'p.price': won(p.price) || '가격협의',
    'p.list_price': won(listPrice),
    'p.discount': discount > 0 ? `${discount}%` : '',
    'p.soldout': p.soldout ? 'jd-soldout' : '',
    'p.soldout_badge': p.soldout ? '<span class="jd-soldout-badge">품절</span>' : '',
    'p.summary': esc(p.summary ?? ''),
    'p.spec': esc(p.simple ?? ''),
    'p.no': String(p.no),
    'p.order': String(index + 1),
  }
}

/** {{이름}} 채우기 (모르는 이름은 빈칸) */
function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_whole, key: string) => vars[key] ?? '')
}

const hasAttr = (name: string) => (n: ChildNode) => isTag(n) && name in (n as Element).attribs

/** 배너 한 장 (상품 반복 → 링크 처리 → 변수 채우기) */
function renderItem(itemTpl: string, b: TemplateBanner, index: number, groupName: string): string {
  const doc = parseDocument(itemTpl, { lowerCaseAttributeNames: false })
  const hasLink = Boolean(b.link) && b.link !== '#' && b.link !== '#none'

  const productChunks: string[] = []
  for (const el of findAll(hasAttr(ATTR.product), doc.children)) {
    const tpl = render(el, { decodeEntities: false })
    productChunks.push(b.products.map((p, i) => fill(tpl, productVars(p, i))).join(''))
    replaceElement(el, new Text(`__JD_PRODUCTS_${productChunks.length - 1}__`))
  }

  // data-jd-link: 링크가 있으면 주소·새창 여부를 넣고, 없으면 a 를 벗겨 냄
  for (const a of findAll(hasAttr(ATTR.link), doc.children)) {
    delete a.attribs[ATTR.link]
    if (hasLink) {
      a.attribs.href = b.link
      if (b.link_target === '_blank') {
        a.attribs.target = '_blank'
        a.attribs.rel = 'noopener'
      }
    } else if (a.parent) {
      const parent = a.parent
      const idx = parent.children.indexOf(a)
      for (const c of a.children) c.parent = parent
      parent.children.splice(idx, 1, ...a.children)
    }
  }

  const root = findOne(hasAttr(ATTR.item), doc.children) as Element | null
  if (root) root.attribs['data-ad-banner'] = b.id

  const vars: Record<string, string> = {
    url: esc(hasLink ? b.link : ''),
    target: b.link_target === '_blank' ? '_blank' : '_self',
    image: img(b.image_pc, b.alt),
    image_url: esc(b.image_pc ?? ''),
    mobile_image: img(b.image_mobile || b.image_pc, b.alt),
    mobile_image_url: esc(b.image_mobile || b.image_pc || ''),
    alt: esc(b.alt),
    html: b.html,
    no: String(index + 1),
    index: String(index),
    group: esc(groupName),
    ...textVars(b.texts),
  }
  for (let i = 1; i <= 4; i++) vars[`color${i}`] = b.colors[i - 1] ?? ''
  for (let i = 1; i <= 5; i++) {
    const url = b.extra_images[i - 1] ?? ''
    vars[`extra${i}`] = img(url || null, b.alt)
    vars[`extra${i}.url`] = esc(url)
  }

  let out = fill(render(doc, { decodeEntities: false }), vars)
  productChunks.forEach((chunk, i) => {
    out = out.replace(`__JD_PRODUCTS_${i}__`, () => chunk)
  })
  return out
}

/** 그룹 배너 코드 → 완성된 HTML (스크립트·이벤트 속성은 제거) */
export function renderBannerCode(template: string, groupName: string, banners: TemplateBanner[]): string {
  const doc = parseDocument(template, { lowerCaseAttributeNames: false })

  for (const el of findAll(hasAttr(ATTR.title), doc.children)) {
    el.children = parseDocument(esc(groupName)).children
    for (const c of el.children) c.parent = el
  }

  const itemEl = findOne(hasAttr(ATTR.item), doc.children) as Element | null
  if (!itemEl) return clean(fill(render(doc, { decodeEntities: false }), { group: esc(groupName) }))

  const itemTpl = render(itemEl, { decodeEntities: false })
  const html = banners.map((b, i) => renderItem(itemTpl, b, i, groupName)).join('')
  replaceElement(itemEl, new Text('__JD_ITEMS__'))
  const out = fill(render(doc, { decodeEntities: false }), { group: esc(groupName) }).replace('__JD_ITEMS__', () => html)
  return clean(out)
}

/** 결과 정리: 스크립트·on이벤트·javascript: 링크 제거, 꾸밈(class·style 등)은 허용 */
function clean(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'video', 'source', 'picture', 'iframe', 'section', 'article', 'header', 'footer', 'figure',
      'figcaption', 'span', 'button', 'svg', 'path', 'mark', 'small', 'sup', 'sub',
    ]),
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'title', 'role', 'aria-*', 'data-*', 'lang', 'dir'],
      a: ['href', 'target', 'rel', 'name'],
      img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
      source: ['src', 'srcset', 'type', 'media'],
      video: ['src', 'poster', 'autoplay', 'muted', 'loop', 'playsinline', 'controls', 'preload', 'width', 'height'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading'],
      svg: ['viewBox', 'width', 'height', 'fill', 'xmlns'],
      path: ['d', 'fill', 'stroke', 'stroke-width'],
    },
    allowedSchemes: ['http', 'https', 'tel', 'mailto', 'sms'],
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
    allowVulnerableTags: false,
  })
}
