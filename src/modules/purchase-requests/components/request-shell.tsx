// 구매문의 화면 공통 틀 — 위쪽 큰 띠 + 왼쪽 안내(장점·이용 순서) + 오른쪽 본문

import Link from 'next/link'
import {
  Calculator,
  ClipboardList,
  MessagesSquare,
  PhoneCall,
  PlusCircle,
  Scale,
  Smartphone,
  UserRoundCheck,
} from 'lucide-react'

const BENEFITS = [
  { icon: Calculator, title: '무료 견적', text: '필요한 제품의 견적을 무료로 받아볼 수 있어요.' },
  { icon: Scale, title: '비교 견적', text: '여러 공급사의 견적을 비교해 합리적으로 구매해요.' },
  { icon: Smartphone, title: 'PC·모바일', text: '언제 어디서나 손쉽게 문의를 남길 수 있어요.' },
  { icon: UserRoundCheck, title: '회원가입 없이', text: '비회원도 연락처만 남기면 바로 등록돼요.' },
]

const STEPS = [
  { icon: ClipboardList, title: '문의 등록', text: '찾는 제품과 연락처를 남겨요.' },
  { icon: MessagesSquare, title: '공급사 확인', text: '입점 공급사가 문의를 확인해요.' },
  { icon: PhoneCall, title: '상담·견적', text: '공급사가 전화·문자로 연락드려요.' },
  { icon: Scale, title: '비교·구매', text: '견적을 비교하고 직접 거래해요.' },
]

export function RequestShell({
  title,
  description,
  showRegister = true,
  children,
}: {
  title: string
  description: string
  showRegister?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      {/* 위쪽 큰 띠 */}
      <div className="absolute inset-x-0 top-0 -z-0 h-72 bg-[linear-gradient(120deg,#0f172a_0%,#1e293b_55%,#334155_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.10),transparent_45%)]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
          {showRegister ? (
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-bold text-white shadow hover:bg-red-700"
            >
              <PlusCircle className="size-4" />
              구매문의 등록
            </Link>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium text-slate-200 sm:text-base">{description}</p>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* 왼쪽 안내 */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-32 lg:w-[360px] lg:shrink-0">
            <section className="rounded-lg border border-border bg-card shadow-sm">
              <h2 className="border-b border-border px-5 py-4 text-sm font-bold">구매문의란?</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 p-5">
                {BENEFITS.map((b) => (
                  <div key={b.title} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <b.icon className="size-5" />
                    </span>
                    <p className="text-sm font-semibold">{b.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{b.text}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="hidden rounded-lg border border-border bg-card shadow-sm lg:block">
              <h2 className="border-b border-border px-5 py-4 text-sm font-bold">이용 순서</h2>
              <ol className="flex flex-col gap-4 p-5">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex items-start gap-3">
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary">
                      <s.icon className="size-4" />
                      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{s.title}</span>
                      <span className="text-xs text-muted-foreground">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>

          {/* 본문 */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function SafetyNotice() {
  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-5 text-xs leading-relaxed text-muted-foreground">
      <p className="text-sm font-semibold text-foreground">낯선 번호로 연락이 올 수 있어요.</p>
      <p className="mt-1">공급사가 050·070 같은 번호로 연락할 수 있어요. 놀라지 말고 연락을 받아 주세요.</p>
      <p className="mt-3 text-sm font-semibold text-foreground">거래 전 꼭 확인하세요.</p>
      <p className="mt-1">
        구매문의로 연결된 거래의 당사자는 고객과 공급사예요. 선입금 요구, 시세보다 지나치게 싼 가격은 주의하고, 가능하면
        기계를 직접 보고 거래하세요.
      </p>
    </div>
  )
}
