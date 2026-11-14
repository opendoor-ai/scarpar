'use client'

// Shared create/edit product form (docs/conventions.md — Forms: RHF +
// zodResolver + ui/form helpers). Base fields are one RHF form; variants and
// images are separate controlled-array editors saved via their own actions
// (saveVariants/saveImages) right after createProduct/updateProduct resolves
// — see the module-level submit orchestration below.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { fromPaisa, toPaisa } from '@/lib/money'
import type { Product, ProductImage, ProductVariant } from '@/types/db'

import { createProduct, deleteProduct, saveImages, saveVariants, updateProduct } from '../actions'
import { productFormSchema, type ProductActionInput, type ProductFormValues } from '../schemas'
import { ImageGallery, fromImageRow, toImageRow, type ImageRow } from './image-gallery'
import { AiCopyPanel } from './ai-copy-panel'
import { CategoryTwoLevelSelect } from './category-two-level-select'
import { DetailHtmlEditor } from './detail-html-editor'
import { VariantEditor, fromVariantRow, newVariantRow, toVariantRow, type VariantRow } from './variant-editor'

import type { CategoryOption } from '../category-options'

export type { CategoryOption }

interface ProductFormProps {
  mode: 'create' | 'edit'
  product?: Product
  variants?: ProductVariant[]
  images?: (ProductImage & { path: string })[]
  categories: CategoryOption[]
}

const NONE_CONDITION = '__none__'

function toFormValues(product?: Product): ProductFormValues {
  if (!product) {
    return {
      name: '',
      description: '',
      brand: '',
      category_id: null,
      status: 'draft',
      price: '',
      compare_at_price: '',
      cost_price: '',
      sku: '',
      barcode: '',
      hs_code: '',
      track_stock: true,
      stock_qty: 0,
      low_stock_threshold: 5,
      allow_backorder: false,
      weight_grams: '',
      tags: '',
      is_featured: false,
      condition: '',
      model_name: '',
      spec_summary: '',
      short_description: '',
      detail_html: '',
      seo_title: '',
      seo_description: '',
    }
  }

  return {
    name: product.name,
    description: product.description ?? '',
    brand: product.brand ?? '',
    category_id: product.category_id,
    status: product.status,
    price: String(Math.round(fromPaisa(product.price))),
    compare_at_price: product.compare_at_price != null ? String(Math.round(fromPaisa(product.compare_at_price))) : '',
    cost_price: product.cost_price != null ? String(Math.round(fromPaisa(product.cost_price))) : '',
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    hs_code: product.hs_code ?? '',
    track_stock: product.track_stock,
    stock_qty: product.stock_qty,
    low_stock_threshold: product.low_stock_threshold,
    allow_backorder: product.allow_backorder,
    weight_grams: product.weight_grams != null ? String(product.weight_grams) : '',
    tags: (product.tags ?? []).join(', '),
    is_featured: product.is_featured,
    condition: product.condition ?? '',
    model_name: product.model_name ?? '',
    spec_summary: product.spec_summary ?? '',
    short_description: product.short_description ?? '',
    detail_html: product.detail_html ?? '',
    seo_title: typeof product.seo?.title === 'string' ? product.seo.title : '',
    seo_description: typeof product.seo?.description === 'string' ? product.seo.description : '',
  }
}

function toActionInput(values: ProductFormValues): ProductActionInput {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description.trim() : null,
    brand: values.brand?.trim() ? values.brand.trim() : null,
    category_id: values.category_id,
    status: values.status,
    price: toPaisa(values.price),
    compare_at_price: values.compare_at_price?.trim() ? toPaisa(values.compare_at_price) : null,
    cost_price: values.cost_price?.trim() ? toPaisa(values.cost_price) : null,
    sku: values.sku?.trim() ? values.sku.trim() : null,
    barcode: values.barcode?.trim() ? values.barcode.trim() : null,
    hs_code: values.hs_code?.trim() ? values.hs_code.trim() : null,
    track_stock: values.track_stock,
    stock_qty: values.stock_qty,
    low_stock_threshold: values.low_stock_threshold,
    allow_backorder: values.allow_backorder,
    weight_grams: values.weight_grams?.trim() ? Math.round(Number(values.weight_grams)) : null,
    tags: values.tags
      ? values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    is_featured: values.is_featured,
    condition: values.condition ? values.condition : null,
    model_name: values.model_name?.trim() ? values.model_name.trim() : null,
    spec_summary: values.spec_summary?.trim() ? values.spec_summary.trim() : null,
    short_description: values.short_description?.trim() ? values.short_description.trim() : null,
    detail_html: values.detail_html?.trim() ? values.detail_html.trim() : null,
    seo_title: values.seo_title?.trim() ? values.seo_title.trim() : null,
    seo_description: values.seo_description?.trim() ? values.seo_description.trim() : null,
  }
}

