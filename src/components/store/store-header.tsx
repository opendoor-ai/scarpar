import Link from 'next/link'
import { Search } from 'lucide-react'

import { mediaUrl } from '@/lib/media-url'
import type { MenuItem } from '@/types/db'

import { CartButton } from './cart-button'
import type { StoreOrg } from './get-store-org'
import { MobileNav } from './mobile-nav'
import { resolveMenuHref, storePath } from './store-links'

export function StoreHeader({
  org,
  menuItems,
}: {
  org: Pick<StoreOrg, 'name' | 'slug' | 'logo_path'>
  menuItems: MenuItem[]
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={storePath(org.slug)} className="flex min-w-0 items-center gap-2">
          {org.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(org.logo_path)}
              alt={org.name}
              className="h-7 w-auto shrink-0 rounded-sm object-contain"
            />
          ) : null}
          <span className="truncate text-base font-semibold">{org.name}</span>
        </Link>

        {menuItems.length > 0 ? (
          <nav className="hidden items-center gap-6 md:flex">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={resolveMenuHref(org.slug, item.href)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-1">
          <Link
            href={storePath(org.slug, '/products')}
            aria-label="제품 검색"
            className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent"
          >
            <Search className="size-4" />
          </Link>
          <CartButton orgSlug={org.slug} />
          <MobileNav orgSlug={org.slug} menuItems={menuItems} storeName={org.name} />
        </div>
      </div>
    </header>
  )
}
