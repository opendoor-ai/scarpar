// 도메인 안내 — 메인 관리자 전용 (도메인 연결은 Vercel·도메인 회사에서 해요)

import { notFound } from 'next/navigation'
import { Globe, Lock, ShieldCheck } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { isPlatformAdmin } from '@/lib/platform-admin'

export const dynamic = 'force-dynamic'

export default async function DomainPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()
  const url = env.APP_URL.replace(/\/+$/, '')
  const https = url.startsWith('https://')
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader title="도메인 안내" description="사이트 주소(도메인)와 보안 접속(SSL) 상태를 확인해요." />

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-[15px] font-bold">나의 사이트 주소</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[140px_1fr]">
          <span className="text-muted-foreground">현재 대표 주소</span>
          <a href={url} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">
            {url}
          </a>
          <span className="text-muted-foreground">보안 접속(SSL)</span>
          <span className={https ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
            {https ? '사용 중 (https)' : '아직 아니에요 — 배포 후 https 주소로 바꿔 주세요'}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          대표 주소는 <code>.env</code>의 <code>NEXT_PUBLIC_APP_URL</code> 값이에요. 검색엔진 사이트맵·공유 링크·바로가기에 모두 이 주소가 쓰여요. 배포 후 실제 도메인(예:
          https://jadong.co.kr)으로 바꿔야 검색에 잘 나와요.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-[15px] font-bold">도메인 연결 방법 (Vercel)</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
          <li>Vercel 프로젝트 → Settings → Domains 에서 도메인(예: jadong.co.kr)을 추가해요.</li>
          <li>도메인을 산 회사(가비아·후이즈 등) 관리 화면에서 Vercel이 알려주는 값(A 레코드 또는 CNAME)을 넣어요.</li>
          <li>몇 분~몇 시간 뒤 연결되면 Vercel이 보안 인증서(SSL)를 무료로 자동 발급해요.</li>
          <li>
            <code>NEXT_PUBLIC_APP_URL</code>을 새 주소로 바꾸고 다시 배포해요. 자세한 순서는 <code>docs/배포-안내.md</code>를 보세요.
          </li>
          <li>구글 서치콘솔·네이버 서치어드바이저에 새 주소를 등록하고 사이트맵(<code>/sitemap.xml</code>)을 제출해요.</li>
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [Globe, '도메인이란?', '방문자가 사이트에 들어올 때 쓰는 고유한 주소예요. 짧고 기억하기 쉬운 주소가 검색·광고에 유리해요.'],
          [Lock, '보안 서버(SSL)', '고객 정보를 다루는 사이트는 https 보안 접속이 필수예요. Vercel이 무료로 자동 적용해요.'],
          [ShieldCheck, '검색엔진 등록', '도메인을 바꾸면 서치콘솔·서치어드바이저에 다시 등록하고 사이트맵을 제출하세요.'],
        ].map(([Icon, title, body]) => {
          const I = Icon as typeof Globe
          return (
            <div key={title as string} className="rounded-lg border border-border bg-card p-4">
              <I className="size-5 text-primary" />
              <p className="mt-2 text-sm font-semibold">{title as string}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body as string}</p>
            </div>
          )
        })}
      </section>
    </div>
  )
}
