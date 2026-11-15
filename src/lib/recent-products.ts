// 최근 본 상품 — 이 기기(브라우저)에만 저장해요. (로그인 없이, 최대 30개)

export interface RecentProduct {
  id: string
  href: string
  name: string
  image: string | null
  price: string
  supplier: string
  at: number
}

const KEY = 'jadong-recent-products'
const MAX = 30
export const RECENT_EVENT = 'jadong:recent-updated'

export function readRecent(): RecentProduct[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as RecentProduct[]) : []
    return Array.isArray(list) ? list.filter((p) => p && p.id && p.href) : []
  } catch {
    return []
  }
}

export function pushRecent(item: Omit<RecentProduct, 'at'>) {
  try {
    const next = [{ ...item, at: Date.now() }, ...readRecent().filter((p) => p.id !== item.id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(RECENT_EVENT))
  } catch {
    // 저장 못 해도 화면에는 영향 없음
  }
}

export function clearRecent() {
  try {
    localStorage.removeItem(KEY)
    window.dispatchEvent(new Event(RECENT_EVENT))
  } catch {
    // 무시
  }
}
