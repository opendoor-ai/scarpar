// 콘텐츠 관리 (플랫폼 관리자 전용) — 쇼츠 영상 · 블로그 글 · 매거진

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { ContentsManager, type ContentRow } from '@/modules/contents/components/contents-manager'

export const dynamic = 'force-dynamic'

export default async function ContentsPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()

  const { data, error } = await getAdminClient()
    .from('site_contents')
    .select('*, product:products(product_no, name)')
    .order('kind')
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(500)
  if (error) console.error('[contents] read failed:', error.message)

  // 블로그에 연결한 제품 번호들 (0030 product_ids → "10001, 10004")
  const raw = (data ?? []) as unknown as (ContentRow & { product_ids?: string[] | null })[]
  const allIds = [...new Set(raw.flatMap((r) => r.product_ids ?? []))]
  const noById = new Map<string, number>()
  if (allIds.length > 0) {
    const { data: prows } = await getAdminClient().from('products').select('id, product_no').in('id', allIds)
    for (const p of (prows ?? []) as { id: string; product_no: number }[]) noById.set(p.id, p.product_no)
  }
  const rows: ContentRow[] = raw.map((r) => ({
    ...r,
    product_nos_text: (r.product_ids ?? [])
      .map((id) => noById.get(id))
      .filter(Boolean)
      .join(', '),
  }))

  return (
    <div>
      <PageHeader title="콘텐츠 관리" description="메인 화면의 쇼츠 영상, 블로그 글, 매거진을 관리합니다." />
      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          콘텐츠 표가 아직 없어요. Supabase SQL 편집기에서 <code>0018_main_hubs.sql</code>을 먼저 실행해 주세요.
        </p>
      ) : (
        <ContentsManager rows={rows} />
      )}
    </div>
  )
}
