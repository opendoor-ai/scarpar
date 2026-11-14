// 공급사 미니샵 — 입점한 모든 공급사 목록 (취급 품목·등록 제품 수 → 미니샵 바로가기)

import type { Metadata } from 'next'
import Link from 'next/link'
import { Store } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { mediaUrl } from '@/lib/media-url'
import { SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `공급사 미니샵 · ${SITE_NAME}`,
  description: '전자동기계광고에 입점한 산업기계·중고기계 공급사를 한눈에 보고 미니샵에서 제품을 확인하세요.',
}

interface OrgRow {
  id: string
  name: string
  slug: string
  logo_path: string | null
  address: string | null
  item_keywords: string[] | null
}

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const query = (q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 40)
  const supabase = getAnonClient()

  let orgReq = supabase
    .from('orgs')
    .select('id, name, slug, logo_path, address, item_keywords')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(500)
  if (query) orgReq = orgReq.ilike('name', `%${query}%`)
  const [{ data: orgData }, { data: productRows }] = await Promise.all([
    orgReq,
    supabase.from('products').select('org_id').eq('status', 'active').limit(50000),
  ])
  const orgs = (orgData ?? []) as OrgRow[]
  const counts = new Map<string, number>()
  for (const p of (productRows ?? []) as { org_id: string }[]) counts.set(p.org_id, (counts.get(p.org_id) ?? 0) + 1)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold sm:text-2xl">공급사 미니샵</h1>
          <p className="text-sm text-muted-foreground">입점 공급사 {orgs.length}곳 — 공급사를 누르면 미니샵에서 제품을 볼 수 있어요.</p>
        </div>
        <form method="GET" className="w-full sm:w-72">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="공급사 이름 검색"
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring sm:h-9 sm:text-sm"
          />
        </form>
      </div>

      {orgs.length === 0 ? (
        <EmptyState icon={Store} title="공급사를 찾을 수 없어요" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <Link
              key={o.id}
              href={`/minishop/${o.slug}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {o.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(o.logo_path)} alt="" className="size-full object-contain" />
                ) : (
                  <Store className="size-6 text-muted-foreground" />
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-semibold">{o.name}</span>
                {o.item_keywords && o.item_keywords.length > 0 ? (
                  <span className="truncate text-xs text-muted-foreground">{o.item_keywords.slice(0, 5).join(' · ')}</span>
                ) : null}
                <span className="text-xs text-primary">등록 제품 {(counts.get(o.id) ?? 0).toLocaleString('ko-KR')}개</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
