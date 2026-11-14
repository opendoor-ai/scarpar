import type { Metadata } from 'next'

import type { PageProps } from '@/lib/types'

import { SignupForm } from '../_components/signup-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '회원가입 — 전자동기계광고' }

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? params.next : undefined

  return <SignupForm next={next} />
}
