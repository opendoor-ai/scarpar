// 메인 화면 "구매문의" 띠 — 짙은 남색 고급 배경 + 읽기 쉬운 흰 카드, 가로로 넘겨 봐요

import Link from 'next/link'
import { ArrowRight, Clock, MapPin, MessageSquarePlus, Phone } from 'lucide-react'

import { HScroller } from '@/components/platform/h-scroller'
import { cn } from '@/lib/utils'

import type { PublicRequest } from '../data'
import { STATUS_LABEL, timeAgo, type RequestStatus } from '../schemas'
import { ConditionBadges } from './badges'

const STATUS_PILL: Record<RequestStatus, string> = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200',
  done: 'bg-neutral-100 text-neutral-500 ring-neutral-200',
  hidden: 'bg-neutral-100 text-neutral-500 ring-neutral-200',
}

export function RequestStrip({ items }: { items: PublicRequest[] }) {
  const now = Date.now()
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1b33] via-[#14244a] to-[#1d2f5c] px-5 py-8 text-white sm:px-9 sm:py-10">
      {/* 은은한 빛 */}
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-amber-300/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.2em] text-amber-300">BUYING REQUEST</span>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">구매문의</h2>
          <p className="max-w-md text-sm leading-relaxed text-white/70">
            찾는 기계를 남기면 <b className="font-semibold text-white">가장 알맞은 공급사</b>가 견적과 함께 연락드려요. 회원가입 없이 무료.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link
            href="/requests"
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 px-3 text-[13px] font-semibold whitespace-nowrap sm:px-5 sm:text-sm text-white backdrop-blur hover:bg-white/10 sm:flex-none"
          >
            구매문의 더보기
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/requests/new"
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 text-[13px] font-bold whitespace-nowrap sm:px-5 sm:text-sm text-[#0f1b33] shadow-lg shadow-amber-500/20 hover:bg-amber-300 sm:flex-none"
          >
            <MessageSquarePlus className="size-4" />
            구매문의 등록
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <Link
          href="/requests/new"
          className="relative mt-7 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/30 p-8 text-center hover:border-amber-300"
        >
          <MessageSquarePlus className="size-8 text-amber-300" />
          <span className="font-semibold">찾는 기계가 있나요?</span>
          <span className="text-sm text-white/70">1분이면 등록돼요. 여러 공급사의 견적을 비교해 보세요.</span>
        </Link>
      ) : (
        <HScroller
          className="relative mt-5 [&_.snap-x]:py-3 [&_.bg-border]:bg-white/20 [&_.bg-foreground]:bg-amber-300 [&_button]:text-white [&_button:hover]:bg-white/10"
          autoPlayMs={4500}
          label="구매문의"
        >
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.no}`}
              className="group flex w-[270px] shrink-0 snap-start flex-col rounded-2xl bg-white p-5 text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-1 sm:w-[300px]"
            >
              <div className="flex items-center justify-between gap-2">
                <ConditionBadges condition={r.condition} />
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1', STATUS_PILL[r.status])}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="mt-3.5 line-clamp-2 min-h-[2.75rem] text-[17px] leading-snug font-bold tracking-tight group-hover:text-[#14244a] group-hover:underline">
                {r.title}
              </p>
              <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-neutral-500">{r.detail}</p>
              <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-3.5 text-[13px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                  <Phone className="size-3.5 text-[#14244a]" />
                  {r.phoneMasked}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-neutral-400">
                  <Clock className="size-3" />
                  {timeAgo(r.createdAt, now)}
                </span>
              </div>
              {r.region || r.responseCount > 0 ? (
                <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                  {r.region ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {r.region}
                    </span>
                  ) : null}
                  {r.responseCount > 0 ? <span className="ml-auto font-semibold text-blue-700">상담 공급사 {r.responseCount}곳</span> : null}
                </div>
              ) : null}
            </Link>
          ))}
        </HScroller>
      )}
    </section>
  )
}
