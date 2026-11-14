// 배너 광고 노출·클릭 기록 보내기 (브라우저 전용). 실패해도 화면에는 영향 없음.

export function sendAdEvent(bannerId: string, type: 'impression' | 'click'): void {
  try {
    const body = JSON.stringify({ bannerId, type })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/ads/event', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/ads/event', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
  } catch {
    // 기록 실패는 무시
  }
}
