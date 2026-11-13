import Link from 'next/link'
import { Star } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { truncate } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface ReviewRow {
  id: string
  customer_name: string
  rating: number
  title: string | null
}

/** Reviews awaiting moderation, last 8. */
export async function ReviewsPendingWidget() {
  const ctx = await requireOrg()

  let reviews: ReviewRow[] = []

  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('reviews')
      .select('id, customer_name, rating, title')
      .eq('org_id', ctx.org.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(8)

    reviews = (data ?? []) as ReviewRow[]
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">승인 대기 리뷰 ({reviews.length})</CardTitle>
        <Link href="/admin/reviews" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {reviews.length === 0 ? (
          <EmptyState icon={Star} title="승인 대기 중인 리뷰가 없습니다" className="py-8" />
        ) : (
          <ul className="flex flex-col gap-1">
            {reviews.map((review) => (
              <li key={review.id}>
                <Link
                  href="/admin/reviews"
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {review.customer_name}
                    {review.title ? ` · ${truncate(review.title, 24)}` : ''}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-foreground">
                    <Star className="size-3 fill-current" />
                    {review.rating}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
