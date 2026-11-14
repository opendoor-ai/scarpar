// 구매문의 (모든 공급사) — 고객이 찾는 제품을 보고 전화·문자로 상담해요

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import type { PageProps } from '@/lib/types'
import { cn } from '@/lib/utils'
import { listAdminRequests } from '@/modules/purchase-requests/data'
import { RequestsManager } from '@/modules/purchase-requests/components/requests-manager'
import type { RequestStatus } from '@/modules/purchase-requests/schemas'

export const dynamic = 'force-dynamic'

const TABS: { key: RequestStatus | 'all' | 'mine'; label: string; adminOnly?: boolean }[] = [
  { key: 'all', label: '전체' },
  { key: 'open', label: '상담가능' },
  { key: 'in_progress', label: '상담중' },
  { key: 'done', label: '상담완료' },
  { key: 'mine', label: '우리 회사 상담' },
  { key: 'hidden', label: '숨김', adminOnly: true },
]

export default async function AdminRequestsPage({ searchParams }: PageProps<Record<string, string>, { status?: string; q?: string }>) {
  const ctx = await requireOrg()
  const sp = await searchParams
  const admin = await isPlatformAdmin()
  const tabs = TABS.filter((t) => !t.adminOnly || admin)
  const status = tabs.find((t) => t.key === sp.status)?.key ?? 'all'
  const { items, ready } = await listAdminRequests({
    orgId: ctx.org.id,
    status,
    q: sp.q,
    includeHidden: admin && status === 'hidden',
  })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="구매문의"
        description="고객이 찾는 제품이에요. 전체 연락처는 공급사에게만 보여요. 상담하기를 누르면 공개 화면에 우리 회사가 상담 공급사로 표시돼요."
      />

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/requests${t.key === 'all' ? '' : `?status=${t.key}`}`}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              status === t.key ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted',
            )}
          >
            {t.label}
          </Link>
        ))}
        <form action="/admin/requests" className="ml-auto flex gap-2">
          {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="제품명·내용·문의자 검색"
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
          />
        </form>
        <Link href="/requests" target="_blank" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          공개 화면
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {ready ? (
        <RequestsManager items={items} isPlatformAdmin={admin} />
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          구매문의 표가 아직 없어요. Supabase SQL 편집기에서 <code>0025_purchase_requests.sql</code>을 먼저 실행해 주세요.
        </p>
      )}
    </div>
  )
}
