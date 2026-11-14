// 바로가기 설정 (홈 화면 앱) — 메인 관리자 전용

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { AppSettingsForm } from '@/modules/site-config/components/app-settings-form'
import { getSiteConfig } from '@/modules/site-config/get'

export const dynamic = 'force-dynamic'

export default async function AppSettingsPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()
  const { app } = await getSiteConfig()
  return (
    <div>
      <PageHeader title="바로가기 설정" description="휴대폰 홈 화면에 앱처럼 추가될 때의 이름·색·아이콘을 정해요." />
      <AppSettingsForm initial={app} domain={env.APP_URL} />
    </div>
  )
}
