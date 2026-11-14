'use client'

// 누르면 통계를 기록하는 외부 링크 (예: 공급사 홈페이지 바로가기)

import type { ReactNode } from 'react'

import { trackProductEvent, type TrackEventType } from './track'

export function TrackedLink({
  href,
  productId,
  event,
  className,
  children,
}: {
  href: string
  productId?: string
  event: TrackEventType
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
      onClick={() => {
        if (productId) trackProductEvent(productId, event)
      }}
    >
      {children}
    </a>
  )
}
