// 공급사 관리자 첫 화면 — 내 상품·문의 현황, 점프, 미니샵 바로가기

import Link from 'next/link'
import { ArrowUpToLine, ExternalLink, MessageCircleQuestion, MessageSquareText, Package, PackagePlus, Store } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { OrgContext } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { getJumpStatus } from '@/modules/catalog/jump'

function Stat({ href, icon: Icon, label, value, tone }: { href: string; icon: typeof Package; label: string; value: number; tone?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <span className={`flex size-10 items-center justify-center rounded-full ${tone ?? 'bg-primary/10 text-primary'}`}>
        <Icon className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <b className="text-xl tabular-nums">{value.toLocaleString()}</b>
      </span>
    </Link>
  )
}

export async function SupplierDashboard({ ctx }: { ctx: OrgContext }) {
  const admin = getAdminClient()
  const orgId = ctx.org.id
  const since = new Date(Date.now() - 7 * 86400_000).toISOString()
  const [active, total, qnaPending, newRequests, myResponses, jump] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    admin.from('product_questions').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending'),
    admin.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'open').gte('created_at', since),
    admin.from('purchase_request_responses').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    getJumpStatus(orgId),
  ])
  const jumpTotal = jump.featuredLimit + jump.normalLimit
  const jumpUsed = jump.featuredUsed + jump.normalUsed

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">공급사 관리자</p>
          <h1 className="text-[22px] font-semibold tracking-tight">{ctx.org.name}</h1>
          <p className="text-sm text-muted-foreground">
            미니샵 주소: <span className="font-medium text-foreground">/minishop/{ctx.org.slug}</span>
            {jump.grade ? (
              <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: jump.grade.color }}>
                {jump.grade.name}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/minishop/${ctx.org.slug}`} target="_blank" rel="noopener">
              <ExternalLink className="size-4" />내 미니샵 보기
            </a>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <PackagePlus className="size-4" />
              상품 등록
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/admin/products?status=active" icon={Package} label="판매중 상품" value={active.count ?? 0} />
        <Stat href="/admin/products" icon={Package} label="전체 상품" value={total.count ?? 0} tone="bg-muted text-muted-foreground" />
        <Stat href="/admin/questions" icon={MessageCircleQuestion} label="답변 기다리는 Q&A" value={qnaPending.count ?? 0} tone="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" />
        <Stat href="/admin/requests?status=open" icon={MessageSquareText} label="최근 7일 새 구매문의" value={newRequests.count ?? 0} tone="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <ArrowUpToLine className="size-4 text-primary" />
            오늘 점프 (최상단으로 올리기)
          </h2>
          {jumpTotal > 0 ? (
            <>
              <p className="mt-3 text-3xl font-bold tabular-nums">
                {jumpUsed}
                <span className="text-base font-normal text-muted-foreground"> / {jumpTotal}개</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                추천 제품 {jump.featuredUsed}/{jump.featuredLimit} · 일반 제품 {jump.normalUsed}/{jump.normalLimit} · 매일 0시에 다시 채워져요
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/admin/products">상품 목록에서 점프하기</Link>
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              무료공급사는 점프 기능이 없어요. 유료공급사가 되면 하루 10개까지 제품을 목록 맨 위로 올릴 수 있어요.{' '}
              <a href="/advertise" target="_blank" className="font-semibold text-primary hover:underline">
                유료공급사 안내 →
              </a>
            </p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Store className="size-4 text-primary" />
            미니샵 관리
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ['/admin/storefront', '미니샵 설정 (소개·연락처)'],
              ['/admin/banners', '미니샵 배너'],
              ['/admin/cms/pages', '미니샵 페이지'],
              ['/admin/requests', `구매문의 (상담 ${myResponses.count ?? 0}건)`],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="block rounded-md border border-border px-3 py-2 hover:bg-muted">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
