// 미니샵 배너 — 공급사가 자기 미니샵 홈 맨 위에 보여줄 배너 (PC/모바일, 기간, 순서)

import { storePath } from '@/components/store/store-links'
import Link from 'next/link'

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { StoreBannersManager, type StoreBannerRow } from '@/modules/storefront/components/store-banners-manager'

export const dynamic = 'force-dynamic'

export default async function StoreBannersPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'cms')

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('store_banners')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) console.error('[store banners] read failed:', error.message)

  return (
    <div>
      <PageHeader
        title="미니샵 배너"
        description="우리 미니샵 첫 화면 맨 위에 보여줄 배너를 관리합니다. 여러 개면 5초마다 넘어가요."
        actions={
          <Link href={storePath(ctx.org.slug)} target="_blank" className="text-sm text-muted-foreground hover:underline">
            미니샵 열기 ↗
          </Link>
        }
      />
      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          배너 표가 아직 없어요. Supabase SQL 편집기에서 <code>0014_store_banners.sql</code>을 먼저 실행해 주세요.
        </p>
      ) : (
        <StoreBannersManager banners={(data ?? []) as StoreBannerRow[]} nowIso={new Date().toISOString()} />
      )}
    </div>
  )
}
