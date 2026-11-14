// 현장에서 많이 찾는 제품 — 조회·문의 기록(product_events)으로 순위를 매깁니다. (서버 전용)
// 기록 표는 공급사별 보안 규칙이 있어 service role로 읽고, 상품 id 순위만 돌려줍니다.

import { getAdminClient } from '@/lib/supabase/admin'

const KST = 9 * 60 * 60 * 1000

async function topProducts(sinceIso: string, types: string[], limit: number): Promise<string[]> {
  try {
    const { data, error } = await getAdminClient()
      .from('product_events')
      .select('product_id')
      .gte('created_at', sinceIso)
      .in('event_type', types)
      .order('created_at', { ascending: false })
      .limit(20000)
    if (error || !data) return []
    const counts = new Map<string, number>()
    for (const r of data as { product_id: string }[]) counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)
  } catch {
    return []
  }
}

/** 오늘(서울 0시부터) 조회가 많은 상품 */
export function todayTopViewed(limit: number) {
  const now = Date.now()
  const kstMidnight = new Date(Math.floor((now + KST) / 86_400_000) * 86_400_000 - KST)
  return topProducts(kstMidnight.toISOString(), ['view'], limit)
}

/** 최근 3시간 동안 조회·문의가 많은 상품 */
export function realtimeTop(limit: number) {
  return topProducts(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), ['view', 'call_click', 'sms_click'], limit)
}

/** 최근 30일 문의(전화·문자·Q&A)가 많은 상품 */
export function inquiryTop(limit: number) {
  return topProducts(
    new Date(Date.now() - 30 * 86_400_000).toISOString(),
    ['call_click', 'sms_click', 'question_submit'],
    limit,
  )
}
