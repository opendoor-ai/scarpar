// 광고 관리 (플랫폼 관리자 전용) — 배너 광고 · 유료 상단 노출 · 배너 성과

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import { AdsManager, type BannerRow, type PromotionRow } from '@/modules/ads/components/ads-manager'

export const dynamic = 'force-dynamic'

const DAY = 24 * 60 * 60 * 1000

export default async function AdsPage() {
  await requireUser()
  const supabase = await getServerClient()
  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
  if (!isPlatformAdmin) notFound()

  const admin = getAdminClient()
  const now = new Date()
  const [bannersRes, promotionsRes, orgsRes, statsRes, categories] = await Promise.all([
    admin.from('banner_ads').select('*').order('created_at', { ascending: false }).limit(300),
    admin
      .from('product_promotions')
      .select('*, product:products(name, product_no), org:orgs(name, slug)')
      .order('created_at', { ascending: false })
      .limit(300),
    admin.from('orgs').select('id, name').eq('is_active', true).order('name'),
    supabase.rpc('banner_event_summary', {
      p_from: new Date(now.getTime() - 30 * DAY).toISOString(),
      p_to: now.toISOString(),
    }),
    getPlatformCategories(),
  ])
  const setupError = bannersRes.error ?? promotionsRes.error
  if (setupError) console.error('[ads] read failed:', setupError.message)

  const stats = new Map(
    ((statsRes.data ?? []) as { banner_id: string; impressions: number; clicks: number }[]).map((s) => [
      s.banner_id,
      { impressions: Number(s.impressions), clicks: Number(s.clicks) },
    ]),
  )
  const banners: BannerRow[] = ((bannersRes.data ?? []) as Omit<BannerRow, 'impressions' | 'clicks'>[]).map((b) => ({
    ...b,
    impressions: stats.get(b.id)?.impressions ?? 0,
    clicks: stats.get(b.id)?.clicks ?? 0,
  }))
  const promotions = (promotionsRes.data ?? []) as unknown as PromotionRow[]

  // 카테고리 선택지: "1차 › 2차"
  const byId = new Map(categories.map((c) => [c.id, c]))
  const categoryOptions = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : undefined
      return { id: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name, root: parent?.name ?? c.name }
    })
    .sort((a, b) => a.root.localeCompare(b.root, 'ko') || a.label.localeCompare(b.label, 'ko'))
    .map(({ id, label }) => ({ id, label }))

  return (
    <div>
      <PageHeader
        title="광고 관리"
        description="배너 광고와 유료 상단 노출을 기간별로 등록합니다. 기간이 끝나면 자동으로 내려갑니다."
      />
      {setupError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          광고 표가 아직 없어요. Supabase SQL 편집기에서 <code>0013_ads.sql</code>을 먼저 실행해 주세요.
        </p>
      ) : (
        <AdsManager
          banners={banners}
          promotions={promotions}
          orgs={(orgsRes.data ?? []) as { id: string; name: string }[]}
          categories={categoryOptions}
          nowIso={now.toISOString()}
        />
      )}
    </div>
  )
}
