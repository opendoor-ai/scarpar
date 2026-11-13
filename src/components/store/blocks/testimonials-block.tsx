import { Star } from 'lucide-react'

import { getAnonClient } from '@/lib/supabase/anon'
import type { Review, TestimonialsBlock } from '@/types/db'

import type { BlockRenderContext } from './render-blocks'

interface TestimonialItemView {
  name: string
  quote: string
  rating?: number
}

export async function TestimonialsBlockView({
  block,
  ctx,
}: {
  block: TestimonialsBlock
  ctx: BlockRenderContext
}) {
  let items: TestimonialItemView[] = block.items ?? []

  if (block.mode === 'reviews') {
    const supabase = getAnonClient()
    const { data } = await supabase
      .from('reviews')
      .select('customer_name, rating, body')
      .eq('org_id', ctx.org.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(9)

    items = ((data ?? []) as Pick<Review, 'customer_name' | 'rating' | 'body'>[])
      .filter((r) => r.body)
      .map((r) => ({ name: r.customer_name, quote: r.body as string, rating: r.rating }))
  }

  if (items.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="mb-5 text-lg font-semibold">고객 후기</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-4">
            {item.rating ? (
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={
                      n <= (item.rating ?? 0) ? 'size-3.5 fill-amber-500 text-amber-500' : 'size-3.5 text-muted-foreground'
                    }
                  />
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
            <p className="text-xs font-medium">{item.name}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
