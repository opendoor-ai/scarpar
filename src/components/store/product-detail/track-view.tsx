'use client'

// 상세페이지가 화면에 열리면 "조회 1회"를 기록하고(검색 로봇은 서버에서 걸러냄),
// 이 기기의 "최근 본 상품"에도 넣어요.

import { useEffect } from 'react'

import { pushRecent, type RecentProduct } from '@/lib/recent-products'

import { trackProductEvent } from './track'

export function TrackView({ productId, recent }: { productId: string; recent?: Omit<RecentProduct, 'at' | 'id'> }) {
  useEffect(() => {
    trackProductEvent(productId, 'view')
    if (recent) pushRecent({ id: productId, ...recent })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])
  return null
}
