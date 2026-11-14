// 광고 관리 (플랫폼 관리자 전용) — 배너 관리(모든 배너를 그룹으로) · 유료 상단 노출

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireUser } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import { rowToItem, type BannerRowDb } from '@/modules/ads/banner-rows'
import type { BannerGroupRow, BannerItem } from '@/modules/ads/banner-types'
import { PromotionsTab, type PromotionRow } from '@/modules/ads/components/ads-manager'
import { BannerManager } from '@/modules/ads/components/banner-manager'

export const dynamic = 'force-dynamic'

const DAY = 24 * 60 * 60 * 1000

export default async function AdsPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()

  const admin = getAdminClient()
  const supabase = await getServerClient()
  const now = new Date()
  const [groupsRes, bannersRes, promotionsRes, orgsRes, statsRes, categories] = await Promise.all([
    admin.from('banner_groups').select('*').order('sort_order', { ascending: true }),
    admin.from('banner_ads').select('*').order('sort_order', { ascending: true }).limit(3000),
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

  const needsSql = Boolean(groupsRes.error)
  const groups = (groupsRes.data ?? []) as BannerGroupRow[]
  const bannersByGroup: Record<string, BannerItem[]> = {}
  for (const r of (bannersRes.data ?? []) as (BannerRowDb & { group_id: string | null })[]) {
    if (!r.group_id) continue
    ;(bannersByGroup[r.group_id] ??= []).push(rowToItem(r))
  }
  const stats = Object.fromEntries(
    ((statsRes.data ?? []) as { banner_id: string; impressions: number; clicks: number }[]).map((s) => [
      s.banner_id,
      { impressions: Number(s.impressions), clicks: Number(s.clicks) },
    ]),
  )

  // 카테고리 선택지: "1차 › 2차"
  const byId = new Map(categories.map((c) => [c.id, c]))
  const categoryOptions = categories
    .map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : undefined
      return { id: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'ko'))

  return (
    <div>
      <PageHeader
        title="광고 관리"
        description="사이트의 모든 배너를 그룹별로 관리합니다. 고친 뒤 [배너 저장]을 눌러야 반영돼요."
      />
      {needsSql ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          배너 그룹 표가 아직 없어요. Supabase SQL 편집기에서 <code>0020_banner_groups.sql</code>을 먼저 실행해 주세요.
        </p>
      ) : (
        <Tabs defaultValue="banners" className="gap-4">
          <TabsList>
            <TabsTrigger value="banners">배너 관리 ({groups.length}개 그룹)</TabsTrigger>
            <TabsTrigger value="promotions">상단 노출 ({(promotionsRes.data ?? []).length})</TabsTrigger>
          </TabsList>
          <TabsContent value="banners">
            <BannerManager
              groups={groups}
              bannersByGroup={bannersByGroup}
              stats={stats}
              orgs={(orgsRes.data ?? []) as { id: string; name: string }[]}
              categories={categoryOptions}
            />
          </TabsContent>
          <TabsContent value="promotions">
            <PromotionsTab promotions={(promotionsRes.data ?? []) as unknown as PromotionRow[]} nowIso={now.toISOString()} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
