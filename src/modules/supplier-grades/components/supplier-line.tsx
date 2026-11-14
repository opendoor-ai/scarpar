'use client'

// 공급사 관리 — 한 줄 + 펼치는 관리 칸 (운영 상태 · 등급 · 기본 정보 · 변경 기록)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ExternalLink, History, Pause, Play, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { formatKrPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

import { setOrgGradeAction, setOrgStatusAction, updateSupplierInfoAction } from '../actions'
import { SupplierAccounts } from './supplier-accounts'
import type { GradeRow } from './suppliers-manager'

export interface SupplierLog {
  kind: 'status' | 'grade' | 'info'
  summary: string
  memo: string | null
  created_at: string
}

export interface SupplierRow {
  id: string
  name: string
  slug: string
  isActive: boolean
  gradeId: string | null
  gradeUntil: string | null
  gradeMemo: string | null
  productsActive: number
  productsTotal: number
  jumpsToday: number
  createdAt: string
  phone: string | null
  email: string | null
  contactName: string | null
  address: string | null
  homepageUrl: string | null
  bizNo: string | null
  statusReason: string | null
  statusChangedAt: string | null
  ownerEmail: string | null
  isPlatform: boolean
  logs: SupplierLog[]
}

export function todayKst() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })
}

export function GradeChip({ grade, muted }: { grade: GradeRow | undefined; muted?: boolean }) {
  if (!grade) return <span className="text-xs text-muted-foreground">-</span>
  return (
    <span
      className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white', muted && 'opacity-50')}
      style={{ backgroundColor: grade.color }}
    >
      {grade.name}
    </span>
  )
}

const LOG_LABEL: Record<SupplierLog['kind'], string> = { status: '운영 상태', grade: '등급', info: '정보' }
type Tab = 'status' | 'grade' | 'info' | 'accounts' | 'logs'

