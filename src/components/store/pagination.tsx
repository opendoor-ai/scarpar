import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

import { storePath } from './store-links'

export function Pagination({
  orgSlug,
  page,
  totalPages,
  query,
  category,
  basePath,
}: {
  orgSlug: string
  page: number
  totalPages: number
  query?: string
  category?: string
  /** 통합 검색처럼 공급사 주소가 아닌 목록이면 그 주소 (예: '/products') */
  basePath?: string
}) {
  if (totalPages <= 1) return null

  function href(p: number): string {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (query) params.set('q', query)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `${basePath ?? storePath(orgSlug, '/products')}${qs ? `?${qs}` : ''}`
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )

  return (
    <nav className="flex items-center justify-center gap-1 pt-4" aria-label="페이지 이동">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md border border-input transition-colors hover:bg-accent',
          page <= 1 && 'pointer-events-none opacity-40',
        )}
      >
        <ChevronLeft className="size-4" />
      </Link>

      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 ? <span className="px-1 text-xs text-muted-foreground">…</span> : null}
          <Link
            href={href(p)}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
              p === page ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-accent',
            )}
          >
            {p}
          </Link>
        </span>
      ))}

      <Link
        href={href(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md border border-input transition-colors hover:bg-accent',
          page >= totalPages && 'pointer-events-none opacity-40',
        )}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  )
}
