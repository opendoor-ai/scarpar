'use client'

// 공급사 로그인 계정 관리 (메인 관리자) — 공급사가 직접 로그인할 계정 추가·비밀번호 변경·빼기

import { useCallback, useEffect, useState, useTransition } from 'react'
import { KeyRound, Loader2, UserPlus, UserX } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'

import {
  addSupplierAccountAction,
  listSupplierAccountsAction,
  removeSupplierAccountAction,
  resetSupplierPasswordAction,
  type SupplierAccount,
} from '../actions'

const ROLE_LABEL: Record<string, string> = {
  owner: '대표',
  admin: '관리자',
  manager: '매니저',
  staff: '직원',
  rider: '배송기사',
  viewer: '보기 전용',
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }) : '로그인한 적 없음'
}

export function SupplierAccounts({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [list, setList] = useState<SupplierAccount[] | null>(null)
  const [pending, start] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'owner' | 'admin' | 'manager' | 'staff'>('owner')
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')

  const load = useCallback(() => {
    start(async () => {
      const res = await listSupplierAccountsAction(orgId)
      if (res.ok) setList(res.data ?? [])
      else toast.error(res.error)
    })
  }, [orgId])
  useEffect(() => load(), [load])

  function add() {
    start(async () => {
      const res = await addSupplierAccountAction({ orgId, email, password, role })
      if (!res.ok) return void toast.error(res.error)
      toast.success(res.data?.created ? '새 로그인 계정을 만들었어요' : '이미 가입한 계정을 이 공급사에 연결했어요')
      setEmail('')
      setPassword('')
      load()
    })
  }

  const loginUrl = `/minishop/${orgSlug}/admin`

  return (
    <div className="flex flex-col gap-3 text-xs">
      <p className="leading-relaxed text-muted-foreground">
        공급사가 직접 로그인할 계정이에요. 공급사는 <b className="text-foreground">로그인 화면</b>이나{' '}
        <b className="text-foreground">{loginUrl}</b> 주소로 들어와 자기 공급사 관리자 화면(상품·미니샵·문의 등)을 써요.
      </p>

      {list === null ? (
        <p className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          불러오는 중…
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-muted-foreground">아직 로그인 계정이 없어요. 아래에서 추가하세요.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background">
          {list.map((a) => (
            <li key={a.userId} className="flex flex-col gap-2 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{a.email}</span>
                <span className="rounded bg-muted px-1.5 py-px">{ROLE_LABEL[a.role] ?? a.role}</span>
                <span className="text-muted-foreground">최근 로그인: {fmt(a.lastSignInAt)}</span>
                <span className="ml-auto flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResetFor(resetFor === a.userId ? null : a.userId); setNewPw('') }}>
                    <KeyRound className="size-3" />
                    비밀번호 변경
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600">
                        <UserX className="size-3" />
                        빼기
                      </Button>
                    }
                    title={`${a.email} 계정을 이 공급사에서 뺄까요?`}
                    description="이 계정은 더 이상 이 공급사 관리자 화면에 들어올 수 없어요. 계정 자체는 지워지지 않아요."
                    confirmLabel="빼기"
                    destructive
                    onConfirm={() =>
                      start(async () => {
                        const res = await removeSupplierAccountAction(orgId, a.userId)
                        if (!res.ok) return void toast.error(res.error)
                        toast.success('계정을 뺐어요')
                        load()
                      })
                    }
                  />
                </span>
              </div>
              {resetFor === a.userId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호 (8자 이상)" autoComplete="new-password" className="h-8 w-56 bg-background" />
                  <Button
                    size="sm"
                    disabled={pending || newPw.length < 8}
                    onClick={() =>
                      start(async () => {
                        const res = await resetSupplierPasswordAction(orgId, a.userId, newPw)
                        if (!res.ok) return void toast.error(res.error)
                        toast.success('비밀번호를 바꿨어요. 공급사에 새 비밀번호를 알려 주세요.')
                        setResetFor(null)
                        setNewPw('')
                      })
                    }
                  >
                    저장
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-background p-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="font-medium">로그인 이메일</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@example.com" autoComplete="off" className="h-8" />
        </label>
        <label className="flex w-48 flex-col gap-1">
          <span className="font-medium">초기 비밀번호 (새 계정일 때)</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" autoComplete="new-password" className="h-8" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">권한</span>
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="owner">대표 (모든 기능)</option>
            <option value="admin">관리자</option>
            <option value="manager">매니저 (상품·주문)</option>
            <option value="staff">직원</option>
          </select>
        </label>
        <Button size="sm" disabled={pending || !email} onClick={add}>
          <UserPlus className="size-3.5" />
          계정 추가
        </Button>
      </div>
      <p className="text-muted-foreground">
        이미 가입한 이메일이면 비밀번호는 그대로 두고 이 공급사에 연결만 해요. 처음 보는 이메일이면 새 계정을 만들어요. 만든 뒤 이메일·초기 비밀번호를 공급사에 알려
        주고, 로그인 후 비밀번호를 바꾸도록 안내하세요.
      </p>
    </div>
  )
}
