// POST /api/ads/event — 배너 광고 노출·클릭 기록 (광고 성과·클릭률 통계용)
// - 검색 로봇은 기록하지 않음
// - IP는 저장하지 않고, 하루마다 바뀌는 익명 값으로만 같은 사람 중복을 거름
// - 같은 사람이 같은 배너를 짧은 시간에 반복해서 보거나 누르면 한 번만 셈

import { createHash } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/lib/env'
import { getAdminClient } from '@/lib/supabase/admin'

const DEDUPE_MINUTES = { impression: 30, click: 5 } as const
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum|headless|lighthouse/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const ok = new NextResponse(null, { status: 204 })
  try {
    const ua = request.headers.get('user-agent') ?? ''
    if (!ua || BOT_RE.test(ua)) return ok

    const body = (await request.json().catch(() => null)) as { bannerId?: unknown; type?: unknown } | null
    const bannerId = typeof body?.bannerId === 'string' ? body.bannerId : ''
    const type = body?.type === 'impression' || body?.type === 'click' ? body.type : null
    if (!UUID_RE.test(bannerId) || !type) return ok

    const admin = getAdminClient()
    const now = new Date().toISOString()
    const { data: banner } = await admin
      .from('banner_ads')
      .select('id')
      .eq('id', bannerId)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .maybeSingle()
    if (!banner) return ok

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const day = now.slice(0, 10)
    const visitorHash = createHash('sha256')
      .update(`${ip}|${ua}|${day}|${env.SUPABASE_SERVICE_ROLE_KEY}`)
      .digest('hex')
      .slice(0, 32)

    const since = new Date(Date.now() - DEDUPE_MINUTES[type] * 60_000).toISOString()
    const { count } = await admin
      .from('banner_events')
      .select('id', { count: 'exact', head: true })
      .eq('banner_id', bannerId)
      .eq('event_type', type)
      .eq('visitor_hash', visitorHash)
      .gte('created_at', since)
    if ((count ?? 0) > 0) return ok

    await admin.from('banner_events').insert({ banner_id: bannerId, event_type: type, visitor_hash: visitorHash })
  } catch (err) {
    console.error('[ads event] failed', err)
  }
  return ok
}
