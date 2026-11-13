'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createReviewAction } from '@/modules/storefront/actions'
import { reviewSchema, type ReviewInput } from '@/modules/storefront/schemas'

export function ReviewForm({ orgSlug, productId }: { orgSlug: string; productId: string }) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rating, setRating] = useState(5)

  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { orgSlug, productId, customerName: '', rating: 5, title: '', body: '' },
  })

  async function onSubmit(values: ReviewInput) {
    const result = await createReviewAction({ ...values, rating })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setSubmitted(true)
    form.reset()
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
리뷰 쓰기
      </Button>
    )
  }

  if (submitted) {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
리뷰가 접수되었습니다. 확인 후 게시됩니다.
      </p>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-lg border border-border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">별점</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)}>
                <Star
                  className={cn(
                    'size-5 transition-colors',
                    n <= rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input {...field} placeholder="홍길동" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목 (선택)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="만족스러운 제품입니다" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>리뷰 내용 (선택)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="사용해 보신 느낌을 남겨 주세요" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">리뷰는 확인 후 게시됩니다.</p>

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '등록 중…' : '리뷰 등록'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            취소
          </Button>
        </div>
      </form>
    </Form>
  )
}
