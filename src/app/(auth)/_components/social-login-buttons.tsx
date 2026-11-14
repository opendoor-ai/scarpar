'use client'

// 카카오·네이버 간편로그인 버튼
// .env 에서 켠 버튼만 보입니다 (설정 전에 눌러서 오류 나는 일 방지)
//   NEXT_PUBLIC_AUTH_KAKAO=1   → 카카오 로그인 버튼 표시 (Supabase 기본 제공 provider: 'kakao')
//   NEXT_PUBLIC_AUTH_NAVER=1   → 네이버 로그인 버튼 표시 (Supabase 사용자 지정 provider: 'custom:naver')

import { useState } from 'react'

import { getBrowserClient } from '@/lib/supabase/client'

const KAKAO_ENABLED = process.env.NEXT_PUBLIC_AUTH_KAKAO === '1'
const NAVER_ENABLED = process.env.NEXT_PUBLIC_AUTH_NAVER === '1'

export function SocialLoginButtons({ next }: { next?: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!KAKAO_ENABLED && !NAVER_ENABLED) return null

  async function signIn(provider: 'kakao' | 'custom:naver') {
    setError(null)
    setLoading(provider)
    const callback = new URL('/auth/callback', window.location.origin)
    if (next) callback.searchParams.set('next', next)

    const { error: oauthError } = await getBrowserClient().auth.signInWithOAuth({
      // 'custom:naver' 는 Supabase 사용자 지정 provider 식별자
      provider: provider as 'kakao',
      options: { redirectTo: callback.toString() },
    })
    if (oauthError) {
      setError('간편로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setLoading(null)
    }
    // 성공하면 카카오/네이버 로그인 화면으로 이동합니다.
  }

  return (
    <div className="flex flex-col gap-2">
      {KAKAO_ENABLED ? (
        <button
          type="button"
          onClick={() => signIn('kakao')}
          disabled={loading !== null}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] text-sm font-medium text-[#191919] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.32 4.66 6.74l-.95 3.48a.4.4 0 0 0 .6.44l4.08-2.7c.53.07 1.07.1 1.61.1 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
          </svg>
          {loading === 'kakao' ? '카카오로 이동 중…' : '카카오로 시작하기'}
        </button>
      ) : null}
      {NAVER_ENABLED ? (
        <button
          type="button"
          onClick={() => signIn('custom:naver')}
          disabled={loading !== null}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#03C75A] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
            <path d="M16.27 3v9.42L7.73 3H3v18h4.73v-9.42L16.27 21H21V3z" />
          </svg>
          {loading === 'custom:naver' ? '네이버로 이동 중…' : '네이버로 시작하기'}
        </button>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        또는 이메일로
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
