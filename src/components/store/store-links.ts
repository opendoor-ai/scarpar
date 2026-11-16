import { minishopOrigin, subdomainsEnabled } from '@/lib/domains'

// Small link helpers shared across the storefront (src/components/store/**). Every internal
// storefront route lives under /minishop/{orgSlug}/... — these keep that prefixing in one place.

/**
 * 미니샵 주소. 서브도메인을 켜면(NEXT_PUBLIC_ROOT_DOMAIN) `https://{orgSlug}.jeonjadong.com{path}`,
 * 아니면 `/minishop/{orgSlug}{path}`. path 를 비우면 미니샵 첫 화면.
 * (서버·브라우저 어디서나 같은 값이 나와서 화면이 어긋나지 않아요)
 */
export function storePath(orgSlug: string, path = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (subdomainsEnabled) return `${minishopOrigin(orgSlug)}${clean}`
  return `/minishop/${orgSlug}${clean === '/' ? '' : clean}`
}

/**
 * Resolves an admin-authored menu href (src/types/db/cms.ts MenuItem.href — free text) against
 * the storefront's /minishop/{orgSlug} prefix. Leaves absolute/external/anchor/protocol links untouched.
 */
export function resolveMenuHref(orgSlug: string, href: string): string {
  if (!href) return storePath(orgSlug)
  if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href
  }
  if (href.startsWith(`/minishop/${orgSlug}`)) return storePath(orgSlug, href.slice(`/minishop/${orgSlug}`.length))
  return storePath(orgSlug, href)
}

/** 상품 상세 주소: `/minishop/{orgSlug}/products/{상품번호}` (REST 형식, 상품번호는 등록 시 자동 부여) */
export function productPath(orgSlug: string, productNo: number): string {
  return storePath(orgSlug, `/products/${productNo}`)
}
