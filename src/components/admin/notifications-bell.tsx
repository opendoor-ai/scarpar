'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { listNotificationsAction, markAllReadAction } from '@/lib/actions/notifications'
import type { AppNotification } from '@/types/db'

const ITEM_CLASS =
  'flex flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-accent'

interface NotificationsBellProps {
  initialUnreadCount: number
}

export function NotificationsBell({ initialUnreadCount }: NotificationsBellProps) {
  const [open, setOpen] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [items, setItems] = React.useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount)

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next || loaded) return

    setLoading(true)
    const result = await listNotificationsAction()
    if (result.ok) setItems(result.data ?? [])
    setLoaded(true)
    setLoading(false)
  }

  async function handleMarkAllRead() {
    const previous = items
    const now = new Date().toISOString()
    setItems((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)

    const result = await markAllReadAction()
    if (!result.ok) {
      setItems(previous)
      setUnreadCount(initialUnreadCount)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="알림">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium text-foreground">알림</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline"
            >
              모두 읽음 처리
            </button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground">불러오는 중…</div>
          ) : items.length === 0 ? (
            <EmptyState icon={Bell} title="새 알림이 없습니다" className="py-8" />
          ) : (
            items.map((item) => {
              const body = (
                <>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  {item.body && (
                    <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                  )}
                  <span className="text-2xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </>
              )
              const className = cn(ITEM_CLASS, !item.read_at && 'bg-muted/50')

              return item.link ? (
                <Link key={item.id} href={item.link} onClick={() => setOpen(false)} className={className}>
                  {body}
                </Link>
              ) : (
                <div key={item.id} className={className}>
                  {body}
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
