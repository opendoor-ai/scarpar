'use client'

import { Menu, Monitor, Search, Smartphone } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationsBell } from '@/components/admin/notifications-bell'
import { ThemeToggle } from '@/components/admin/theme-toggle'
// A1 slice owns src/lib/actions/auth.ts (logoutAction) — landing by integration time.
import { logoutAction } from '@/lib/actions/auth'
import type { Role } from '@/types/db'

interface TopbarProps {
  orgName: string
  user: { name: string; email: string }
  role: Role
  unreadCount: number
  onMenuClick: () => void
  onSearchClick: () => void
}

function initialsOf(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || 'U'
}

export function Topbar({ orgName, user, role, unreadCount, onMenuClick, onSearchClick }: TopbarProps) {
  function handleLogout() {
    // logoutAction redirects to /login on success — fire and forget.
    void logoutAction()
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="메뉴 열기"
        >
          <Menu className="size-4" />
        </Button>
        <span className="truncate text-sm font-medium text-foreground">{orgName}</span>
        {/* 사이트 바로 보기: PC 화면(새 탭) · 모바일 화면(휴대폰 크기 창) */}
        <span className="ml-2 flex items-center gap-0.5 border-l border-border pl-2">
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="PC 화면으로 보기"
            aria-label="PC 화면으로 보기"
          >
            <Monitor className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => window.open('/', 'site-mobile', 'width=420,height=860,menubar=no,toolbar=no,location=no')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="모바일 화면으로 보기"
            aria-label="모바일 화면으로 보기"
          >
            <Smartphone className="size-4" />
          </button>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onSearchClick}
          className="hidden gap-2 text-muted-foreground sm:flex"
        >
          <Search className="size-3.5" />
          <span className="text-xs">검색</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="sm:hidden"
          aria-label="검색"
        >
          <Search className="size-4" />
        </Button>

        <NotificationsBell initialUnreadCount={unreadCount} />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-7">
              <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                {role}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>로그아웃</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