export function SupplierLine({ s, grades, defaultGrade }: { s: SupplierRow; grades: GradeRow[]; defaultGrade: GradeRow | undefined }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('status')

  // 등급
  const [gradeId, setGradeId] = useState(s.gradeId ?? '')
  const [until, setUntil] = useState(s.gradeUntil ?? '')
  const [memo, setMemo] = useState(s.gradeMemo ?? '')
  // 운영 상태
  const [reason, setReason] = useState('')
  // 기본 정보
  const [info, setInfo] = useState({
    name: s.name,
    phone: s.phone ?? '',
    email: s.email ?? '',
    contact_name: s.contactName ?? '',
    address: s.address ?? '',
    homepage_url: s.homepageUrl ?? '',
    bin_number: s.bizNo ?? '',
  })

  const byId = new Map(grades.map((g) => [g.id, g]))
  const expired = Boolean(s.gradeUntil && s.gradeUntil < todayKst())
  const assigned = s.gradeId ? byId.get(s.gradeId) : undefined
  const effective = assigned && !expired ? assigned : defaultGrade
  const jumpLimit = (effective?.jump_featured_limit ?? 0) + (effective?.jump_normal_limit ?? 0)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error ?? '처리하지 못했어요')
      else {
        toast.success(done)
        after?.()
        router.refresh()
      }
    })
  }

  const label = 'text-xs font-medium'
  const tabs: [Tab, string][] = [
    ['status', '운영 상태'],
    ['grade', '등급'],
    ['info', '기본 정보'],
    ['accounts', '로그인 계정'],
    ['logs', `변경 기록 ${s.logs.length > 0 ? s.logs.length : ''}`],
  ]

  return (
    <>
      <tr className={cn('border-b border-border text-center text-xs [&>td]:px-2 [&>td]:py-2.5', !s.isActive && 'bg-red-50/60 dark:bg-red-950/20')}>
        <td className="text-left">
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">
              {s.name}
              {s.isPlatform ? <span className="ml-1 rounded bg-primary/10 px-1 text-[10px] text-primary">플랫폼</span> : null}
            </span>
            <a href={`/minishop/${s.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
              아이디 {s.slug}
              <ExternalLink className="size-3" />
            </a>
          </div>
        </td>
        <td className="text-left leading-5">
          <span className="block">{s.contactName || '-'}</span>
          <span className="block text-muted-foreground tabular-nums">{s.phone ? formatKrPhone(s.phone) : '-'}</span>
          {s.ownerEmail ? <span className="block truncate text-muted-foreground">{s.ownerEmail}</span> : null}
        </td>
        <td>
          {s.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              운영중
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300" title={s.statusReason ?? ''}>
              <span className="size-1.5 rounded-full bg-red-500" />
              중지
            </span>
          )}
        </td>
        <td>
          <div className="flex flex-col items-center gap-1">
            <GradeChip grade={effective} />
            {expired && assigned ? <span className="text-[10px] text-red-600">{assigned.name} 기간 끝남</span> : null}
            {s.gradeUntil && !expired ? <span className="text-[10px] text-muted-foreground">{s.gradeUntil}까지</span> : null}
          </div>
        </td>
        <td className="tabular-nums">
          {s.productsActive} / {s.productsTotal}
        </td>
        <td className="tabular-nums">{jumpLimit > 0 ? `${s.jumpsToday} / ${jumpLimit}` : <span className="text-muted-foreground">없음</span>}</td>
        <td className="text-muted-foreground tabular-nums">{fmtDate(s.createdAt)}</td>
        <td>
          <Button size="sm" variant={open ? 'secondary' : 'outline'} className="h-7 text-xs" onClick={() => setOpen((v) => !v)}>
            관리
            <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
          </Button>
        </td>
      </tr>

      {open ? (
        <tr className="border-b border-border bg-muted/40">
          <td colSpan={8} className="px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-border">
              {tabs.map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn('-mb-px border-b-2 px-3 py-1.5 text-xs font-medium', tab === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
                >
                  {l}
                </button>
              ))}
              <span className="ml-auto flex gap-1 pb-1">
                <a
                  href={`/minishop/${s.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted"
                >
                  <ExternalLink className="size-3" />
                  미니샵 보기
                </a>
                <a
                  href={`/minishop/${s.slug}/admin`}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  title="이 공급사의 관리자 화면으로 들어가서 대신 관리해요"
                >
                  공급사 관리자 화면 열기 →
                </a>
              </span>
            </div>

            {/* 운영 상태 */}
            {tab === 'status' ? (
              <div className="flex flex-col gap-3 text-xs">
                <p>
                  지금 상태:{' '}
                  <b className={s.isActive ? 'text-emerald-600' : 'text-red-600'}>{s.isActive ? '운영중' : '중지'}</b>
                  {s.statusChangedAt ? <span className="ml-2 text-muted-foreground">({fmtDateTime(s.statusChangedAt)} 변경)</span> : null}
                  {!s.isActive && s.statusReason ? <span className="ml-2">사유: {s.statusReason}</span> : null}
                </p>
                {s.isActive ? (
                  s.isPlatform ? (
                    <p className="text-muted-foreground">전자동(플랫폼) 공급사는 중지할 수 없어요. 중지하면 사이트 전체 제품이 숨겨져요.</p>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex min-w-72 flex-1 flex-col gap-1">
                        <span className={label}>중지 사유 (필수)</span>
                        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="h-8 bg-background" placeholder="예) 광고비 미납, 허위 매물 신고 확인 중" />
                      </label>
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="destructive" disabled={pending || !reason.trim()}>
                            <Pause className="size-3.5" />
                            운영 중지
                          </Button>
                        }
                        title={`${s.name}을(를) 중지할까요?`}
                        description="중지하면 공개 사이트와 미니샵에서 이 공급사의 제품이 모두 숨겨지고, 공급사 직원은 관리자 화면에 들어갈 수 없어요. 언제든 다시 운영중으로 바꿀 수 있어요."
                        confirmLabel="중지"
                        destructive
                        onConfirm={() => run(() => setOrgStatusAction({ orgId: s.id, active: false, reason }), `${s.name}을(를) 중지했어요`, () => setReason(''))}
                      />
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex min-w-72 flex-1 flex-col gap-1">
                      <span className={label}>메모 (선택)</span>
                      <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="h-8 bg-background" placeholder="예) 미납 광고비 입금 확인" />
                    </label>
                    <Button size="sm" disabled={pending} onClick={() => run(() => setOrgStatusAction({ orgId: s.id, active: true, reason }), `${s.name}을(를) 다시 운영중으로 바꿨어요`, () => setReason(''))}>
                      <Play className="size-3.5" />
                      다시 운영
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* 등급 */}
            {tab === 'grade' ? (
              <div className="flex flex-wrap items-end gap-3 text-xs">
                <label className="flex flex-col gap-1">
                  <span className={label}>등급</span>
                  <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">기본 등급 ({defaultGrade?.name ?? '무료공급사'})</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} — 점프 추천 {g.jump_featured_limit} + 일반 {g.jump_normal_limit}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={label}>기간 끝나는 날 (비우면 계속)</span>
                  <span className="flex items-center gap-1">
                    <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
                    {[1, 3, 6, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const base = until && until >= todayKst() ? until : todayKst()
                          const d = new Date(`${base}T00:00:00Z`)
                          d.setUTCMonth(d.getUTCMonth() + m)
                          setUntil(d.toISOString().slice(0, 10))
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 hover:bg-muted"
                        title="지금 기간에 이어서 늘려요"
                      >
                        +{m}개월
                      </button>
                    ))}
                    {until ? (
                      <button type="button" onClick={() => setUntil('')} className="h-8 px-1 text-muted-foreground hover:text-foreground">
                        지우기
                      </button>
                    ) : null}
                  </span>
                </label>
                <label className="flex min-w-60 flex-1 flex-col gap-1">
                  <span className={label}>메모 (입금·계약 내용)</span>
                  <Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={500} className="h-8 bg-background" placeholder="예) 2026-11-15 6개월 입금 확인" />
                </label>
                <Button size="sm" disabled={pending} onClick={() => run(() => setOrgGradeAction({ orgId: s.id, gradeId: gradeId || null, until: until || null, memo: memo || null }), `${s.name}의 등급을 바꿨어요`)}>
                  <Save className="size-3.5" />
                  등급 저장
                </Button>
              </div>
            ) : null}

            {/* 기본 정보 */}
            {tab === 'info' ? (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ['name', '공급사명', 'text'],
                      ['contact_name', '담당자', 'text'],
                      ['phone', '대표 전화', 'tel'],
                      ['email', '이메일', 'email'],
                      ['bin_number', '사업자등록번호', 'text'],
                      ['homepage_url', '홈페이지', 'text'],
                      ['address', '주소', 'text'],
                    ] as const
                  ).map(([key, l, type]) => (
                    <label key={key} className={cn('flex flex-col gap-1', key === 'address' && 'sm:col-span-2')}>
                      <span className={label}>{l}</span>
                      <Input type={type} value={info[key]} onChange={(e) => setInfo((p) => ({ ...p, [key]: e.target.value }))} className="h-8 bg-background" />
                    </label>
                  ))}
                  <div className="flex flex-col gap-1">
                    <span className={label}>공급사 아이디</span>
                    <span className="flex h-8 items-center rounded-md border border-dashed border-input px-2 text-muted-foreground">{s.slug} (바꿀 수 없음)</span>
                  </div>
                </div>
                <div>
                  <Button size="sm" disabled={pending} onClick={() => run(() => updateSupplierInfoAction({ orgId: s.id, ...info }), '공급사 정보를 저장했어요')}>
                    <Save className="size-3.5" />
                    정보 저장
                  </Button>
                </div>
              </div>
            ) : null}

            {/* 로그인 계정 */}
            {tab === 'accounts' ? <SupplierAccounts orgId={s.id} orgSlug={s.slug} /> : null}

            {/* 변경 기록 */}
            {tab === 'logs' ? (
              s.logs.length === 0 ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <History className="size-3.5" />
                  아직 변경 기록이 없어요.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background text-xs">
                  {s.logs.map((l, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2">
                      <span className="w-32 text-muted-foreground tabular-nums">{fmtDateTime(l.created_at)}</span>
                      <span className="rounded bg-muted px-1.5 py-px font-medium">{LOG_LABEL[l.kind]}</span>
                      <span className="font-semibold">{l.summary}</span>
                      {l.memo ? <span className="text-muted-foreground">— {l.memo}</span> : null}
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  )
}
