'use client'

// 상품 목록 표 (카페24식) — 선택 → 일괄 처리(판매중·임시저장·보관·복사·삭제·분류수정·점프·엑셀), 정렬·개수, 쪽 번호
// 줄 데이터는 src/app/(admin)/admin/products/page.tsx(서버)가 준비해요.

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpToLine, ChevronLeft, ChevronRight, ExternalLink, FileSpreadsheet, Link2, Package, Star, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { BADGE_CLASS, BADGE_LABEL, CONDITION_LABEL, isProductBadge } from '@/components/store/product-detail/labels'
import { formatPrice } from '@/lib/money'
import { mediaUrl } from '@/lib/media-url'
import { cn } from '@/lib/utils'
import type { ProductCondition, ProductStatus } from '@/types/db'

import { bulkCopyAction, bulkDeleteAction, bulkSetCategoryAction, bulkSetStatusAction, jumpProductsAction } from '../bulk-actions'
import { buildProductsUrl, type CategoryLite } from './product-search-panel'

export interface ProductListRow {
  id: string
  productNo: number
  name: string
  status: ProductStatus
  price: number
  condition: ProductCondition | null
  badges: string[]
  isFeatured: boolean
  jumpedAt: string | null
  modelName: string | null
  brand: string | null
  categoryPath: string | null
  soldOut: boolean
  createdAt: string
  updatedAt: string
  thumbPath: string | null
}

const STATUS_LABEL: Record<ProductStatus, string> = { active: '판매중', draft: '임시저장', archived: '보관' }
const STATUS_CLASS: Record<ProductStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  draft: 'text-muted-foreground',
  archived: 'text-amber-600 dark:text-amber-400',
}

const SORT_OPTIONS = [
  ['display_desc', '진열순 (점프 반영)'],
  ['created_desc', '등록일 역순'],
  ['created_asc', '등록일순'],
  ['updated_desc', '수정일 역순'],
  ['name_asc', '상품명순'],
  ['price_desc', '판매가 높은순'],
  ['price_asc', '판매가 낮은순'],
  ['no_desc', '상품번호 역순'],
] as const

