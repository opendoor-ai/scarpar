'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/admin/sidebar'
import { Topbar } from '@/components/admin/topbar'
import { ThemeScript } from '@/components/admin/theme-toggle'
import { CommandPalette } from '@/components/admin/command-palette'
import { SupplierShell } from '@/components/admin/supplier-shell'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { NavItem } from '@/lib/modules'
import type { Org, Role } from '@/types/db'

const SIDEBAR_COLLAPSE_KEY = 'jadong-sidebar-collapsed'

interface AdminShellProps {
  mode?: 'main' | 'supplier'
  org: Org
  role: Role
  nav: { main: NavItem[]; core: NavItem[] }
  orgs: { id: string; name: string }[]
  user: { name: string; email: string }
  unreadCount: number
  children: React.ReactNode
}

export function AdminShell({ mode = 'main', org, role, nav, orgs, user, unreadCount, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1')
    } catch {
      // localStorage unavailable — default to expanded.
    }
    setHydrated(true)
  }, [])

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // ignore — nothing to persist to
      }
      return next
    })
  }, [])

  const enabledModules = React.useMemo(() => new Set(org.enabled_modules), [org.enabled_modules])
  const isCollapsed = hydrated && collapsed

  // 공급사 관리자: 카페24 공급사관리자페이지 같은 전용 화면 틀
  if (mode === 'supplier') {
    return (
      <SupplierShell orgName={org.name} orgSlug={org.slug} user={user} unreadCount={unreadCount}>
        {children}
      </SupplierShell>
    )
  }

  return (
    <>
      <ThemeScript />
      <div className="flex h-dvh overflow-hidden bg-background">
        <aside
          className={cn(
            'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-150 md:flex',
            isCollapsed ? 'w-16' : 'w-[232px]',
          )}
        >
          <Sidebar
            mode={mode}
            org={org}
            orgs={orgs}
            nav={nav}
            collapsed={isCollapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[232px] p-0 sm:max-w-[232px]">
            <SheetTitle className="sr-only">메뉴</SheetTitle>
            <SheetDescription className="sr-only">관리자 메뉴</SheetDescription>
            <Sidebar mode={mode} org={org} orgs={orgs} nav={nav} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            orgName={org.name}
            user={user}
            role={role}
            unreadCount={unreadCount}
            onMenuClick={() => setMobileOpen(true)}
            onSearchClick={() => setCommandOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        nav={nav}
        enabledModules={enabledModules}
      />
    </>
  )
}
