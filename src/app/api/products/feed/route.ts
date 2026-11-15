// 메인 "전체제품 허브"의 분류 탭 · 더보기용 상품 목록 (공개 정보만)

import { NextResponse, type NextRequest } from 'next/server'

import { categoryWithDescendants } from '@/lib/category-tree'
import { getPlatformCategories, visibleCategories } from '@/lib/platform-categories'
import { fetchPlatformFeed } from '@/lib/platform-products'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const cate = sp.get('cate') ?? ''
  const offset = Math.max(0, Math.min(5000, Number(sp.get('offset')) || 0))
  const limit = Math.max(1, Math.min(30, Number(sp.get('limit')) || 15))

  let ids: string[] | null = null
  if (cate) {
    const cats = visibleCategories(await getPlatformCategories())
    const root = cats.find((c) => c.id === cate)
    if (!root) return NextResponse.json({ items: [], hasMore: false, total: 0 })
    ids = categoryWithDescendants(cats, root.id)
  }
  const feed = await fetchPlatformFeed(ids, offset, limit)
  return NextResponse.json(feed, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
}
