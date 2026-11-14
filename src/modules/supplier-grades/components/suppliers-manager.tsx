'use client'

// 공급사 관리 (플랫폼 관리자) — 공급사 목록·등급 바꾸기 / 등급 설정 (회원등급처럼)

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

import { deleteGradeAction, saveGradeAction, type GradeInput } from '../actions'
import { SupplierLine, todayKst, type SupplierRow } from './supplier-line'

export type { SupplierLog, SupplierRow } from './supplier-line'

export interface GradeRow {
  id: string
  code: string
  name: string
  description: string | null
  is_paid: boolean
  jump_featured_limit: number
  jump_normal_limit: number
  color: string
  sort_order: number
  is_default: boolean
}

/* ------------------------------------------------------------------ */
/* 등급 설정 한 줄                                                      */
/* ------------------------------------------------------------------ */
const EMPTY_GRADE: GradeInput = {
  code: '',
  name: '',
  description: '',
  is_paid: true,
  jump_featured_limit: 0,
  jump_normal_limit: 0,
  color: '#2563eb',
  sort_order: 30,
  is_default: false,
}

function GradeLine({ grade, count, onDone }: { grade?: GradeRow; count?: number; onDone?: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<GradeInput>(
    grade
      ? { ...grade, description: grade.description ?? '' }
      : EMPTY_GRADE,
  )
  const set = (patch: Partial<GradeInput>) => setV((p) => ({ ...p, ...patch }))
  const cell = 'h-8 rounded-md border border-input bg-background px-2 text-xs'

  function save() {
    start(async () => {
      const res = await saveGradeAction({ ...v, id: grade?.id })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(grade ? '등급을 저장했어요' : '새 등급을 만들었어요')
        if (!grade) setV(EMPTY_GRADE)
        onDone?.()
        router.refresh()
      }
    })
  }

  return (
    <tr className="border-b border-border text-center text-xs [&>td]:px-1.5 [&>td]:py-2">
      <td>
        <input value={v.code} onChange={(e) => set({ code: e.target.value })} className={cn(cell, 'w-20')} placeholder="paid" aria-label="코드" />
      </td>
      <td>
        <span className="flex items-center gap-1">
          <input type="color" value={v.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-input" aria-label="색상" />
          <input value={v.name} onChange={(e) => set({ name: e.target.value })} className={cn(cell, 'w-28')} placeholder="유료공급사" aria-label="이름" />
        </span>
      </td>
      <td>
        <input type="checkbox" checked={v.is_paid} onChange={(e) => set({ is_paid: e.target.checked })} className="size-4 accent-primary" aria-label="유료" />
      </td>
      <td>
        <input type="number" min={0} max={100} value={v.jump_featured_limit} onChange={(e) => set({ jump_featured_limit: Number(e.target.value) })} className={cn(cell, 'w-16 text-right')} aria-label="추천 점프" />
      </td>
      <td>
        <input type="number" min={0} max={100} value={v.jump_normal_limit} onChange={(e) => set({ jump_normal_limit: Number(e.target.value) })} className={cn(cell, 'w-16 text-right')} aria-label="일반 점프" />
      </td>
      <td className="font-semibold tabular-nums">{Number(v.jump_featured_limit) + Number(v.jump_normal_limit)}</td>
      <td>
        <input value={v.description ?? ''} onChange={(e) => set({ description: e.target.value })} className={cn(cell, 'w-full min-w-40')} placeholder="등급 설명" aria-label="설명" />
      </td>
      <td>
        <input type="number" value={v.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) })} className={cn(cell, 'w-14 text-right')} aria-label="순서" />
      </td>
      <td>
        <input type="radio" checked={v.is_default} onChange={() => set({ is_default: true })} className="size-4 accent-primary" aria-label="기본 등급" />
      </td>
      <td className="tabular-nums">{grade ? `${count ?? 0}곳` : '-'}</td>
      <td>
        <span className="flex justify-center gap-1">
          <Button size="sm" className="h-7 text-xs" onClick={save} disabled={pending}>
            {grade ? '저장' : (
              <>
                <Plus className="size-3" />
                추가
              </>
            )}
          </Button>
          {grade && !grade.is_default ? (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" aria-label="등급 지우기">
                  <Trash2 className="size-3.5" />
                </Button>
              }
              title={`${grade.name} 등급을 지울까요?`}
              description="이 등급이던 공급사는 기본 등급으로 바뀌어요."
              confirmLabel="지우기"
              destructive
              onConfirm={() =>
                start(async () => {
                  const res = await deleteGradeAction(grade.id)
                  if (!res.ok) toast.error(res.error)
                  else {
                    toast.success('등급을 지웠어요')
                    router.refresh()
                  }
                })
              }
            />
          ) : null}
        </span>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
