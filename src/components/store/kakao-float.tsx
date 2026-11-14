// 카카오톡 채널 상담 버튼 — 화면 오른쪽 아래에 떠 있음 (쇼핑몰 설정 → 카카오톡 채널 주소가 있을 때만)

import { MessageCircle } from 'lucide-react'

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function KakaoFloat({ url }: { url: string }) {
  const href = url ? safeUrl(url.trim()) : null
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="카카오톡 채널 상담"
      className="fixed right-4 bottom-24 z-40 flex size-12 items-center justify-center rounded-full bg-[#FEE500] text-[#191919] shadow-md transition-transform hover:scale-105 sm:right-6 md:bottom-6"
    >
      <MessageCircle className="size-6 fill-current" />
    </a>
  )
}
