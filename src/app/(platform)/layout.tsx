// 플랫폼(전자동기계광고) 공통 화면 틀 — 통합 제품 검색 등 모든 공급사를 아우르는 페이지용

import Link from 'next/link'

import { SITE_NAME } from '@/lib/site'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/products" className="text-base font-bold tracking-tight">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/products" className="hover:text-foreground">
              전체 카테고리
            </Link>
            <Link href="/login" className="hover:text-foreground">
              공급사 로그인
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:px-6">
          <p className="text-sm font-semibold text-foreground">{SITE_NAME}</p>
          <p>
            {SITE_NAME}는 통신판매중개자이며, 개별 거래의 당사자가 아닙니다. 상품 정보, 거래 조건 및 거래에 대한 책임은
            해당 공급사에 있습니다.
          </p>
        </div>
      </footer>
    </div>
  )
}
