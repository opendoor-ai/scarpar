import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import type { ReactNode } from 'react'

/**
 * Centered minimal card layout for every (auth) route (login, signup,
 * forgot-password, invite/[token]) — docs/design-system.md: onboarding/pre-admin
 * screens are the one place a centered, spacious layout is appropriate (the
 * dense left-nav shell is reserved for the admin, per design-system §f/10).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted px-4 py-12">
      <Link
        href="/products"
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        {SITE_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
