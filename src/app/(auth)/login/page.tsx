import type { Metadata } from 'next'

import type { PageProps } from '@/lib/types'

import { LoginForm } from '../_components/login-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '로그인 — Scarpar' }

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? params.next : undefined

  return <LoginForm next={next} />
}
