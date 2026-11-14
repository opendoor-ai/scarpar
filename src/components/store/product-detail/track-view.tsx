'use client'

// 상세페이지가 화면에 열리면 "조회 1회"를 기록 (검색 로봇은 서버에서 걸러냄)

import { useEffect } from 'react'

import { trackProductEvent } from './track'

export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    trackProductEvent(productId, 'view')
  }, [productId])
  return null
}
