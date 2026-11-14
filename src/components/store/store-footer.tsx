import Link from 'next/link'
import { formatKrPhone, phoneDigits } from '@/lib/phone'
import { SITE_NAME } from '@/lib/site'

import type { MenuItem } from '@/types/db'

import type { StoreOrg } from './get-store-org'
import { resolveMenuHref } from './store-links'

export function StoreFooter({
  org,
  menuItems,
}: {
  org: Pick<StoreOrg, 'name' | 'slug' | 'phone' | 'email' | 'address'>
  menuItems: MenuItem[]
}) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">{org.name}</p>
            {org.address ? <p className="text-xs text-muted-foreground">{org.address}</p> : null}
            {org.phone ? (
              <a href={`tel:${phoneDigits(org.phone)}`} className="text-xs text-muted-foreground hover:underline">
                {formatKrPhone(org.phone)}
              </a>
            ) : null}
            {org.email ? <p className="text-xs text-muted-foreground">{org.email}</p> : null}
          </div>

          {menuItems.length > 0 ? (
            <nav className="flex flex-col gap-2 sm:items-end">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={resolveMenuHref(org.slug, item.href)}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="text-2xs border-t border-border pt-4 text-muted-foreground">
          <Link href="/products" className="hover:text-foreground">
            {SITE_NAME}에서 더 많은 산업기계 보기
          </Link>
        </div>
      </div>
    </footer>
  )
}
