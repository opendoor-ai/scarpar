// 공급사 미니샵 — 입점한 모든 공급사 로고 카드 (ㄱㄴㄷ · A~Z 색인, 검색) → 미니샵 바로가기
// 공급사 등록·기본정보에서 올린 공급사명(한글)·영문명·회사 로고가 그대로 보여요.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, Store } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { mediaUrl } from '@/lib/media-url'
import { SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'
import { cleanCompanyName, EN_INDEX, indexOf, KO_INDEX } from '@/lib/supplier-index'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `공급사 미니샵 · ${SITE_NAME}`,
  description: '전자동기계광고에 입점한 산업기계·중고기계 공급사를 가나다·ABC 순으로 보고 미니샵에서 제품을 확인하세요.',
}

interface OrgRow {
  id: string
  name: string
  slug: string
  logo_path: string | null
  item_keywords: string[] | null
  name_en?: string | null
}

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; i?: string }> }) {
  const { q, i } = await searchParams
  const query = (q ?? '').replace(/[,()%*\\]/g, ' ').trim().slice(0, 40)
  const supabase = getAnonClient()

  // 0031(영문명) 전에도 열리게
  const cols = 'id, name, slug, logo_path, item_keywords'
  let res = await supabase.from('orgs').select(`${cols}, name_en`).eq('is_active', true).limit(1000)
  if (res.error) res = (await supabase.from('orgs').select(cols).eq('is_active', true).limit(1000)) as typeof res
  const { data: productRows } = await supabase.from('products').select('org_id').eq('status', 'active').limit(50000)

  const all = ((res.data ?? []) as OrgRow[]).sort((a, b) => cleanCompanyName(a.name).localeCompare(cleanCompanyName(b.name), 'ko'))
  const counts = new Map<string, number>()
  for (const p of (productRows ?? []) as { org_id: string }[]) counts.set(p.org_id, (counts.get(p.org_id) ?? 0) + 1)

  const present = new Set(all.map((o) => indexOf(o.name)))
  const active = i && (KO_INDEX as readonly string[]).concat(EN_INDEX, ['0-9']).includes(i) ? i : ''
  const lower = query.toLowerCase()
  const orgs = all.filter((o) => {
    if (active && indexOf(o.name) !== active) return false
    if (!lower) return true
    return o.name.toLowerCase().includes(lower) || (o.name_en ?? '').toLowerCase().includes(lower) || (o.item_keywords ?? []).some((k) => k.toLowerCase().includes(lower))
  })

  const tab = (label: string, value: string) => {
    const on = active === value
    const has = value === '' || present.has(value)
    return (
      <Link
        key={label}
        href={value ? `/suppliers?i=${encodeURIComponent(value)}` : '/suppliers'}
        aria-current={on ? 'page' : undefined}
        className={cn(
          'flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-[13px] transition-colors',
          on ? 'bg-foreground font-bold text-background' : has ? 'text-foreground hover:bg-muted' : 'pointer-events-none text-muted-foreground/40',
        )}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold sm:text-2xl">공급사 미니샵</h1>
        <form method="GET" className="relative w-full max-w-md" role="search">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="공급사명 · 영문명 · 취급 품목 검색"
            className="h-11 w-full rounded-full border border-input bg-background px-5 pr-11 text-base outline-none focus-visible:border-primary sm:text-sm"
          />
          <button type="submit" className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground" aria-label="검색">
            <Search className="size-4" />
          </button>
        </form>
      </div>

      {/* 색인 */}
      <nav aria-label="공급사 색인" className="mb-6 flex flex-col gap-1.5 border-y border-border py-3">
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {tab('전체', '')}
          {KO_INDEX.map((k) => tab(k, k))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {EN_INDEX.map((k) => tab(k, k))}
          {tab('0-9', '0-9')}
        </div>
      </nav>

      <p className="mb-3 text-sm text-muted-foreground">
        {active ? <b className="text-foreground">{active} </b> : null}공급사 <b className="text-foreground">{orgs.length}</b>곳
      </p>

      {orgs.length === 0 ? (
        <EmptyState icon={Store} title="공급사를 찾을 수 없어요" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/minishop/${o.slug}`}
                className="group flex h-full flex-col border border-border bg-white transition-colors hover:border-foreground/60 dark:bg-card"
              >
                <span className="flex h-28 items-center justify-center px-4 py-3">
                  {o.logo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(o.logo_path)} alt={o.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                  ) : (
                    <span className="text-center text-lg leading-tight font-extrabold break-keep text-neutral-700 dark:text-neutral-200">{cleanCompanyName(o.name)}</span>
                  )}
                </span>
                <span className="flex flex-col items-center gap-0.5 border-t border-border px-2 py-3 text-center">
                  <span className="w-full truncate text-sm font-medium">{o.name}</span>
                  <span className="w-full truncate text-xs text-muted-foreground">{o.name_en || `등록 제품 ${(counts.get(o.id) ?? 0).toLocaleString('ko-KR')}개`}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