function fmtDate(iso: string) {
  // 2026-11-15 (한국 시간)
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

/** 카페24식 작은 회색 버튼 */
function ActBtn({
  children,
  onClick,
  disabled,
  className,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-background px-2.5 text-xs whitespace-nowrap hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ProductList({
  rows,
  total,
  page,
  size,
  sort,
  keep,
  orgSlug,
  canJump,
  categories,
}: {
  rows: ProductListRow[]
  total: number
  page: number
  size: number
  sort: string
  keep: Record<string, string>
  orgSlug: string
  canJump: boolean
  categories: CategoryLite[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [moveCate, setMoveCate] = useState('')

  const ids = useMemo(() => [...selected], [selected])
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const lastPage = Math.max(1, Math.ceil(total / size))
  const firstOfBlock = Math.floor((page - 1) / 10) * 10 + 1
  const pages = Array.from({ length: Math.min(10, lastPage - firstOfBlock + 1) }, (_, i) => firstOfBlock + i)
  const url = (patch: Record<string, string>) => buildProductsUrl({ ...keep, page: String(page), ...patch })

  // 분류 고르기: "1차 > 2차" 목록
  const cateOptions = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort)
    return roots.flatMap((r) => [
      { id: r.id, label: r.name },
      ...categories
        .filter((c) => c.parentId === r.id)
        .sort((a, b) => a.sort - b.sort)
        .map((c) => ({ id: c.id, label: `${r.name} > ${c.name}` })),
    ])
  }, [categories])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function run(
    target: string[],
    fn: () => Promise<{ ok: boolean; error?: string; data?: { count: number } }>,
    done: (n: number) => string,
  ) {
    if (target.length === 0) {
      toast.error('상품을 먼저 선택하세요')
      return
    }
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error ?? '처리하지 못했어요')
      else {
        toast.success(done(res.data?.count ?? target.length))
        setSelected(new Set())
        router.refresh()
      }
    })
  }

  const jump = (target: string[]) =>
    run(target, () => jumpProductsAction(target), (n) => `${n}개를 맨 위로 올렸어요`)

  async function copyUrl(no: number) {
    const link = `${window.location.origin}/minishop/${orgSlug}/products/${no}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('상품 주소를 복사했어요')
    } catch {
      toast.error('복사하지 못했어요')
    }
  }

  const bulkBar = (bottom: boolean) => (
    <div className={cn('flex flex-wrap items-center gap-1 px-3 py-2', bottom ? 'border-t border-border' : 'border-b border-border bg-muted/30')}>
      <ActBtn disabled={pending} onClick={() => run(ids, () => bulkSetStatusAction(ids, 'active'), (n) => `${n}개를 판매중으로 바꿨어요`)}>
        판매중
      </ActBtn>
      <ActBtn disabled={pending} onClick={() => run(ids, () => bulkSetStatusAction(ids, 'draft'), (n) => `${n}개를 임시저장으로 바꿨어요`)}>
        임시저장
      </ActBtn>
      <ActBtn disabled={pending} onClick={() => run(ids, () => bulkSetStatusAction(ids, 'archived'), (n) => `${n}개를 보관했어요`)}>
        보관
      </ActBtn>
      <ActBtn disabled={pending} onClick={() => run(ids, () => bulkCopyAction(ids), (n) => `${n}개를 복사했어요 (임시저장 상태)`)}>
        복사
      </ActBtn>
      {selected.size > 0 ? (
        <ConfirmDialog
          trigger={
            <ActBtn disabled={pending}>
              <X className="size-3 text-red-600" />
              삭제
            </ActBtn>
          }
          title={`선택한 상품 ${selected.size}개를 삭제할까요?`}
          description="상품, 옵션, 사진 연결이 함께 지워지고 되돌릴 수 없어요. 잠시 숨기려면 '보관'을 쓰세요."
          confirmLabel="삭제"
          destructive
          onConfirm={() => run(ids, () => bulkDeleteAction(ids), (n) => `${n}개를 삭제했어요`)}
        />
      ) : (
        <ActBtn onClick={() => toast.error('상품을 먼저 선택하세요')}>
          <X className="size-3 text-red-600" />
          삭제
        </ActBtn>
      )}
      <span className="flex items-center gap-1">
        <select
          value={moveCate}
          onChange={(e) => setMoveCate(e.target.value)}
          className="h-7 max-w-48 rounded-sm border border-border bg-background px-1.5 text-xs"
          aria-label="바꿀 분류"
        >
          <option value="">분류 선택</option>
          {cateOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ActBtn
          disabled={pending}
          onClick={() =>
            moveCate
              ? run(ids, () => bulkSetCategoryAction(ids, moveCate), (n) => `${n}개의 분류를 바꿨어요`)
              : toast.error('바꿀 분류를 먼저 고르세요')
          }
        >
          분류수정
        </ActBtn>
      </span>
      <ActBtn
        disabled={pending || !canJump}
        onClick={() => jump(ids)}
        title={canJump ? '선택한 판매중 제품을 목록 맨 위로' : '유료공급사만 쓸 수 있어요'}
        className="border-primary/50 font-semibold text-primary"
      >
        <ArrowUpToLine className="size-3" />
        점프
      </ActBtn>
      <a
        href="/api/export/products"
        className="inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-background px-2.5 text-xs whitespace-nowrap hover:bg-muted"
      >
        <FileSpreadsheet className="size-3 text-emerald-600" />
        엑셀다운로드
      </a>
      <span className="ml-auto text-xs text-muted-foreground">
        선택 <b className="text-foreground">{selected.size}</b>개
      </span>
      {bottom ? (
        <Button asChild size="sm" className="ml-2 h-7 text-xs">
          <Link href="/admin/products/new">상품등록</Link>
        </Button>
      ) : null}
    </div>
  )

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      {/* 머리: 건수 · 정렬 · 개수 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="text-sm">
          총 <b className="text-primary tabular-nums">{total.toLocaleString()}</b>개
        </span>
        <div className="ml-auto flex gap-1">
          <select
            value={sort}
            onChange={(e) => router.push(url({ sort: e.target.value, page: '1' }))}
            className="h-7 rounded-sm border border-border bg-background px-1.5 text-xs"
            aria-label="정렬"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={String(size)}
            onChange={(e) => router.push(url({ size: e.target.value, page: '1' }))}
            className="h-7 rounded-sm border border-border bg-background px-1.5 text-xs"
            aria-label="한 쪽에 보기"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}개씩보기
              </option>
            ))}
          </select>
        </div>
      </div>

      {bulkBar(false)}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">조건에 맞는 상품이 없어요.</p>
          <Button asChild size="sm">
            <Link href="/admin/products/new">상품등록</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground [&>th]:border-r [&>th]:border-border [&>th]:px-2 [&>th]:py-2 [&>th]:font-medium [&>th:last-child]:border-r-0">
                <th className="w-9">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                    className="size-3.5 accent-primary"
                    aria-label="모두 선택"
                  />
                </th>
                <th className="w-14">No</th>
                <th className="w-20">상품코드</th>
                <th>상품명</th>
                <th className="w-24">판매가</th>
                <th className="w-16">판매상태</th>
                <th className="w-14">상품상태</th>
                <th className="w-12">추천</th>
                <th className="w-24">상품등록일</th>
                <th className="w-28">점프</th>
                <th className="w-24">바로가기</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const no = total - ((page - 1) * size + i)
                const checked = selected.has(r.id)
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-b border-border text-center last:border-b-0 [&>td]:border-r [&>td]:border-border [&>td]:px-2 [&>td]:py-2.5 [&>td:last-child]:border-r-0',
                      checked ? 'bg-primary/5' : 'hover:bg-muted/30',
                    )}
                  >
                    <td>
                      <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="size-3.5 accent-primary" aria-label={`${r.name} 선택`} />
                    </td>
                    <td className="text-muted-foreground tabular-nums">{no}</td>
                    <td className="tabular-nums">
                      <Link href={`/admin/products/${r.id}`} className="text-primary underline underline-offset-2">
                        P{r.productNo}
                      </Link>
                    </td>
                    <td className="text-left">
                      <div className="flex items-center gap-2.5">
                        <Link href={`/admin/products/${r.id}`} className="size-12 shrink-0 overflow-hidden border border-border bg-[#e9e9e9]">
                          {r.thumbPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaUrl(r.thumbPath)} alt="" className="size-full object-contain" loading="lazy" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">없음</span>
                          )}
                        </Link>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <Link href={`/admin/products/${r.id}`} className="line-clamp-2 text-[13px] underline-offset-2 hover:text-primary hover:underline">
                            {r.name}
                          </Link>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {[r.categoryPath, r.brand, r.modelName].filter(Boolean).join(' · ') || '-'}
                          </span>
                          {r.badges.length > 0 || r.soldOut ? (
                            <span className="flex flex-wrap gap-0.5">
                              {r.badges.filter(isProductBadge).map((b) => (
                                <span key={b} className={cn('rounded-sm px-1 text-[10px] leading-4 font-bold', BADGE_CLASS[b])}>
                                  {BADGE_LABEL[b]}
                                </span>
                              ))}
                              {r.soldOut ? <span className="rounded-sm bg-foreground px-1 text-[10px] leading-4 font-bold text-background">품절</span> : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={cn('text-right font-semibold tabular-nums', r.price > 0 ? '' : 'text-red-600')}>{formatPrice(r.price)}</td>
                    <td className={cn('font-medium', STATUS_CLASS[r.status])}>{STATUS_LABEL[r.status]}</td>
                    <td>{r.condition ? CONDITION_LABEL[r.condition] : '-'}</td>
                    <td>{r.isFeatured ? <Star className="mx-auto size-3.5 fill-amber-400 text-amber-400" aria-label="추천" /> : <span className="text-muted-foreground">-</span>}</td>
                    <td className="text-muted-foreground tabular-nums">{fmtDate(r.createdAt)}</td>
                    <td>
                      <div className="flex flex-col items-center gap-1">
                        <ActBtn
                          disabled={pending || !canJump || r.status !== 'active'}
                          onClick={() => jump([r.id])}
                          title={!canJump ? '유료공급사만 쓸 수 있어요' : r.status !== 'active' ? '판매중인 제품만 점프할 수 있어요' : '이 제품을 목록 맨 위로'}
                          className="border-primary/50 text-primary"
                        >
                          <ArrowUpToLine className="size-3" />
                          {r.isFeatured ? '추천 점프' : '점프'}
                        </ActBtn>
                        {r.jumpedAt ? <span className="text-[10px] text-muted-foreground">최근 {fmtTime(r.jumpedAt)}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={`/minishop/${orgSlug}/products/${r.productNo}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                          보기
                        </a>
                        <button type="button" onClick={() => copyUrl(r.productNo)} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                          <Link2 className="size-3" />
                          주소복사
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? bulkBar(true) : null}

      {/* 쪽 번호 */}
      {lastPage > 1 ? (
        <nav className="flex items-center justify-center gap-1 border-t border-border py-4" aria-label="쪽 이동">
          <Link
            href={url({ page: String(Math.max(1, firstOfBlock - 1)) })}
            aria-disabled={firstOfBlock === 1}
            className={cn('flex size-7 items-center justify-center rounded-sm border border-border hover:bg-muted', firstOfBlock === 1 && 'pointer-events-none opacity-40')}
            aria-label="이전 10쪽"
          >
            <ChevronLeft className="size-3.5" />
          </Link>
          {pages.map((p) => (
            <Link
              key={p}
              href={url({ page: String(p) })}
              className={cn('flex size-7 items-center justify-center rounded-sm text-xs tabular-nums', p === page ? 'bg-primary font-bold text-primary-foreground' : 'hover:bg-muted')}
            >
              {p}
            </Link>
          ))}
          <Link
            href={url({ page: String(Math.min(lastPage, firstOfBlock + 10)) })}
            aria-disabled={firstOfBlock + 10 > lastPage}
            className={cn('flex size-7 items-center justify-center rounded-sm border border-border hover:bg-muted', firstOfBlock + 10 > lastPage && 'pointer-events-none opacity-40')}
            aria-label="다음 10쪽"
          >
            <ChevronRight className="size-3.5" />
          </Link>
        </nav>
      ) : null}
    </section>
  )
}
