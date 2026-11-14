// 구매문의 목록 — 고객이 찾는 제품 (연락처는 가려서 보여줌)

import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ImageIcon, MessageSquareText, Search } from 'lucide-react'

import { SITE_NAME } from '@/lib/site'
import type { PageProps } from '@/lib/types'
import { cn } from '@/lib/utils'
import { listPublicRequests } from '@/modules/purchase-requests/data'
import { ConditionBadges, StatusText } from '@/modules/purchase-requests/components/badges'
import { RequestShell, SafetyNotice } from '@/modules/purchase-requests/components/request-shell'
import { REQUEST_CONDITIONS, timeAgo, type RequestCondition } from '@/modules/purchase-requests/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `구매문의 · ${SITE_NAME}`,
  description: '찾는 산업기계·중고기계를 알려주시면 가장 알맞은 공급사가 견적과 함께 연락드려요.',
}

const TABS: { key: 'all' | RequestCondition; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'new', label: '신품' },
  { key: 'used', label: '중고' },
  { key: 'any', label: '무관' },
]

type SP = { cond?: string; q?: string; page?: string }

function href(sp: SP, patch: Partial<SP>) {
  const next = { ...sp, ...patch }
  const qs = new URLSearchParams()
  if (next.cond && next.cond !== 'all') qs.set('cond', next.cond)
  if (next.q) qs.set('q', next.q)
  if (next.page && next.page !== '1') qs.set('page', next.page)
  const s = qs.toString()
  return s ? `/requests?${s}` : '/requests'
}

export default async function RequestsPage({ searchParams }: PageProps<Record<string, string>, SP>) {
  const sp = await searchParams
  const cond = (REQUEST_CONDITIONS as readonly string[]).includes(sp.cond ?? '') ? (sp.cond as RequestCondition) : 'all'
  const page = Math.max(1, Number(sp.page) || 1)
  const pageSize = 15
  const { items, total, counts, ready } = await listPublicRequests({ condition: cond, q: sp.q, page, pageSize })
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const startPage = Math.max(1, Math.min(page - 2, lastPage - 4))
  const pages = Array.from({ length: Math.min(5, lastPage) }, (_, i) => startPage + i)
  const now = Date.now()

  return (
    <RequestShell title="구매문의" description="원하는 제품을 알려주시면 가장 알맞은 공급사·제조사와 연결해 드려요.">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {/* 머리 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-lg font-extrabold">구매문의 리스트</h2>
          <span className="rounded-full border border-border px-3 py-0.5 text-xs text-muted-foreground">
            전체 <b className="text-foreground">{counts.total.toLocaleString()}</b>건 / 진행중{' '}
            <b className="text-foreground">{counts.inProgress.toLocaleString()}</b>건 / 완료{' '}
            <b className="text-foreground">{counts.done.toLocaleString()}</b>건
          </span>
        </div>

        {/* 탭 + 검색 */}
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
          <div className="grid grid-cols-4 overflow-hidden rounded-md border border-border text-sm sm:w-80">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={href(sp, { cond: t.key, page: '1' })}
                className={cn(
                  'flex h-9 items-center justify-center border-r border-border last:border-r-0',
                  cond === t.key ? 'bg-foreground font-semibold text-background' : 'hover:bg-muted',
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <form action="/requests" className="relative sm:ml-auto sm:w-72">
            {cond !== 'all' ? <input type="hidden" name="cond" value={cond} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="찾는 제품을 검색하세요"
              className="h-9 w-full rounded-full border border-border bg-background px-4 pr-10 text-sm outline-none focus:border-primary"
            />
            <button type="submit" className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" aria-label="검색">
              <Search className="size-4" />
            </button>
          </form>
        </div>

        {/* 목록 */}
        {!ready ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            구매문의 표가 아직 없어요. Supabase SQL 편집기에서 <code>0025_purchase_requests.sql</code>을 실행해 주세요.
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <MessageSquareText className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {sp.q ? `"${sp.q}"에 맞는 구매문의가 없어요.` : '아직 등록된 구매문의가 없어요.'}
            </p>
            <Link href="/requests/new" className="text-sm font-semibold text-primary hover:underline">
              첫 구매문의 등록하기 →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.no}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/40">
                  <ConditionBadges condition={r.condition} className="w-[68px] justify-center" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {r.images.length > 0 ? <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                      <p className="truncate font-bold group-hover:text-primary">{r.title}</p>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{r.detail}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.authorMasked} <span className="mx-1 text-border">|</span> {r.phoneMasked}
                      {r.region ? (
                        <>
                          <span className="mx-1 text-border">|</span> {r.region}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {timeAgo(r.createdAt, now)}
                      <span className="text-border">|</span>
                      <StatusText status={r.status} />
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600" title="상담한 공급사 수">
                      <MessageSquareText className="size-3.5" />
                      {r.responseCount}
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 쪽 번호 */}
        {lastPage > 1 ? (
          <nav className="flex items-center justify-center gap-1 border-t border-border py-5" aria-label="쪽 이동">
            <Link
              href={href(sp, { page: String(Math.max(1, page - 1)) })}
              className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              aria-label="이전"
            >
              <ChevronLeft className="size-4" />
            </Link>
            {pages.map((p) => (
              <Link
                key={p}
                href={href(sp, { page: String(p) })}
                className={cn(
                  'flex size-8 items-center justify-center rounded text-sm',
                  p === page ? 'bg-foreground font-bold text-background' : 'hover:bg-muted',
                )}
              >
                {p}
              </Link>
            ))}
            <Link
              href={href(sp, { page: String(Math.min(lastPage, page + 1)) })}
              className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              aria-label="다음"
            >
              <ChevronRight className="size-4" />
            </Link>
          </nav>
        ) : null}
      </section>
      <SafetyNotice />
    </RequestShell>
  )
}
