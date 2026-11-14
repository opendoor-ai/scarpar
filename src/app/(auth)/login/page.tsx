import type { Metadata } from 'next'

import type { PageProps } from '@/lib/types'

import { LoginForm } from '../_components/login-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '로그인 — 전자동기계광고' }

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? params.next : undefined
  // 주소에 들어온 글을 그대로 보여주지 않고 정해진 안내만 표시 (가짜 안내문 방지)
  const error = params.error ? '간편로그인이 취소되었거나 실패했습니다. 다시 시도해 주세요.' : undefined

  return <LoginForm next={next} initialError={error} />
}
