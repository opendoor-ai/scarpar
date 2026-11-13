import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface AuditPaginationProps {
  page: number
  totalPages: number
  total: number
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
}

function buildHref(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page' || value === undefined) continue
    const single = Array.isArray(value) ? value[0] : value
    if (single) params.set(key, single)
  }
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

function AuditPagination({ page, totalPages, total, basePath, searchParams }: AuditPaginationProps) {
  return (
    <div className="flex items-center justify-between text-[13px] text-muted-foreground">
      <span>총 {total}건</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={buildHref(basePath, searchParams, page - 1)}>이전</Link>
          ) : (
            <span>이전</span>
          )}
        </Button>
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? (
            <Link href={buildHref(basePath, searchParams, page + 1)}>다음</Link>
          ) : (
            <span>다음</span>
          )}
        </Button>
      </div>
    </div>
  )
}

export { AuditPagination }
