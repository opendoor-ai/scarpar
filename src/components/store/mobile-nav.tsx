'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { MenuItem } from '@/types/db'

import { resolveMenuHref } from './store-links'

export function MobileNav({
  orgSlug,
  menuItems,
  storeName,
}: {
  orgSlug: string
  menuItems: MenuItem[]
  storeName: string
}) {
  const [open, setOpen] = useState(false)
  if (menuItems.length === 0) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="메뉴 열기"
          className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent md:hidden"
        >
          <Menu className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-3/4 sm:max-w-xs">
        <SheetHeader>
          <SheetTitle>{storeName}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 pb-4">
          {menuItems.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={resolveMenuHref(orgSlug, item.href)}
                className="rounded-md px-2 py-2.5 text-sm text-foreground hover:bg-accent"
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
