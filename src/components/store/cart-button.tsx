'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

import { useCart } from './cart-context'
import { storePath } from './store-links'

export function CartButton({ orgSlug }: { orgSlug: string }) {
  const { count, mounted } = useCart()

  return (
    <Link
      href={storePath(orgSlug, '/cart')}
      aria-label="장바구니 보기"
      className="relative inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent"
    >
      <ShoppingBag className="size-4" />
      {mounted && count > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}
