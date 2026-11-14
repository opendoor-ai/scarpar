// Small link helpers shared across the storefront (src/components/store/**). Every internal
// storefront route lives under /s/{orgSlug}/... — these keep that prefixing in one place.

/** `/s/{orgSlug}{path}` — path may be omitted/empty for the storefront home. */
export function storePath(orgSlug: string, path = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `/s/${orgSlug}${clean === '/' ? '' : clean}`
}

/**
 * Resolves an admin-authored menu href (src/types/db/cms.ts MenuItem.href — free text) against
 * the storefront's /s/{orgSlug} prefix. Leaves absolute/external/anchor/protocol links untouched.
 */
export function resolveMenuHref(orgSlug: string, href: string): string {
  if (!href) return storePath(orgSlug)
  if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href
  }
  if (href.startsWith(`/s/${orgSlug}`)) return href
  return storePath(orgSlug, href)
}

/** wa.me link from a settings `storefront.whatsapp_number` value (any punctuation/spacing). */
export function whatsappHref(number: string): string | null {
  const digits = number.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

/** 상품 상세 주소: `/s/{orgSlug}/products/{상품번호}` (REST 형식, 상품번호는 등록 시 자동 부여) */
export function productPath(orgSlug: string, productNo: number): string {
  return storePath(orgSlug, `/products/${productNo}`)
}
