// 광고 성과 — 우리 공급사 상품의 조회수, 전화·문자 문의 버튼 클릭, 공유, QR 등
// (기준서 9장: 공급사별 광고 성과 대시보드 · 실제 통화 완료와 버튼 클릭 구분)

import Link from 'next/link'
import { Eye, MessageSquare, Percent, Phone, Share2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MiniBarChart } from '@/components/ui/mini-chart'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PERIODS = [7, 30, 90] as const
const DAY = 24 * 60 * 60 * 1000

interface SummaryRow {
  product_id: string
  views: number
  call_clicks: number
  sms_clicks: number
  share_clicks: number
  qr_opens: number
  homepage_clicks: number
  questions: number
}

const num = (v: number | string | null | undefined) => Number(v ?? 0)
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—')
const fmt = (v: number) => v.toLocaleString('ko-KR')

export default async function StatsPage({ searchParams }: PageProps<Record<string, string>, { days?: string }>) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')
  const { days: daysParam } = await searchParams
  const days = (PERIODS as readonly number[]).includes(Number(daysParam)) ? Number(daysParam) : 30

  const to = new Date()
  const from = new Date(to.getTime() - days * DAY)
  const supabase = await getServerClient()
  const args = { p_org: ctx.org.id, p_from: from.toISOString(), p_to: to.toISOString() }
  const [summaryResult, dailyResult] = await Promise.all([
    supabase.rpc('product_event_summary', args),
    supabase.rpc('product_event_daily', args),
  ])
  if (summaryResult.error) console.error('[stats] summary failed:', summaryResult.error.message)

  const summary: SummaryRow[] = ((summaryResult.data ?? []) as SummaryRow[]).map((r) => ({
    product_id: r.product_id,
    views: num(r.views),
    call_clicks: num(r.call_clicks),
    sms_clicks: num(r.sms_clicks),
    share_clicks: num(r.share_clicks),
    qr_opens: num(r.qr_opens),
    homepage_clicks: num(r.homepage_clicks),
    questions: num(r.questions),
  }))
  const daily = (dailyResult.data ?? []) as { day: string; views: number; inquiries: number }[]

  const ids = summary.map((r) => r.product_id)
  const productRows = ids.length
    ? ((await supabase.from('products').select('id, name, product_no').in('id', ids)).data ?? [])
    : []
  const productById = new Map((productRows as { id: string; name: string; product_no: number }[]).map((p) => [p.id, p]))

  const total = summary.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      calls: acc.calls + r.call_clicks,
      sms: acc.sms + r.sms_clicks,
      shares: acc.shares + r.share_clicks + r.qr_opens,
      questions: acc.questions + r.questions,
    }),
    { views: 0, calls: 0, sms: 0, shares: 0, questions: 0 },
  )
  const inquiries = total.calls + total.sms + total.questions
  const rows = [...summary].sort((a, b) => b.views - a.views)

  // 날짜 빈칸 없이 그래프용 데이터 (서울 날짜 기준)
  const dailyMap = new Map(daily.map((d) => [String(d.day), d]))
  const chart = Array.from({ length: days }, (_, i) => {
    const key = new Date(from.getTime() + (i + 1) * DAY + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return { label: key.slice(5).replace('-', '.'), value: num(dailyMap.get(key)?.views) }
  })

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="광고 성과"
        description="우리 상품이 얼마나 보이고, 문의 버튼이 얼마나 눌렸는지 확인합니다."
        actions={
          <div className="flex gap-1 rounded-md border border-border p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin/stats?days=${p}`}
                className={cn(
                  'rounded px-3 py-1 text-xs font-medium',
                  p === days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                )}
              >
                최근 {p}일
              </Link>
            ))}
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="상세페이지 조회" value={fmt(total.views)} icon={Eye} />
          <StatCard label="전화 문의 클릭" value={fmt(total.calls)} icon={Phone} />
          <StatCard label="문자 문의 클릭" value={fmt(total.sms)} icon={MessageSquare} />
          <StatCard label="공유·QR" value={fmt(total.shares)} icon={Share2} />
          <StatCard label="문의 전환율" value={pct(inquiries, total.views)} hint="(전화+문자+Q&A) ÷ 조회" icon={Percent} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">일별 조회수</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={chart} height={140} valueFormat="count" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">상품별 성과</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <EmptyState
                icon={Eye}
                title="아직 기록이 없어요"
                description="고객이 상품 상세페이지를 보거나 문의 버튼을 누르면 여기에 쌓입니다."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품</TableHead>
                      <TableHead className="text-right">조회</TableHead>
                      <TableHead className="text-right">전화</TableHead>
                      <TableHead className="text-right">문자</TableHead>
                      <TableHead className="text-right">Q&amp;A</TableHead>
                      <TableHead className="text-right">공유</TableHead>
                      <TableHead className="text-right">QR</TableHead>
                      <TableHead className="text-right">홈페이지</TableHead>
                      <TableHead className="text-right">문의율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const p = productById.get(r.product_id)
                      return (
                        <TableRow key={r.product_id}>
                          <TableCell className="max-w-64 truncate">
                            {p ? (
                              <Link href={`/admin/products/${r.product_id}`} className="hover:underline">
                                <span className="text-muted-foreground">P{p.product_no}</span> {p.name}
                              </Link>
                            ) : (
                              '삭제된 상품'
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.views)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.call_clicks)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.sms_clicks)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.questions)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.share_clicks)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.qr_opens)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.homepage_clicks)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {pct(r.call_clicks + r.sms_clicks + r.questions, r.views)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs leading-relaxed text-muted-foreground">
          ※ 전화·문자 수치는 고객이 <strong>문의 버튼을 누른 횟수</strong>입니다. 실제로 통화가 연결되었거나 문자를
          보냈는지는 알 수 없어요. 같은 사람이 짧은 시간 안에 반복해서 누른 것은 한 번으로 세고, 검색 로봇의 방문은
          세지 않습니다.
        </p>
      </div>
    </div>
  )
}
