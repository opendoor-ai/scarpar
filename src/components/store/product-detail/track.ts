'use client'

// 상세페이지 행동 기록 보내기 (통계용). 실패해도 화면에는 아무 영향 없음.

export type TrackEventType =
  | 'view'
  | 'call_click'
  | 'sms_click'
  | 'share_click'
  | 'qr_open'
  | 'homepage_click'
  | 'question_submit'

export function trackProductEvent(productId: string, type: TrackEventType): void {
  try {
    const body = JSON.stringify({ productId, type })
    // 전화 앱으로 넘어가며 페이지를 떠나도 전송되도록 sendBeacon 우선
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
  } catch {
    // 통계 기록 실패는 무시
  }
}
