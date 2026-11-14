// 상품 목록 (카페24식) — 건수 요약 → 검색 조건 → 목록(선택·일괄 처리) → 쪽 번호

import Link from 'next/link'
import { ArrowUpToLine, FileUp, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { ProductCondition, ProductStatus } from '@/types/db'

import { getJumpStatus } from '@/modules/catalog/jump'
import { ProductList, type ProductListRow } from '@/modules/catalog/components/product-list'
import {
  ProductSearchPanel,
  type ProductSearchValues,
} from '@/modules/catalog/components/product-search-panel'

export const dynamic = 'force-dynamic'

const STATUSES: ProductStatus[] = ['active', 'draft', 'archived']
const FIELDS = ['all', 'name', 'code', 'model', 'brand'] as const
const SORTS = {
  display_desc: { column: 'display_at', ascending: false },
  created_desc: { column: 'created_at', ascending: false },
  created_asc: { column: 'created_at', ascending: true },
  updated_desc: { column: 'updated_at', ascending: false },
  name_asc: { column: 'name', ascending: true },
  price_desc: { column: 'price', ascending: false },
  price_asc: { column: 'price', ascending: true },
  no_desc: { column: 'product_no', ascending: false },
} as const
type SortKey = keyof typeof SORTS
const SIZES = [10, 20, 50, 100]

interface RawProductRow {
  id: string
  product_no: number
  name: string
  status: ProductStatus
  price: number
  condition: ProductCondition | null
  badges: string[] | null
  is_featured: boolean
  jumped_at: string | null
  model_name: string | null
  brand: string | null
  category_id: string | null
  track_stock: boolean
  stock_qty: number
  created_at: string
  updated_at: string
  product_images: { position: number; media: { path: string } | null }[]
}

function str(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** YYYY-MM-DD → 한국 시간 그날 0시 / 다음날 0시 */
function dayStart(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00+09:00` : null
}
function dayEnd(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const t = new Date(`${d}T00:00:00+09:00`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString()
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')
  const sp = await searchParams

  // ---- 검색 조건 읽기 ----
  const field = (FIELDS as readonly string[]).includes(str(sp.field)) ? (str(sp.field) as (typeof FIELDS)[number]) : 'all'
  const q = str(sp.q).replace(/[%,()]/g, ' ').slice(0, 60)
  const cate1 = str(sp.cate1)
  const cate2 = str(sp.cate2)
  const from = str(sp.from)
  const to = str(sp.to)
  const status = STATUSES.includes(str(sp.status) as ProductStatus) ? (str(sp.status) as ProductStatus) : str(sp.status) === 'soldout' ? 'soldout' : 'all'
  const cond = ['new', 'used'].includes(str(sp.cond)) ? str(sp.cond) : 'all'
  const sort: SortKey = str(sp.sort) in SORTS ? (str(sp.sort) as SortKey) : 'display_desc'
  const size = SIZES.includes(Number(sp.size)) ? Number(sp.size) : 20
  const page = Math.max(1, Number(str(sp.page)) || 1)

  const categories = await getPlatformCategories()
  const catById = new Map(categories.map((c) => [c.id, c]))
  const categoryIds = cate2
    ? [cate2]
    : cate1
      ? [cate1, ...categories.filter((c) => c.parent_id === cate1).map((c) => c.id)]
      : null

  const supabase = await getServerClient()

  // ---- 위쪽 건수 요약 ----
  const base = () => supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', ctx.org.id)
  const [cAll, cActive, cDraft, cArchived, cSoldout] = await Promise.all([
    base(),
    base().eq('status', 'active'),
    base().eq('status', 'draft'),
    base().eq('status', 'archived'),
    base().eq('track_stock', true).lte('stock_qty', 0),
  ])

  // ---- 목록 ----
  const spec = SORTS[sort]
  let query = supabase
    .from('products')
    .select(
      `id, product_no, name, status, price, condition, badges, is_featured, jumped_at, model_name, brand, category_id, track_stock, stock_qty, created_at, updated_at,
       product_images(position, media:media(path))`,
      { count: 'exact' },
    )
    .eq('org_id', ctx.org.id)
    .order(spec.column, { ascending: spec.ascending })
    .order('product_no', { ascending: false })
    .range((page - 1) * size, page * size - 1)

  if (status === 'soldout') query = query.eq('track_stock', true).lte('stock_qty', 0)
  else if (status !== 'all') query = query.eq('status', status)
  if (cond !== 'all') query = query.eq('condition', cond)
  if (categoryIds) query = query.in('category_id', categoryIds)
  const fromIso = dayStart(from)
  const toIso = dayEnd(to)
  if (fromIso) query = query.gte('created_at', fromIso)
  if (toIso) query = query.lt('created_at', toIso)
  if (q) {
    if (field === 'name') query = query.ilike('name', `%${q}%`)
    else if (field === 'model') query = query.ilike('model_name', `%${q}%`)
    else if (field === 'brand') query = query.ilike('brand', `%${q}%`)
    else if (field === 'code') {
      const n = Number(q.replace(/^P/i, ''))
      query = Number.isInteger(n) && n > 0 ? query.eq('product_no', n) : query.eq('product_no', -1)
    } else {
      const n = Number(q.replace(/^P/i, ''))
      const ors = [`name.ilike.%${q}%`, `model_name.ilike.%${q}%`, `brand.ilike.%${q}%`]
      if (Number.isInteger(n) && n > 0) ors.push(`product_no.eq.${n}`)
      query = query.or(ors.join(','))
    }
  }

  const [{ data, count, error }, jump] = await Promise.all([query, getJumpStatus(ctx.org.id)])
  const total = count ?? 0

  const rows: ProductListRow[] = ((data ?? []) as unknown as RawProductRow[]).map((p) => {
    const images = (p.product_images ?? []).slice().sort((a, b) => a.position - b.position)
    const cat = p.category_id ? catById.get(p.category_id) : undefined
    const parent = cat?.parent_id ? catById.get(cat.parent_id) : undefined
    return {
      id: p.id,
      productNo: p.product_no,
      name: p.name,
      status: p.status,
      price: p.price,
      condition: p.condition,
      badges: p.badges ?? [],
      isFeatured: p.is_featured,
      jumpedAt: p.jumped_at,
      modelName: p.model_name,
      brand: p.brand,
      categoryPath: cat ? (parent ? `${parent.name} > ${cat.name}` : cat.name) : null,
      soldOut: p.track_stock && p.stock_qty <= 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      thumbPath: images[0]?.media?.path ?? null,
    }
  })

  const values: ProductSearchValues = { field, q: str(sp.q), cate1, cate2, from, to, status, cond }
  const keep = { ...values, sort, size: String(size) }

  const summary: { key: string; label: string; count: number | null; tone?: string }[] = [
    { key: 'all', label: '전체', count: cAll.count },
    { key: 'active', label: '판매중', count: cActive.count },
    { key: 'draft', label: '임시저장', count: cDraft.count },
    { key: 'archived', label: '보관', count: cArchived.count },
    { key: 'soldout', label: '품절', count: cSoldout.count, tone: 'text-red-600' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="상품 목록"
        description="등록한 상품을 찾고, 여러 개를 골라 한 번에 판매 상태·분류를 바꾸거나 복사·삭제할 수 있어요."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/products/import">
                <FileUp className="size-4" />
                엑셀로 대량 등록
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="size-4" />
                상품등록
              </Link>
            </Button>
          </div>
        }
      />

      {/* 건수 요약 */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-border bg-card px-5 py-4 text-sm">
        {summary.map((s, i) => (
          <span key={s.key} className="flex items-center">
            {i > 0 ? <span className="mx-3 h-3 w-px bg-border" /> : null}
            <Link
              href={s.key === 'all' ? '/admin/products' : `/admin/products?status=${s.key}`}
              className={cn('hover:underline', status === s.key && 'font-bold')}
            >
              {s.label}{' '}
              <b className={cn('underline underline-offset-2 tabular-nums', s.tone ?? 'text-primary')}>
                {(s.count ?? 0).toLocaleString()}
              </b>
              건
            </Link>
          </span>
        ))}
      </div>

      {/* 점프 현황 */}
      <JumpBar jump={jump} />

      {/* 검색 조건 */}
      <ProductSearchPanel
        values={values}
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parent_id, sort: c.sort_order }))}
        keep={{ sort, size: String(size) }}
      />

      {/* 목록 */}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          상품을 불러오지 못했어요: {error.message}
        </p>
      ) : (
        <ProductList
          rows={rows}
          total={total}
          page={page}
          size={size}
          sort={sort}
          keep={keep}
          orgSlug={ctx.org.slug}
          canJump={jump.featuredLimit + jump.normalLimit > 0}
          categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parent_id, sort: c.sort_order }))}
        />
      )}
    </div>
  )
}

function JumpBar({ jump }: { jump: Awaited<ReturnType<typeof getJumpStatus>> }) {
  if (!jump.ready) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        점프 기능을 쓰려면 Supabase SQL 편집기에서 <code>0026_supplier_grades_jump.sql</code>을 실행해 주세요.
      </p>
    )
  }
  const grade = jump.grade
  const total = jump.featuredLimit + jump.normalLimit
  const used = jump.featuredUsed + jump.normalUsed
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary/30 bg-primary/5 px-5 py-3 text-sm">
      <span className="flex items-center gap-1.5 font-bold">
        <ArrowUpToLine className="size-4 text-primary" />
        점프
        <span className="font-normal text-muted-foreground">(최상단으로 올리기)</span>
      </span>
      {grade ? (
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: grade.color }}
        >
          {grade.name}
          {jump.gradeUntil && grade.is_paid ? ` · ${jump.gradeUntil}까지` : ''}
        </span>
      ) : null}
      {total > 0 ? (
        <>
          <span>
            오늘 추천 제품{' '}
            <b className="tabular-nums">
              {jump.featuredUsed}/{jump.featuredLimit}
            </b>
          </span>
          <span>
            일반 제품{' '}
            <b className="tabular-nums">
              {jump.normalUsed}/{jump.normalLimit}
            </b>
          </span>
          <span className="text-muted-foreground">
            남은 점프 <b className="text-primary tabular-nums">{Math.max(0, total - used)}</b>개 · 매일 0시에 다시 채워져요
          </span>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">무료공급사는 점프 기능이 없어요. 유료공급사가 되면 하루 10개까지 맨 위로 올릴 수 있어요.</span>
          <Link href="/advertise" target="_blank" className="font-semibold text-primary hover:underline">
            유료공급사 안내 →
          </Link>
        </>
      )}
    </div>
  )
}
