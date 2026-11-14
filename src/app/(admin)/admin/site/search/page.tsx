// 상품검색 설정 — 메인 관리자 전용

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { SearchSettingsForm } from '@/modules/site-config/components/search-settings-form'
import { getSiteConfig } from '@/modules/site-config/get'

export const dynamic = 'force-dynamic'

export default async function SearchSettingsPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()
  const [{ search }, { data }] = await Promise.all([
    getSiteConfig(),
    getAdminClient().from('orgs').select('name, slug').eq('is_active', true).order('name'),
  ])
  return (
    <div>
      <PageHeader title="상품검색 설정" description="위쪽 검색창의 검색 항목, 인기검색어, 홍보 문구를 정해요." />
      <SearchSettingsForm initial={search} suppliers={(data ?? []) as { name: string; slug: string }[]} />
    </div>
  )
}
