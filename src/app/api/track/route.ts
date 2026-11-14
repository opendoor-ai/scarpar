// POST /api/track — 상품 상세페이지의 조회·문의 버튼 클릭 기록 (광고 성과 통계용)
// - 검색 로봇은 기록하지 않음
// - IP는 저장하지 않고, 하루마다 바뀌는 익명 값으로만 같은 사람 중복을 거름
// - 같은 사람이 같은 상품에서 같은 행동을 짧은 시간에 반복하면 한 번만 셈

import { createHash } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/lib/env'
import { getAdminClient } from '@/lib/supabase/admin'

const EVENT_TYPES = new Set([
  'view',
  'call_click',
  'sms_click',
  'share_click',
  'qr_open',
  'homepage_click',
  'question_submit',
])

/** 같은 행동을 다시 세기까지의 간격 */
const DEDUPE_MINUTES: Record<string, number> = { view: 30 }
const DEFAULT_DEDUPE_MINUTES = 5

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum|headless|lighthouse/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const ok = new NextResponse(null, { status: 204 })
  try {
    const ua = request.headers.get('user-agent') ?? ''
    if (!ua || BOT_RE.test(ua)) return ok

    const body = (await request.json().catch(() => null)) as { productId?: unknown; type?: unknown } | null
    const productId = typeof body?.productId === 'string' ? body.productId : ''
    const type = typeof body?.type === 'string' ? body.type : ''
    if (!UUID_RE.test(productId) || !EVENT_TYPES.has(type)) return ok

    const admin = getAdminClient()
    const { data: product } = await admin
      .from('products')
      .select('id, org_id')
      .eq('id', productId)
      .eq('status', 'active')
      .maybeSingle()
    if (!product) return ok

    // 익명 방문자 값: (IP + 브라우저 정보 + 날짜 + 비밀값)의 해시 — 원래 값으로 되돌릴 수 없음
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const day = new Date().toISOString().slice(0, 10)
    const visitorHash = createHash('sha256')
      .update(`${ip}|${ua}|${day}|${env.SUPABASE_SERVICE_ROLE_KEY}`)
      .digest('hex')
      .slice(0, 32)

    const since = new Date(Date.now() - (DEDUPE_MINUTES[type] ?? DEFAULT_DEDUPE_MINUTES) * 60_000).toISOString()
    const { count } = await admin
      .from('product_events')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('event_type', type)
      .eq('visitor_hash', visitorHash)
      .gte('created_at', since)
    if ((count ?? 0) > 0) return ok

    await admin.from('product_events').insert({
      org_id: (product as { org_id: string }).org_id,
      product_id: productId,
      event_type: type,
      visitor_hash: visitorHash,
    })
  } catch (err) {
    console.error('[track] failed', err)
  }
  return ok
}
