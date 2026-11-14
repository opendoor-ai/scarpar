'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 미니샵 안에서 없는 상품·페이지로 들어왔을 때 (404)
export default function StoreNotFound() {
  const pathname = usePathname() ?? ''
  const orgSlug = pathname.split('/')[2] ?? ''
  const productsHref = orgSlug ? `/s/${orgSlug}/products` : '/'

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        판매가 끝났거나 주소가 바뀐 상품일 수 있어요. 전체 제품 목록에서 다시 찾아보세요.
      </p>
      <Link href={productsHref} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
        전체 제품 보기
      </Link>
    </div>
  )
}
