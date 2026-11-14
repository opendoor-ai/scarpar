import type { Metadata } from 'next'

import { ResetPasswordForm } from '../_components/reset-password-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '새 비밀번호 설정 — 전자동기계광고' }

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
