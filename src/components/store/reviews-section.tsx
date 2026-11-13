import { Star } from 'lucide-react'

import { getAnonClient } from '@/lib/supabase/anon'
import { cn } from '@/lib/utils'
import type { Review } from '@/types/db'

import { ReviewForm } from './review-form'

type PublicReview = Pick<
  Review,
  'id' | 'customer_name' | 'rating' | 'title' | 'body' | 'is_verified' | 'created_at'
>

export async function ReviewsSection({
  orgId,
  orgSlug,
  productId,
}: {
  orgId: string
  orgSlug: string
  productId: string
}) {
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, title, body, is_verified, created_at')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const reviews = (data ?? []) as PublicReview[]
  const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">리뷰</h2>
        {reviews.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="size-4 fill-amber-500 text-amber-500" />
            <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
            <span>({reviews.length})</span>
          </div>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 리뷰가 없습니다. 첫 리뷰를 남겨 주세요.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        'size-3.5',
                        n <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground',
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium">{r.customer_name}</span>
                {r.is_verified ? (
                  <span className="text-2xs rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    구매 인증
                  </span>
                ) : null}
              </div>
              {r.title ? <p className="mt-2 text-sm font-medium">{r.title}</p> : null}
              {r.body ? <p className="mt-1 text-sm text-muted-foreground">{r.body}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <ReviewForm orgSlug={orgSlug} productId={productId} />
    </section>
  )
}
