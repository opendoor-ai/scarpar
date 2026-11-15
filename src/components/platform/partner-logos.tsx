// 함께하는 공급사 — 바닥글 바로 위, 로고 카드가 가로 한 줄로 끊김 없이 흘러가요 (마우스를 올리면 멈춤)
// 카드: 위쪽 로고 · 아래쪽 공급사명(한글)과 영문명
// 내용: ① 배너 관리 [메인] 오토 스크롤 배너(광고, 먼저) ② 로고를 올린 입점 공급사 (자동 연동)

import Link from 'next/link'

import { AdLink } from '@/components/platform/ad-link'

export interface PartnerItem {
  key: string
  href: string
  image: string
  name: string
  sub: string
  /** 배너 광고면 노출·클릭을 기록 */
  bannerId?: string
}

const CARD_W = 220 // 카드 너비(px)

export function PartnerLogos({ items }: { items: PartnerItem[] }) {
  if (items.length === 0) return null
  // 화면 폭(최대 약 2000px)보다 한 묶음이 길어야 끊김이 없어서, 적으면 여러 번 이어 붙여요
  const repeat = Math.max(1, Math.ceil(2200 / (items.length * (CARD_W + 16))))
  const one = Array.from({ length: repeat }, () => items).flat()
  const seconds = Math.max(30, one.length * 4) // 카드가 많을수록 천천히

  const card = (it: PartnerItem, i: number) => {
    const body = (
      <>
        <span className="flex h-28 items-center justify-center px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.image} alt={it.name} className="max-h-full max-w-full object-contain" loading="lazy" />
        </span>
        <span className="flex flex-col items-center gap-0.5 border-t border-border px-3 py-3 text-center">
          <span className="w-full truncate text-sm font-medium text-neutral-900">{it.name}</span>
          {it.sub ? <span className="w-full truncate text-xs text-neutral-500">{it.sub}</span> : null}
        </span>
      </>
    )
    const cls = 'group flex shrink-0 flex-col overflow-hidden border border-border bg-white transition-colors hover:border-foreground/60'
    return it.bannerId ? (
      <AdLink key={`${it.key}-${i}`} bannerId={it.bannerId} href={it.href} title={it.name} className={cls} style={{ width: CARD_W }}>
        {body}
      </AdLink>
    ) : (
      <Link key={`${it.key}-${i}`} href={it.href} title={`${it.name} 미니샵`} className={cls} style={{ width: CARD_W }}>
        {body}
      </Link>
    )
  }

  return (
    <section aria-label="함께하는 공급사" className="mt-14 border-t border-border bg-background py-8">
      <div className="mx-auto mb-5 flex max-w-6xl items-end justify-between px-4 sm:px-6">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-primary">PARTNERS</p>
          <h2 className="text-lg font-extrabold sm:text-xl">함께하는 공급사</h2>
        </div>
        <Link href="/suppliers" className="text-sm text-muted-foreground hover:text-foreground">
          전체 공급사 보기 →
        </Link>
      </div>
      <div className="overflow-hidden">
        {/* 같은 묶음을 두 번 이어 붙이고 절반만큼 움직여서 끊김 없이 이어져요 */}
        <div className="jadong-marquee flex w-max gap-4" style={{ animationDuration: `${seconds}s` }}>
          {[...one, ...one].map(card)}
        </div>
      </div>
    </section>
  )
}
