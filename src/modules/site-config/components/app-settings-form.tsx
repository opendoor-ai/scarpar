'use client'

// 바로가기 설정 — 휴대폰 홈 화면에 앱처럼 추가할 때의 이름·색·아이콘 (카페24 바로가기 설정처럼)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { MediaPicker } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mediaUrl } from '@/lib/media-url'

import { saveSiteSectionAction } from '../actions'
import type { AppSettings } from '../schemas'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <h2 className="border-b border-border px-5 py-3.5 text-[15px] font-bold">{title}</h2>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col gap-1">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

export function AppSettingsForm({ initial, domain }: { initial: AppSettings; domain: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<AppSettings>(initial)
  const set = (patch: Partial<AppSettings>) => setV((p) => ({ ...p, ...patch }))

  function save() {
    start(async () => {
      const res = await saveSiteSectionAction('app', v)
      if (!res.ok) return void toast.error(res.error)
      toast.success('바로가기 설정을 저장했어요')
      router.refresh()
    })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <details className="rounded-lg border border-border bg-card px-5 py-3.5 text-sm">
        <summary className="cursor-pointer font-semibold">홈 바로가기란?</summary>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          고객이 휴대폰 브라우저에서 "홈 화면에 추가"를 누르면, 앱처럼 아이콘이 생기고 누르면 주소창 없이 사이트가 열려요. 아래 이름·색·아이콘이 그때 쓰여요.
          (아이폰: 사파리 공유 버튼 → 홈 화면에 추가 · 안드로이드: 크롬 메뉴 → 홈 화면에 추가)
        </p>
      </details>

      <Card title="홈 바로가기 설정">
        <Field label="홈 바로가기 사용">
          <div className="flex gap-4 text-sm">
            {[
              [true, '사용함'],
              [false, '사용안함'],
            ].map(([val, l]) => (
              <label key={String(val)} className="flex items-center gap-1.5">
                <input type="radio" checked={v.enabled === val} onChange={() => set({ enabled: val as boolean })} className="size-4 accent-primary" />
                {l as string}
              </label>
            ))}
          </div>
        </Field>
      </Card>

      <Card title="사용 도메인 확인">
        <Field label="현재 대표 도메인" hint="홈 바로가기는 https:// 로 열리는 주소에서만 쓸 수 있어요. 도메인은 사이트 설정 → 도메인 안내를 보세요.">
          <span className="text-sm font-medium">{domain}</span>
        </Field>
      </Card>

      <Card title="바로가기 · 화면 설정">
        <Field label="홈 화면 바로가기 이름" hint={`아이콘 아래 보이는 짧은 이름 (${v.shortName.length}/12자)`}>
          <Input value={v.shortName} onChange={(e) => set({ shortName: e.target.value })} maxLength={12} />
        </Field>
        <Field label="전체 이름" hint="설치 안내·시작 화면에 보이는 이름">
          <Input value={v.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} />
        </Field>
        <Field label="시작 화면 배경색">
          <div className="flex items-center gap-2">
            <input type="color" value={v.backgroundColor} onChange={(e) => set({ backgroundColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-input" aria-label="배경색" />
            <Input value={v.backgroundColor} onChange={(e) => set({ backgroundColor: e.target.value })} className="w-32 font-mono" />
          </div>
        </Field>
        <Field label="상단바 색상" hint="휴대폰 맨 위 상태바·주소창 색이에요.">
          <div className="flex items-center gap-2">
            <input type="color" value={v.themeColor} onChange={(e) => set({ themeColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-input" aria-label="상단바 색상" />
            <Input value={v.themeColor} onChange={(e) => set({ themeColor: e.target.value })} className="w-32 font-mono" />
          </div>
        </Field>
        <Field label="화면 타입">
          <div className="flex flex-col gap-1.5 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={v.display === 'standalone'} onChange={() => set({ display: 'standalone' })} className="size-4 accent-primary" />
              앱처럼 (주소창 없이)
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={v.display === 'browser'} onChange={() => set({ display: 'browser' })} className="size-4 accent-primary" />
              브라우저처럼 (주소창 보임)
            </label>
          </div>
        </Field>
      </Card>

      <Card title="홈 바로가기 및 시작 화면 아이콘">
        <Field label="아이콘" hint="512×512 PNG. 비우면 SEO 설정의 파비콘이 쓰여요.">
          <div className="flex items-center gap-3">
            {v.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(v.icon)} alt="" className="size-14 rounded-xl border border-border object-cover" />
            ) : null}
            <MediaPicker value={v.icon ? { id: '', path: v.icon } : null} onChange={(m) => set({ icon: m?.path ?? '' })} />
          </div>
        </Field>
      </Card>

      <div className="flex justify-center gap-2 pb-6">
        <Button asChild variant="outline">
          <a href="/manifest.webmanifest" target="_blank" rel="noopener">
            설정 파일 보기
          </a>
        </Button>
        <Button onClick={save} disabled={pending} className="w-28">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          저장
        </Button>
      </div>
    </div>
  )
}
