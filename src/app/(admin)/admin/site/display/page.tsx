// 상품정보표시 설정 — 메인 관리자 전용

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { DisplaySettingsForm } from '@/modules/site-config/components/display-settings-form'
import { getSiteConfig } from '@/modules/site-config/get'

export const dynamic = 'force-dynamic'

export default async function DisplaySettingsPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()
  const { display } = await getSiteConfig()
  return (
    <div>
      <PageHeader title="상품정보표시 설정" description="상품 카드와 상품 상세 정보표에서 어떤 항목을 보여줄지 정해요." />
      <DisplaySettingsForm initial={display} />
    </div>
  )
}
