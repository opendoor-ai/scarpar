// 전화·문자 문의 블록 — 미니샵 대표 번호로 바로 전화·문자 (번호가 없으면 표시 안 함)

import { MessageSquare, Phone } from 'lucide-react'

import { formatKrPhone, isMobilePhone, phoneDigits } from '@/lib/phone'
import type { InquiryCtaBlock } from '@/types/db'

import type { BlockRenderContext } from './render-blocks'

export function InquiryCtaBlockView({ block, ctx }: { block: InquiryCtaBlock; ctx: BlockRenderContext }) {
  const phone = ctx.org.phone
  if (!phone) return null
  const digits = phoneDigits(phone)
  const canSms = block.showSms && isMobilePhone(digits)
  const smsBody = `[${ctx.org.name}] 미니샵 보고 연락드립니다. 문의드릴 기계: `

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-start gap-4 rounded-xl bg-primary px-6 py-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold sm:text-xl">{block.heading}</h2>
          {block.body ? <p className="text-sm opacity-90">{block.body}</p> : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <a
            href={`tel:${digits}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-background px-5 text-sm font-semibold text-foreground hover:bg-background/90"
          >
            <Phone className="size-4" />
            {formatKrPhone(phone)}
          </a>
          {canSms ? (
            <a
              href={`sms:${digits}?&body=${encodeURIComponent(smsBody)}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary-foreground/40 px-5 text-sm font-semibold hover:bg-primary-foreground/10"
            >
              <MessageSquare className="size-4" />
              문자 문의
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}