export function SuppliersManager({ suppliers, grades }: { suppliers: SupplierRow[]; grades: GradeRow[] }) {
  const [tab, setTab] = useState<'list' | 'grades'>('list')
  const [q, setQ] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stopped'>('all')
  const defaultGrade = grades.find((g) => g.is_default)
  const today = todayKst()

  const effectiveId = (s: SupplierRow) =>
    s.gradeId && !(s.gradeUntil && s.gradeUntil < today) && grades.some((g) => g.id === s.gradeId) ? s.gradeId : (defaultGrade?.id ?? '')

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of suppliers) m.set(effectiveId(s), (m.get(effectiveId(s)) ?? 0) + 1)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers, grades])

  const shown = suppliers.filter((s) => {
    if (gradeFilter !== 'all' && effectiveId(s) !== gradeFilter) return false
    if (statusFilter === 'active' && !s.isActive) return false
    if (statusFilter === 'stopped' && s.isActive) return false
    const k = q.trim().toLowerCase()
    if (!k) return true
    const digits = k.replace(/\D/g, '')
    return (
      s.name.toLowerCase().includes(k) ||
      s.slug.toLowerCase().includes(k) ||
      (s.contactName ?? '').toLowerCase().includes(k) ||
      (s.email ?? '').toLowerCase().includes(k) ||
      (s.ownerEmail ?? '').toLowerCase().includes(k) ||
      (digits.length >= 3 && (s.phone ?? '').replace(/\D/g, '').includes(digits))
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* 등급별 공급사 수 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGradeFilter('all')}
          className={cn('rounded-lg border px-4 py-2.5 text-left text-sm', gradeFilter === 'all' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted')}
        >
          <span className="block text-xs text-muted-foreground">전체 공급사</span>
          <b className="text-lg tabular-nums">{suppliers.length}</b>곳
        </button>
        {grades.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setGradeFilter(g.id)
              setTab('list')
            }}
            className={cn('rounded-lg border px-4 py-2.5 text-left text-sm', gradeFilter === g.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted')}
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
            </span>
            <b className="text-lg tabular-nums">{counts.get(g.id) ?? 0}</b>곳
          </button>
        ))}
      </div>

      <div className="flex border-b border-border">
        {(
          [
            ['list', '공급사 목록'],
            ['grades', '등급 설정'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn('-mb-px border-b-2 px-4 py-2 text-sm font-medium', tab === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <span className="text-sm">
              총 <b className="text-primary">{shown.length}</b>곳
            </span>
            <div className="flex overflow-hidden rounded-md border border-border text-xs">
              {(
                [
                  ['all', `전체 ${suppliers.length}`],
                  ['active', `운영중 ${suppliers.filter((x) => x.isActive).length}`],
                  ['stopped', `중지 ${suppliers.filter((x) => !x.isActive).length}`],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatusFilter(k)}
                  className={cn('h-7 border-r border-border px-3 last:border-r-0', statusFilter === k ? 'bg-foreground text-background' : 'hover:bg-muted')}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공급사명·아이디·담당자·전화·이메일" className="h-8 w-64 rounded-md border border-input bg-background pr-2 pl-7 text-xs" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs text-muted-foreground [&>th]:px-2 [&>th]:py-2 [&>th]:font-medium">
                  <th className="text-left">공급사</th>
                  <th className="w-44 text-left">담당자·연락처</th>
                  <th className="w-20">운영 상태</th>
                  <th className="w-28">등급</th>
                  <th className="w-24">상품 (판매중/전체)</th>
                  <th className="w-20">오늘 점프</th>
                  <th className="w-24">가입일</th>
                  <th className="w-20">관리</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <SupplierLine key={s.id} s={s} grades={grades} defaultGrade={defaultGrade} />
                ))}
              </tbody>
            </table>
            {shown.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 공급사가 없어요.</p> : null}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            회원등급처럼 공급사 등급을 만들고, 등급마다 <b className="text-foreground">하루 점프 개수</b>(추천 제품 / 일반 제품)를 정해요. 점프 0개 등급은 점프
            기능이 없어요. <b className="text-foreground">기본 등급</b>은 새로 입점한 공급사와 유료 기간이 끝난 공급사가 받는 등급이에요.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs text-muted-foreground [&>th]:px-1.5 [&>th]:py-2 [&>th]:font-medium">
                  <th className="w-24">코드</th>
                  <th className="w-40">이름</th>
                  <th className="w-12">유료</th>
                  <th className="w-20">추천 점프</th>
                  <th className="w-20">일반 점프</th>
                  <th className="w-14">하루 합계</th>
                  <th>설명</th>
                  <th className="w-16">순서</th>
                  <th className="w-12">기본</th>
                  <th className="w-14">공급사</th>
                  <th className="w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <GradeLine key={`${g.id}-${g.is_default}`} grade={g} count={counts.get(g.id) ?? 0} />
                ))}
                <GradeLine key="new" />
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
