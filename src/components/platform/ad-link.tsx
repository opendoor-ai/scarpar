'use client'

// 광고 링크 — 화면에 절반 이상 보이면 "노출" 1번, 누르면 "클릭"을 기록합니다.

import { useEffect, useRef } from 'react'

import { sendAdEvent } from '@/modules/ads/track'

export function AdLink({
  bannerId,
  href,
  className,
  children,
  title,
  style,
}: {
  bannerId: string
  href: string
  className?: string
  children: React.ReactNode
  title?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const seen = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      if (!seen.current) {
        seen.current = true
        sendAdEvent(bannerId, 'impression')
      }
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seen.current) {
          seen.current = true
          sendAdEvent(bannerId, 'impression')
          io.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [bannerId])

  const external = /^https?:\/\//i.test(href)
  return (
    <a
      ref={ref}
      href={href || '#'}
      title={title}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener sponsored' : 'sponsored'}
      className={className ? `font-banner ${className}` : 'font-banner'}
      style={style}
      onClick={() => sendAdEvent(bannerId, 'click')}
    >
      {children}
    </a>
  )
}
