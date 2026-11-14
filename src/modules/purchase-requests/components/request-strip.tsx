// 메인 화면 "구매문의" 띠 — 최신 문의 카드를 가로로 넘겨 봐요

import Link from 'next/link'
import { ArrowRight, MessageSquarePlus } from 'lucide-react'

import { HScroller } from '@/components/platform/h-scroller'

import type { PublicRequest } from '../data'
import { ConditionBadges, StatusText } from './badges'

export function RequestStrip({ items }: { items: PublicRequest[] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-muted/60 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold sm:text-2xl">구매문의</h2>
          <p className="text-sm text-muted-foreground">찾는 기계를 남기면 가장 알맞은 공급사가 견적과 함께 연락드려요.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/requests"
            className="inline-flex h-10 items-center gap-1 rounded-md border border-foreground/80 bg-background px-4 text-sm font-semibold hover:bg-muted"
          >
            구매문의 더보기
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/requests/new"
            className="inline-flex h-10 items-center gap-1 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/85"
          >
            <MessageSquarePlus className="size-4" />
            구매문의 등록
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <Link
          href="/requests/new"
          className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-background p-8 text-center hover:border-primary"
        >
          <MessageSquarePlus className="size-8 text-primary" />
          <span className="font-semibold">찾는 기계가 있나요?</span>
          <span className="text-sm text-muted-foreground">
            회원가입 없이 1분이면 등록돼요. 여러 공급사의 견적을 비교해 보세요.
          </span>
        </Link>
      ) : (
        <HScroller className="mt-6" autoPlayMs={4000} label="구매문의">
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.no}`}
              className="group flex w-[260px] shrink-0 snap-start flex-col gap-2 rounded-xl bg-background p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-border transition-shadow hover:shadow-md hover:ring-primary/40 sm:w-[280px]"
            >
              <div className="flex items-center justify-between">
                <ConditionBadges condition={r.condition} />
                <StatusText status={r.status} />
              </div>
              <p className="truncate text-center text-lg font-extrabold group-hover:text-primary">{r.title}</p>
              <p className="truncate text-center text-sm text-muted-foreground">{r.detail}</p>
              <p className="text-center text-sm">
                <span className="font-semibold">연락처</span>
                <span className="ml-2 text-muted-foreground">{r.phoneMasked}</span>
              </p>
            </Link>
          ))}
        </HScroller>
      )}
    </section>
  )
}
