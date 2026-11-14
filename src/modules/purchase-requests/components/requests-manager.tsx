'use client'

// 관리자 구매문의 — 공급사: 전체 연락처 보기·상담하기·메모 / 플랫폼 관리자: 상태 변경·삭제

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, ImageIcon, Mail, MapPin, MessageSquare, Phone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { cn } from '@/lib/utils'

import {
  cancelResponseAction,
  deleteRequestAction,
  respondRequestAction,
  saveResponseMemoAction,
  setRequestStatusAction,
} from '../actions'
import type { AdminRequest } from '../data'
import { formatPhone, REQUEST_STATUSES, STATUS_LABEL, timeAgo } from '../schemas'
import { ConditionBadges, StatusText } from './badges'

function RequestCard({ r, isPlatformAdmin }: { r: AdminRequest; isPlatformAdmin: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [memo, setMemo] = useState(r.myMemo ?? '')
  const [open, setOpen] = useState(false)
  const digits = r.phone.replace(/[^\d]/g, '')

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error ?? '처리하지 못했어요')
      else {
        if (done) toast.success(done)
        router.refresh()
      }
    })
  }

  return (
    <li className={cn('rounded-lg border bg-card p-5', r.mine ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border')}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>No. {r.no}</span>
        <span className="text-border">|</span>
        <span>{timeAgo(r.createdAt)}</span>
        <span className="text-border">|</span>
        <StatusText status={r.status} />
        <span className="text-border">|</span>
        <span>
          상담 공급사 <b className="text-red-600">{r.responseCount}</b>
        </span>
        {r.mine ? (
          <span className="rounded bg-primary px-1.5 py-px text-[11px] font-bold text-primary-foreground">우리 회사 상담중</span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ConditionBadges condition={r.condition} />
        <h3 className="text-base font-bold">{r.title}</h3>
        <Link href={`/requests/${r.no}`} target="_blank" className="text-muted-foreground hover:text-foreground" aria-label="공개 화면 보기">
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <p className={cn('mt-2 text-sm whitespace-pre-line text-muted-foreground', !open && 'line-clamp-2')}>{r.detail}</p>
      {r.detail.length > 120 || r.images.length > 0 ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-medium text-primary">
          {open ? '접기' : `자세히 보기${r.images.length > 0 ? ` (사진 ${r.images.length})` : ''}`}
        </button>
      ) : null}
      {open && r.images.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.images.map((p) => (
            <a key={p} href={mediaUrl(p)} target="_blank" rel="noopener" className="size-24 overflow-hidden rounded border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(p)} alt="" className="size-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {/* 연락처 (공급사에게만 전체 공개) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-muted/50 px-4 py-3 text-sm">
        <span className="font-semibold">{r.authorName}</span>
        <a href={`tel:${digits}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <Phone className="size-3.5" />
          {formatPhone(r.phone)}
        </a>
        {r.email ? (
          <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Mail className="size-3.5" />
            {r.email}
          </a>
        ) : null}
        {r.region ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5" />
            {r.region}
          </span>
        ) : null}
        {r.images.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <ImageIcon className="size-3.5" />
            사진 {r.images.length}
          </span>
        ) : null}
        {r.responders.length > 0 ? (
          <span className="text-xs text-muted-foreground">상담: {r.responders.join(', ')}</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.mine ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => cancelResponseAction(r.id), '상담을 취소했어요')}>
            상담 취소
          </Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => run(() => respondRequestAction(r.id), '상담 공급사로 등록했어요')}>
            상담하기
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <a href={`tel:${digits}`}>
            <Phone className="size-3.5" />
            전화
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`sms:${digits}`}>
            <MessageSquare className="size-3.5" />
            문자
          </a>
        </Button>

        {isPlatformAdmin ? (
          <div className="ml-auto flex items-center gap-2">
            <select
              value={r.status}
              disabled={pending}
              onChange={(e) => run(() => setRequestStatusAction(r.id, e.target.value), '상태를 바꿨어요')}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="진행 상태"
            >
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" className="text-red-600" aria-label="삭제">
                  <Trash2 className="size-4" />
                </Button>
              }
              title="이 구매문의를 삭제할까요?"
              description="첨부 사진도 함께 지워지고, 되돌릴 수 없어요. 숨기기만 하려면 상태를 '숨김'으로 바꾸세요."
              confirmLabel="삭제"
              destructive
              onConfirm={() => run(() => deleteRequestAction(r.id), '삭제했어요')}
            />
          </div>
        ) : null}
      </div>

      {r.mine ? (
        <div className="mt-3 flex gap-2">
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="우리 회사만 보는 메모 (견적 금액, 통화 내용 등)"
            className="text-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || memo === (r.myMemo ?? '')}
            onClick={() => run(() => saveResponseMemoAction(r.id, memo), '메모를 저장했어요')}
            className="self-end"
          >
            저장
          </Button>
        </div>
      ) : null}
    </li>
  )
}

export function RequestsManager({ items, isPlatformAdmin }: { items: AdminRequest[]; isPlatformAdmin: boolean }) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">조건에 맞는 구매문의가 없어요.</p>
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((r) => (
        <RequestCard key={r.id} r={r} isPlatformAdmin={isPlatformAdmin} />
      ))}
    </ul>
  )
}
