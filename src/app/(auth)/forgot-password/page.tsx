import type { Metadata } from 'next'

import type { PageProps } from '@/lib/types'

import { ForgotPasswordForm } from '../_components/forgot-password-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '비밀번호 찾기 — 전자동기계광고' }

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? params.next : undefined

  return <ForgotPasswordForm next={next} />
}