function ProductForm({ mode, product, variants, images, categories }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [variantRows, setVariantRows] = useState<VariantRow[]>(() => (variants ?? []).map(toVariantRow))
  const [hasVariants, setHasVariants] = useState((variants?.length ?? 0) > 0)
  const [imageRows, setImageRows] = useState<ImageRow[]>(() => (images ?? []).map(toImageRow))

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product),
  })

  const persistedVariantOptions = variantRows
    .filter((row): row is VariantRow & { id: string } => Boolean(row.id))
    .map((row) => ({ id: row.id, name: row.name || '이름 없음' }))

  async function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      const input = toActionInput(values)
      const result = mode === 'create' ? await createProduct(input) : await updateProduct(product!.id, input)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const productId = mode === 'create' ? result.data!.id : product!.id

      const [variantsResult, imagesResult] = await Promise.all([
        saveVariants({
          product_id: productId,
          variants: (hasVariants ? variantRows : []).map((row, i) => fromVariantRow(row, i)),
        }),
        saveImages({
          product_id: productId,
          images: imageRows.map((row, i) => fromImageRow(row, i)),
        }),
      ])

      if (!variantsResult.ok) {
        toast.error(`상품은 저장됐지만 옵션 저장에 실패했습니다: ${variantsResult.error}`)
        return
      }
      if (!imagesResult.ok) {
        toast.error(`상품은 저장됐지만 사진 저장에 실패했습니다: ${imagesResult.error}`)
        return
      }

      toast.success(mode === 'create' ? '상품이 등록되었습니다' : '상품이 수정되었습니다')

      if (mode === 'create') {
        router.push(`/admin/products/${productId}`)
      } else {
        router.refresh()
      }
    })
  }

  async function handleDelete() {
    if (!product) return
    const result = await deleteProduct(product.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('상품이 삭제되었습니다')
    router.push('/admin/products')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-0">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상품명</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상품 설명</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>제조사/브랜드</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>카테고리</FormLabel>
                        <CategoryTwoLevelSelect
                          categories={categories}
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-4 p-4">
              <CardHeader className="flex-row items-center justify-between p-0">
                <CardTitle>제품 정보</CardTitle>
                <span className="text-xs text-muted-foreground">
                  상품코드{' '}
                  <span className="font-semibold text-foreground tabular-nums">
                    {product?.product_no ? `P${product.product_no}` : '저장하면 자동 부여'}
                  </span>
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-0">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>상태</FormLabel>
                        <Select
                          value={field.value || NONE_CONDITION}
                          onValueChange={(v) => field.onChange(v === NONE_CONDITION ? '' : v)}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE_CONDITION}>선택 안 함</SelectItem>
                            <SelectItem value="new">신품</SelectItem>
                            <SelectItem value="used">중고</SelectItem>
                            <SelectItem value="refurbished">리퍼(재생)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>모델명</FormLabel>
                        <FormControl>
                          <Input placeholder="예: VX650" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="spec_summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제품사양 (한 줄 요약)</FormLabel>
                      <FormControl>
                        <Input placeholder="예: X축 650mm, 주축 8,000rpm, 툴 24개" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="short_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>간략설명</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 정밀 가공용 수직 머시닝센터, 실가동 상태 양호" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>사진</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ImageGallery value={imageRows} onChange={setImageRows} variantOptions={persistedVariantOptions} />
              </CardContent>
            </Card>

            <AiCopyPanel form={form} categories={categories} />

            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>상세 내용</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FormField
                  control={form.control}
                  name="detail_html"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <DetailHtmlEditor value={field.value ?? ''} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>검색 노출 문구</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-0">
                <FormField
                  control={form.control}
                  name="seo_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>검색 결과 제목 (비우면 상품명 사용)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} maxLength={70} placeholder="예: 현대위아 VX650 수직 머시닝센터 중고" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seo_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>검색 결과 설명 (비우면 간략설명·상품 설명 사용)</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} value={field.value ?? ''} maxLength={160} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="gap-4 p-4">
              <CardHeader className="flex-row items-center justify-between p-0">
                <CardTitle>옵션</CardTitle>
                <label className="flex items-center gap-2 text-xs font-medium">
옵션 있음
                  <Switch
                    checked={hasVariants}
                    onCheckedChange={(checked) => {
                      setHasVariants(checked)
                      if (checked && variantRows.length === 0) {
                        setVariantRows([newVariantRow(true)])
                      }
                    }}
                  />
                </label>
              </CardHeader>
              {hasVariants ? (
                <CardContent className="p-0">
                  <VariantEditor value={variantRows} onChange={setVariantRows} />
                </CardContent>
              ) : (
                <CardContent className="p-0">
                  <p className="text-muted-foreground text-xs">
                    꺼짐 — 아래 가격·재고에 입력한 하나의 가격과 재고로 판매합니다.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>상태</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-0">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>노출 상태</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">임시저장</SelectItem>
                          <SelectItem value="active">판매중(공개)</SelectItem>
                          <SelectItem value="archived">보관(비공개)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-2">
                      <FormLabel className="text-foreground text-xs">추천 상품</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>가격</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-0">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>판매가 (원)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="compare_at_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정가 (할인 전, 원)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>원가 (원)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="gap-4 p-4">
              <CardHeader className="p-0">
                <CardTitle>재고</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-0">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>바코드</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="hs_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HS 코드</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="track_stock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-2">
                      <FormLabel className="text-foreground text-xs">재고 관리</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_qty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>재고 수량</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={String(field.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="low_stock_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>재고 부족 기준</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={String(field.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="allow_backorder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-2">
                      <FormLabel className="text-foreground text-xs">품절 시에도 주문 허용</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight_grams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>무게 (g)</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>태그</FormLabel>
                      <FormControl>
                        <Input placeholder="쉼표로, 구분해서, 입력" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {mode === 'edit' && product ? (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="outline">
상품 삭제
                  </Button>
                }
                title="이 상품을 삭제할까요?"
                description={`"${product.name}" 상품이 완전히 삭제됩니다. 지난 주문 내역은 그대로 남습니다.`}
                confirmLabel="삭제"
                destructive
                onConfirm={handleDelete}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중...' : mode === 'create' ? '상품 등록' : '변경사항 저장'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export { ProductForm }
