// 카카오톡 채널 · 네이버 밴드 "최신정보 받기" 배너 (설정 → 쇼핑몰에서 주소 입력 시 표시)

import { ChevronRight } from 'lucide-react'

import { settingStr } from '@/lib/settings'

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function ChannelBanners({ settings }: { settings: Record<string, unknown> }) {
  const kakao = safeUrl(settingStr(settings, 'storefront.kakao_channel_url').trim())
  const band = safeUrl(settingStr(settings, 'storefront.naver_band_url').trim())
  if (!kakao && !band) return null

  return (
    <div className="flex flex-col gap-2">
      {kakao ? (
        <a
          href={kakao}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg bg-[#FEE500] px-4 py-3 text-sm text-[#191919] transition-opacity hover:opacity-90"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[#191919] text-[11px] font-bold text-[#FEE500]">
            ch
          </span>
          <span className="flex-1">
            <strong>카카오톡 채널</strong> 추가하고 최신정보 받기
          </span>
          <ChevronRight className="size-4" />
        </a>
      ) : null}
      {band ? (
        <a
          href={band}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg bg-[#06C755] px-4 py-3 text-sm text-white transition-opacity hover:opacity-90"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white text-sm font-bold text-[#06C755]">
            b
          </span>
          <span className="flex-1">
            <strong>네이버밴드</strong> 가입하고 최신정보 받기
          </span>
          <ChevronRight className="size-4" />
        </a>
      ) : null}
    </div>
  )
}
