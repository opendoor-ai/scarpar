// 사이트 설정 (플랫폼 관리자 전용) — 상단 알림 띠, 바닥글 사업자 정보

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getSiteSettings } from '@/lib/site-settings'
import { SiteSettingsForm } from '@/modules/contents/components/site-settings-form'

export const dynamic = 'force-dynamic'

export default async function SiteSettingsPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()
  const settings = await getSiteSettings()
  return (
    <div>
      <PageHeader title="사이트 설정" description="전자동기계광고 사이트 전체에 보이는 알림 띠와 바닥글 정보를 관리합니다." />
      <SiteSettingsForm initial={settings} />
    </div>
  )
}
