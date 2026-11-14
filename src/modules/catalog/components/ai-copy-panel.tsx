'use client'

// "AI로 문구 작성" — 입력한 상품 정보로 간략설명·상세 내용·태그·검색용 제목/설명 초안을 채워 줍니다.
// 저장은 하지 않습니다. 내용을 확인·수정한 뒤 [변경사항 저장]을 눌러야 반영됩니다.

import { useState, useTransition } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { generateProductCopyAction } from '../ai-actions'
import type { CategoryOption } from '../category-options'
import type { ProductFormValues } from '../schemas'

const CONDITION_LABEL: Record<string, string> = { new: '신품', used: '중고', refurbished: '리퍼' }

export function AiCopyPanel({
  form,
  categories,
}: {
  form: UseFormReturn<ProductFormValues>
  categories: CategoryOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [missing, setMissing] = useState<string[]>([])

  function run() {
    const v = form.getValues()
    if (!v.name?.trim()) {
      toast.error('상품명을 먼저 입력하세요.')
      return
    }
    if (v.detail_html?.trim() && !window.confirm('지금 쓰여 있는 상세 내용·간략설명·검색 문구를 AI 초안으로 바꿀까요?')) return

    const category = categories.find((c) => c.id === v.category_id)
    startTransition(async () => {
      const result = await generateProductCopyAction({
        name: v.name,
        model_name: v.model_name,
        brand: v.brand,
        category: category ? (category.parentName ? `${category.parentName} > ${category.name}` : category.name) : undefined,
        condition: v.condition ? CONDITION_LABEL[v.condition] : undefined,
        spec_summary: v.spec_summary,
        description: v.description,
        tags: v.tags,
      })
      if (!result.ok) return void toast.error(result.error)
      const out = result.data!
      const opts = { shouldDirty: true, shouldValidate: true }
      form.setValue('short_description', out.short_description, opts)
      form.setValue('detail_html', out.detail_html, opts)
      form.setValue('seo_title', out.seo_title, opts)
      form.setValue('seo_description', out.seo_description, opts)
      // 태그는 기존 태그에 이어 붙이기 (중복 제거)
      const existing = (v.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const merged = [...new Set([...existing, ...out.tags])].slice(0, 20)
      form.setValue('tags', merged.join(', '), opts)
      setMissing(out.missing_info)
      toast.success('AI 초안을 채웠어요. 내용을 확인한 뒤 저장해 주세요.')
    })
  }

  return (
    <Card className="gap-3 border-primary/30 bg-primary/5 p-4">
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            AI로 문구 작성
          </CardTitle>
          <CardDescription>
            상품명·모델명·제조사·사양을 바탕으로 간략설명, 상세 내용, 태그, 검색용 문구 초안을 만들어요. 입력하지 않은
            사양은 지어내지 않아요.
          </CardDescription>
        </div>
        <Button type="button" onClick={run} disabled={isPending} className="shrink-0">
          <Sparkles className="size-4" />
          {isPending ? '작성 중… (10~30초)' : 'AI로 작성'}
        </Button>
      </CardHeader>
      {missing.length > 0 ? (
        <CardContent className="p-0">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <p className="mb-1 flex items-center gap-1 font-semibold">
              <TriangleAlert className="size-3.5" />
              채우면 좋은 정보 (구매자가 궁금해할 내용)
            </p>
            <ul className="list-disc pl-5">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}
