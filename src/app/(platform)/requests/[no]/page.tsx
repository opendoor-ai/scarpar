// 구매문의 상세 — 연락처는 가리고, 공급사에게는 "관리자 화면에서 상담하기" 안내

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, Eye, List, MapPin, Phone, UserRound } from 'lucide-react'

import { mediaUrl } from '@/lib/media-url'
import { SITE_NAME } from '@/lib/site'
import type { PageProps } from '@/lib/types'
import { getPublicRequest } from '@/modules/purchase-requests/data'
import { ConditionBadges, StatusText } from '@/modules/purchase-requests/components/badges'
import { RequestShell, SafetyNotice } from '@/modules/purchase-requests/components/request-shell'
import { timeAgo } from '@/modules/purchase-requests/schemas'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps<{ no: string }>): Promise<Metadata> {
  const { no } = await params
  return { title: `구매문의 ${no}번 · ${SITE_NAME}`, robots: { index: false } }
}

export default async function RequestDetailPage({ params }: PageProps<{ no: string }>) {
  const { no } = await params
  const n = Number(no)
  if (!Number.isInteger(n) || n <= 0) notFound()
  const r = await getPublicRequest(n)
  if (!r) notFound()

  return (
    <RequestShell title="구매문의" description="원하는 제품을 알려주시면 가장 알맞은 공급사·제조사와 연결해 드려요.">
      <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-3 border-b border-border px-6 py-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>No. {r.no}</span>
            <span className="text-border">|</span>
            <StatusText status={r.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConditionBadges condition={r.condition} />
            <h2 className="text-xl font-extrabold sm:text-2xl">{r.title}</h2>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" />
              {r.authorMasked}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5" />
              {r.phoneMasked}
            </span>
            {r.region ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {r.region}
              </span>
            ) : null}
            <span>{timeAgo(r.createdAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {r.viewCount.toLocaleString()}
            </span>
          </div>
        </header>

        <div className="flex flex-col gap-6 px-6 py-6">
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{r.detail}</p>
          {r.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {r.images.map((p) => (
                <a
                  key={p}
                  href={mediaUrl(p)}
                  target="_blank"
                  rel="noopener"
                  className="block aspect-square overflow-hidden rounded-md border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(p)} alt="" className="size-full object-cover transition-transform hover:scale-105" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {/* 상담 공급사 */}
        <div className="border-t border-border bg-muted/40 px-6 py-5">
          <p className="text-sm font-bold">
            상담 중인 공급사 <span className="text-red-600">{r.responseCount}</span>
          </p>
          {r.responders.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.responders.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
                >
                  <Building2 className="size-3.5 text-primary" />
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">아직 상담한 공급사가 없어요.</p>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-5 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            공급사이신가요? 로그인 후 <b className="text-foreground">관리자 → 구매문의</b>에서 전체 연락처를 보고 상담할 수
            있어요.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/requests"
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-4 text-sm hover:bg-muted"
            >
              <List className="size-4" />
              목록
            </Link>
            <Link
              href="/admin/requests"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              공급사 상담하기
            </Link>
          </div>
        </div>
      </article>
      <SafetyNotice />
    </RequestShell>
  )
}
