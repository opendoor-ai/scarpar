import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

export function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`별점 5점 중 ${rating}점`}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={cn('size-3.5', n <= rating ? 'fill-primary text-primary' : 'fill-none text-muted-foreground')}
        />
      ))}
    </div>
  )
}
