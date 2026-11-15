'use client'

// 플랫폼 관리자: 공급사 입점 신청 심사 (승인 / 거절)

import { mediaUrl } from '@/lib/media-url'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Check, ExternalLink, Inbox, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'

import { approveApplicationAction, rejectApplicationAction } from '../actions'

export interface ApplicationRow {
  id: string
  company_name: string
  name_en?: string | null
  logo_path?: string | null
  desired_slug: string
  business_number: string | null
  contact_name: string
  phone: string
  email: string | null
  address: string | null
  homepage_url: string | null
  item_keywords: string[] | null
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  created_at: string
  reviewed_at: string | null
}

const STATUS: Record<ApplicationRow['status'], { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
  pending: { label: '심사 대기', variant: 'warning' },
  approved: { label: '승인', variant: 'success' },
  rejected: { label: '거절', variant: 'destructive' },
}

export function ApplicationsReview({ applications }: { applications: ApplicationRow[] }) {
  const pending = applications.filter((a) => a.status === 'pending')
  const done = applications.filter((a) => a.status !== 'pending')

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">
        공급사 입점 신청 <span className="text-sm font-normal text-muted-foreground">대기 {pending.length}건</span>
      </h2>
      {applications.length === 0 ? (
        <EmptyState icon={Inbox} title="아직 입점 신청이 없습니다" description="회원이 가입 후 입점 신청을 하면 여기에 표시됩니다." />
      ) : (
        <ul className="flex flex-col gap-3">
          {[...pending, ...done].map((a) => (
            <ApplicationItem key={a.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ApplicationItem({ a }: { a: ApplicationRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const status = STATUS[a.status]

  function reject() {
    startTransition(async () => {
      const result = await rejectApplicationAction(a.id, reason)
      if (!result.ok) return void toast.error(result.error)
      toast.success('신청을 거절했습니다')
      setRejecting(false)
      router.refresh()
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        {a.logo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(a.logo_path)} alt="" className="h-8 w-20 rounded border border-border bg-white object-contain" />
        ) : null}
        <span className="font-semibold">{a.company_name}</span>
        {a.name_en ? <span className="text-xs text-muted-foreground">{a.name_en}</span> : null}
        <span className="text-muted-foreground">/minishop/{a.desired_slug}</span>
        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(a.created_at), 'yyyy.MM.dd HH:mm')}</span>
      </div>

      <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">담당자</dt>
        <dd>{a.contact_name}</dd>
        <dt className="text-muted-foreground">연락처</dt>
        <dd>{a.phone}</dd>
        {a.email ? (
          <>
            <dt className="text-muted-foreground">이메일</dt>
            <dd>{a.email}</dd>
          </>
        ) : null}
        {a.business_number ? (
          <>
            <dt className="text-muted-foreground">사업자번호</dt>
            <dd>{a.business_number}</dd>
          </>
        ) : null}
        {a.address ? (
          <>
            <dt className="text-muted-foreground">주소</dt>
            <dd>{a.address}</dd>
          </>
        ) : null}
        {a.homepage_url ? (
          <>
            <dt className="text-muted-foreground">홈페이지</dt>
            <dd>
              <a href={a.homepage_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary hover:underline">
                {a.homepage_url}
                <ExternalLink className="size-3" />
              </a>
            </dd>
          </>
        ) : null}
        {a.item_keywords?.length ? (
          <>
            <dt className="text-muted-foreground">취급품목</dt>
            <dd>{a.item_keywords.map((k) => `#${k}`).join(' ')}</dd>
          </>
        ) : null}
        {a.message ? (
          <>
            <dt className="text-muted-foreground">메모</dt>
            <dd className="whitespace-pre-line">{a.message}</dd>
          </>
        ) : null}
        {a.status === 'rejected' && a.reject_reason ? (
          <>
            <dt className="text-muted-foreground">거절 사유</dt>
            <dd>{a.reject_reason}</dd>
          </>
        ) : null}
      </dl>

      {a.status === 'pending' ? (
        rejecting ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="거절 사유 (신청자에게 보여요)"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                취소
              </Button>
              <Button type="button" variant="destructive" size="sm" disabled={isPending || !reason.trim()} onClick={reject}>
                거절하기
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm">
                  <Check className="size-4" />
                  승인
                </Button>
              }
              title={`${a.company_name} 입점을 승인할까요?`}
              description={`승인하면 공급사 미니샵(/minishop/${a.desired_slug})과 관리자 화면이 바로 만들어지고, 신청자가 대표 권한을 받습니다.`}
              confirmLabel="승인"
              onConfirm={async () => {
                const result = await approveApplicationAction(a.id)
                if (!result.ok) return void toast.error(result.error)
                toast.success(`${a.company_name} 입점을 승인했습니다`)
                router.refresh()
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setRejecting(true)}>
              <X className="size-4" />
              거절
            </Button>
          </div>
        )
      ) : null}
    </li>
  )
}
