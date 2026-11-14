'use client'

// 공급사 관리자 화면 틀 (카페24 공급사관리자페이지처럼)
// 짙은 남색 위쪽 띠 + 큰 메뉴(상점관리·상품관리·문의관리·디자인관리·광고·성과) + 왼쪽 세부 메뉴

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, LogOut, Menu, Monitor, Smartphone, X } from 'lucide-react'

import { NotificationsBell } from '@/components/admin/notifications-bell'
import { ThemeScript, ThemeToggle } from '@/components/admin/theme-toggle'
import { logoutAction } from '@/lib/actions/auth'
import { getIcon } from '@/lib/icon-map'
import { SUPPLIER_SECTIONS } from '@/lib/supplier-menu'
import { cn } from '@/lib/utils'

function itemPath(href: string) {
  return href.split('?')[0]
}

/** 지금 주소에 맞는 구역·메뉴 찾기 (가장 길게 맞는 주소) */
function findActive(pathname: string) {
  let best: { section: string; href: string; len: number } | null = null
  for (const sec of SUPPLIER_SECTIONS) {
    for (const it of sec.items) {
      const p = itemPath(it.href)
      const hit = p === '/admin' ? pathname === '/admin' : pathname === p || pathname.startsWith(`${p}/`)
      if (hit && (!best || p.length > best.len)) best = { section: sec.key, href: it.href, len: p.length }
    }
  }
  return best
}

export function SupplierShell({
  orgName,
  orgSlug,
  user,
  unreadCount,
  children,
}: {
  orgName: string
  orgSlug: string
  user: { name: string; email: string }
  unreadCount: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const active = findActive(pathname)
  const section = SUPPLIER_SECTIONS.find((s) => s.key === active?.section) ?? SUPPLIER_SECTIONS[0]
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const shopUrl = `/minishop/${orgSlug}`

  function openMobilePreview() {
    window.open(shopUrl, 'minishop-mobile', 'width=420,height=860,menubar=no,toolbar=no,location=no')
  }

  const subMenu = (
    <nav className="flex flex-col py-2">
      <p className="px-4 pt-2 pb-2 text-xs font-bold text-slate-500">{section.label}</p>
      {section.items.map((it) => {
        const on = active?.href === it.href
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'px-4 py-2 text-[13px] transition-colors',
              on ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 hover:text-indigo-600 dark:text-slate-300',
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <ThemeScript />
      <div className="flex h-dvh flex-col overflow-hidden bg-slate-100 dark:bg-background">
        {/* 위쪽 짙은 띠 */}
        <header className="shrink-0 bg-[#2d3a5f] text-white">
          <div className="flex h-12 items-center gap-3 px-4">
            <button type="button" className="md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="메뉴 열기">
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/admin" className="text-lg font-bold italic tracking-tight">
              공급사관리자페이지
            </Link>
            <span className="hidden truncate text-xs text-white/60 sm:inline">{orgName}</span>
            <div className="ml-auto flex items-center gap-1 [&_button]:text-white [&_button:hover]:bg-white/10">
              <NotificationsBell initialUnreadCount={unreadCount} />
              <ThemeToggle />
              <span className="mx-1 hidden max-w-40 truncate text-xs text-white/70 sm:inline" title={user.email}>
                {user.name}
              </span>
              <button
                type="button"
                onClick={() => void logoutAction()}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/10"
                title="로그아웃"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
          {/* 큰 메뉴 */}
          <nav className="flex overflow-x-auto px-2 [scrollbar-width:none] md:px-4">
            {SUPPLIER_SECTIONS.map((sec) => {
              const Icon = getIcon(sec.icon)
              const on = sec.key === section.key
              return (
                <Link
                  key={sec.key}
                  href={sec.items[0].href}
                  className={cn(
                    'flex min-w-24 shrink-0 flex-col items-center gap-1 px-4 py-2.5 text-[12px] font-semibold transition-colors md:min-w-32',
                    on ? 'bg-indigo-500 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="size-4" />
                  {sec.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* 왼쪽 세부 메뉴 */}
          <aside
            className={cn(
              'w-48 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-border dark:bg-card',
              mobileOpen ? 'fixed inset-y-0 top-[104px] left-0 z-30 flex shadow-xl' : 'hidden md:flex',
            )}
          >
            {/* 내 미니샵 + PC·모바일 미리보기 */}
            <div className="flex items-center gap-1 border-b border-slate-200 p-2 dark:border-border">
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener"
                className="flex min-w-0 flex-1 items-center gap-1 rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-border"
                title="내 미니샵 열기"
              >
                <span className="truncate">내 미니샵</span>
                <ExternalLink className="ml-auto size-3 shrink-0 text-slate-400" />
              </a>
              <a href={shopUrl} target="_blank" rel="noopener" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-muted" title="PC 화면으로 보기">
                <Monitor className="size-4" />
              </a>
              <button type="button" onClick={openMobilePreview} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-muted" title="모바일 화면으로 보기">
                <Smartphone className="size-4" />
              </button>
            </div>
            {subMenu}
            <div className="mt-auto border-t border-slate-200 p-3 text-[11px] leading-relaxed text-slate-500 dark:border-border">
              <p className="font-semibold text-slate-700 dark:text-slate-300">{orgName}</p>
              <p className="truncate">{shopUrl}</p>
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
