'use client'

// 상품 등록·수정 화면 (카페24 상품 등록 구성 참고, 기계 광고에 실제로 쓰는 항목만)
// 표시 설정 → 기본 정보 → 판매 정보 → 이미지 → 아이콘 → 제작 정보 → 상세설명 → 검색엔진 최적화 → (접힘) 추가 설정
// 기본 항목은 하나의 RHF 폼이고, 옵션·사진은 저장 직후 각자의 작업(saveVariants/saveImages)으로 저장합니다.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  BADGE_CLASS,
  BADGE_LABEL,
  CONDITION_BADGE_CLASS,
  CONDITION_LABEL,
  PRODUCT_BADGES,
  isProductBadge,
} from '@/components/store/product-detail/labels'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { fromMinor, toMinor } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Product, ProductImage, ProductVariant } from '@/types/db'

import { createProduct, deleteProduct, saveImages, saveVariants, updateProduct } from '../actions'
import { productFormSchema, type ProductActionInput, type ProductFormValues } from '../schemas'
import { AiCopyPanel } from './ai-copy-panel'
import { CategoryTwoLevelSelect } from './category-two-level-select'
import { DetailHtmlEditor } from './detail-html-editor'
import { ImageGallery, fromImageRow, toImageRow, type ImageRow } from './image-gallery'
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

const SECTIONS = [
  ['display', '표시 설정'],
  ['basic', '기본 정보'],
  ['sale', '판매 정보'],
  ['images', '이미지'],
  ['icons', '아이콘'],
  ['make', '제작 정보'],
  ['detail', '상세설명'],
  ['seo', '검색엔진 최적화'],
  ['more', '추가 설정'],
] as const

function toFormValues(product?: Product): ProductFormValues {
  if (!product) {
    return {
      name: '',
      description: '',
      brand: '',
      category_id: null,
      status: 'active',
      price: '0',
      compare_at_price: '',
      cost_price: '',
      sku: '',
      barcode: '',
      hs_code: '',
      track_stock: false,
      stock_qty: 0,
      low_stock_threshold: 0,
      allow_backorder: true,
      weight_grams: '',
      tags: '',
      is_featured: false,
      condition: '',
      model_name: '',
      badges: ['direct'],
      origin: '',
      manufacture_year: '',
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
    price: String(Math.round(fromMinor(product.price))),
    compare_at_price: product.compare_at_price != null ? String(Math.round(fromMinor(product.compare_at_price))) : '',
    cost_price: product.cost_price != null ? String(Math.round(fromMinor(product.cost_price))) : '',
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
    badges: (product.badges ?? []).filter(isProductBadge),
    origin: product.origin ?? '',
    manufacture_year: product.manufacture_year ? String(product.manufacture_year) : '',
    spec_summary: product.spec_summary ?? '',
    short_description: product.short_description ?? '',
    detail_html: product.detail_html ?? '',
    seo_title: typeof product.seo?.title === 'string' ? product.seo.title : '',
    seo_description: typeof product.seo?.description === 'string' ? product.seo.description : '',
  }
}

function toActionInput(values: ProductFormValues): ProductActionInput {
  const opt = (v?: string) => (v?.trim() ? v.trim() : null)
  return {
    name: values.name,
    description: opt(values.description),
    brand: opt(values.brand),
    category_id: values.category_id,
    status: values.status,
    price: toMinor(values.price || '0'),
    compare_at_price: values.compare_at_price?.trim() ? toMinor(values.compare_at_price) : null,
    cost_price: values.cost_price?.trim() ? toMinor(values.cost_price) : null,
    sku: opt(values.sku),
    barcode: opt(values.barcode),
    hs_code: opt(values.hs_code),
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
    model_name: opt(values.model_name),
    badges: values.badges.filter(isProductBadge),
    origin: opt(values.origin),
    manufacture_year: values.manufacture_year?.trim() ? Number(values.manufacture_year) : null,
    spec_summary: opt(values.spec_summary),
    short_description: opt(values.short_description),
    detail_html: opt(values.detail_html),
    seo_title: opt(values.seo_title),
    seo_description: opt(values.seo_description),
  }
}

// ------------------------------------------------------------------ 화면 틀 (카페24식 표)

function Section({
  id,
  title,
  description,
  children,
  right,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-16 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {right}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

function Row({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 px-4 py-3 md:grid-cols-[170px_1fr] md:items-start">
      <div className="pt-2 text-sm font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-1 rounded bg-red-500 px-1 py-px text-[10px] font-bold text-white">필수</span> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
      <input type="radio" checked={checked} onChange={onChange} className="accent-primary" />
      {label}
    </label>
  )
}

// ------------------------------------------------------------------ 상품 등록 화면

function ProductForm({ mode, product, variants, images, categories }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [variantRows, setVariantRows] = useState<VariantRow[]>(() => (variants ?? []).map(toVariantRow))
  const [hasVariants, setHasVariants] = useState((variants?.length ?? 0) > 0)
  const [imageRows, setImageRows] = useState<ImageRow[]>(() => (images ?? []).map(toImageRow))
  const [moreOpen, setMoreOpen] = useState(false)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product),
  })
  const price = form.watch('price')
  const negotiable = !price || Number(price) === 0
  const condition = form.watch('condition')
  const badges = form.watch('badges')

  const persistedVariantOptions = variantRows
    .filter((row): row is VariantRow & { id: string } => Boolean(row.id))
    .map((row) => ({ id: row.id, name: row.name || '이름 없음' }))

  // 대표이미지 미리보기 (첫 번째 사진)
  const firstImage = imageRows[0] as (ImageRow & { path?: string }) | undefined
  const previewUrl = firstImage?.path ? mediaUrl(firstImage.path) : null

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
        saveImages({ product_id: productId, images: imageRows.map((row, i) => fromImageRow(row, i)) }),
      ])
      if (!variantsResult.ok) return void toast.error(`상품은 저장됐지만 옵션 저장에 실패했습니다: ${variantsResult.error}`)
      if (!imagesResult.ok) return void toast.error(`상품은 저장됐지만 사진 저장에 실패했습니다: ${imagesResult.error}`)

      toast.success(mode === 'create' ? '상품이 등록되었습니다' : '상품이 수정되었습니다')
      router.push('/admin/products')
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!product) return
    const result = await deleteProduct(product.id)
    if (!result.ok) return void toast.error(result.error)
    toast.success('상품이 삭제되었습니다')
    router.push('/admin/products')
  }

  const text = (name: keyof ProductFormValues, placeholder?: string, maxLength?: number) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder={placeholder} maxLength={maxLength} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, () => toast.error('입력값을 확인해 주세요. 빨간 글씨 항목이 있어요.'))} className="flex flex-col gap-5">
        {/* 바로가기 */}
        <nav className="sticky -top-5 z-20 -mx-6 -mt-5 flex gap-1 overflow-x-auto border-b border-border bg-background px-5 py-1.5 shadow-sm [scrollbar-width:none]">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#sec-${id}`} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>

        {/* 1. 표시 설정 */}
        <Section id="display" title="표시 설정">
          <Row label="진열 상태">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <div className="flex flex-wrap gap-4 pt-2">
                  <Radio checked={field.value === 'active'} onChange={() => field.onChange('active')} label="진열함 (고객에게 보임)" />
                  <Radio checked={field.value === 'draft'} onChange={() => field.onChange('draft')} label="진열안함 (임시저장)" />
                  <Radio checked={field.value === 'archived'} onChange={() => field.onChange('archived')} label="보관 (판매 종료)" />
                </div>
              )}
            />
          </Row>
          <Row label="상품 분류" hint="플랫폼 공통 분류예요. 1차 → 2차 순서로 골라요.">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <CategoryTwoLevelSelect categories={categories} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
          <Row label="추천 상품" hint="켜면 미니샵 '추천 제품'과 메인 '스페셜픽'에 보여요.">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <div className="flex h-9 items-center gap-2">
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                  <span className="text-sm text-muted-foreground">{field.value ? '추천함' : '추천 안 함'}</span>
                </div>
              )}
            />
          </Row>
        </Section>

        {/* 2. 기본 정보 */}
        <Section
          id="basic"
          title="기본 정보"
          right={
            <span className="text-xs text-muted-foreground">
              상품코드{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {product?.product_no ? `P${product.product_no}` : '저장하면 자동 부여'}
              </span>
            </span>
          }
        >
          <Row label="상품명" required hint="목록·상세페이지 제목이에요. 예: 천정복사패널, 복사패널 저온형 SR-5SM">
            {text('name', '상품명을 입력하세요', 200)}
          </Row>
          <Row label="모델명" hint="상품명 아래 회색 글씨로 보여요.">
            {text('model_name', '예: SR-5SM, VX650', 200)}
          </Row>
          <Row label="상품 요약설명" hint="상세페이지 정보표의 '제품사양'에 한 줄로 보여요.">
            {text('spec_summary', '예: X축 650mm, 주축 8,000rpm, 툴 24개', 500)}
          </Row>
          <Row label="상품 간략설명" hint="상세페이지 제목 아래와 검색 설명에 쓰여요.">
            {text('short_description', '예: 정밀 가공용 수직 머시닝센터, 실가동 상태 양호', 500)}
          </Row>
          <Row label="검색어 설정" hint="쉼표(,)로 구분해서 입력하세요. 통합 검색에서 이 단어로도 찾을 수 있게 돼요.">
            {text('tags', '예: 머시닝센터, 수직머시닝, 중고머시닝')}
          </Row>
        </Section>

        {/* 3. 판매 정보 */}
        <Section id="sale" title="판매 정보" description="거래는 고객과 공급사가 직접 하고, 화면에는 가격만 안내해요.">
          <Row label="판매가" hint={negotiable ? '숫자를 입력하면 그 가격으로, 비워 두면 "가격협의"로 표시돼요.' : `${Number(price).toLocaleString('ko-KR')}원으로 표시돼요.`}>
            <div className="flex flex-wrap items-center gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-1.5">
                        <Input
                          inputMode="numeric"
                          className="w-48 text-right tabular-nums"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={negotiable ? '' : Number(field.value).toLocaleString('ko-KR')}
                          placeholder="가격협의"
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^\d]/g, '').replace(/^0+/, '')
                            field.onChange(digits || '0')
                          }}
                        />
                        <span className="text-sm">원</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={negotiable}
                  onChange={(e) => {
                    if (e.target.checked) form.setValue('price', '0', { shouldDirty: true })
                    else setTimeout(() => document.querySelector<HTMLInputElement>('input[name="price"]')?.focus(), 0)
                  }}
                />
                가격협의
              </label>
            </div>
          </Row>
        </Section>

        {/* 4. 이미지 */}
        <Section id="images" title="이미지 정보">
          <ImageGallery value={imageRows} onChange={setImageRows} variantOptions={persistedVariantOptions} />
        </Section>

        {/* 5. 아이콘 */}
        <Section id="icons" title="아이콘 설정" description="대표이미지 위에 표시되는 아이콘이에요.">
          <Row label="상품 상태" hint="목록 카드와 상세페이지 대표이미지에 표시돼요.">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Radio checked={!field.value} onChange={() => field.onChange('')} label="표시 안 함" />
                  {(['new', 'used'] as const).map((c) => (
                    <Radio
                      key={c}
                      checked={field.value === c}
                      onChange={() => field.onChange(c)}
                      label={<span className={cn('rounded px-1.5 py-0.5 text-xs font-bold', CONDITION_BADGE_CLASS[c])}>{CONDITION_LABEL[c]}</span>}
                    />
                  ))}
                </div>
              )}
            />
          </Row>
          <Row label="추가 아이콘" hint="여러 개 고를 수 있어요. 대표이미지 왼쪽 위에 보여요.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex flex-wrap gap-3 pt-2">
                {PRODUCT_BADGES.map((b) => (
                  <label key={b} className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={badges.includes(b)}
                      onChange={(e) =>
                        form.setValue(
                          'badges',
                          e.target.checked ? [...badges, b] : badges.filter((x) => x !== b),
                          { shouldDirty: true },
                        )
                      }
                    />
                    <span className={cn('rounded px-1.5 py-0.5 text-xs font-bold', BADGE_CLASS[b])}>{BADGE_LABEL[b]}</span>
                  </label>
                ))}
              </div>
              {/* 미리보기 */}
              <div className="relative size-36 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:ml-auto">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[11px] text-muted-foreground">대표이미지 미리보기</span>
                )}
                <span className="absolute top-1 left-1 flex flex-wrap gap-0.5">
                  {badges.filter(isProductBadge).map((b) => (
                    <span key={b} className={cn('rounded-sm px-1 py-px text-[10px] font-bold', BADGE_CLASS[b])}>
                      {BADGE_LABEL[b]}
                    </span>
                  ))}
                </span>
                {condition ? (
                  <span className={cn('absolute bottom-1 left-1 rounded-sm px-1 py-px text-[10px] font-bold', CONDITION_BADGE_CLASS[condition])}>
                    {CONDITION_LABEL[condition]}
                  </span>
                ) : null}
              </div>
            </div>
          </Row>
        </Section>

        {/* 6. 제작 정보 */}
        <Section id="make" title="제작 정보">
          <Row label="제조사">{text('brand', '예: 현대위아, (주)에너지코리아', 200)}</Row>
          <Row label="연식 (제조연도)" hint="중고 기계는 연식을 꼭 적어 주세요. 4자리 숫자 (예: 2019)">
            <div className="w-40">{text('manufacture_year', '2019', 4)}</div>
          </Row>
          <Row label="원산지">{text('origin', '예: 국산, 일본, 독일', 100)}</Row>
        </Section>

        {/* 7. 상세설명 */}
        <Section id="detail" title="상품 상세설명" description="상세페이지 '제품상세' 탭에 보여요. 표·사진·글을 넣을 수 있어요.">
          <div className="flex flex-col gap-4 p-4">
            <AiCopyPanel form={form} categories={categories} />
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
          </div>
        </Section>

        {/* 8. 검색엔진 최적화 */}
        <Section id="seo" title="검색엔진 최적화 (SEO)" description="네이버·구글 검색 결과에 보이는 문구예요. 비워 두면 자동으로 만들어요.">
          <Row label="브라우저 제목 (Title)" hint="비우면 상품명을 써요. 70자 이내">
            {text('seo_title', '예: 현대위아 VX650 수직 머시닝센터 중고', 70)}
          </Row>
          <Row label="설명 (Description)" hint="비우면 간략설명을 써요. 160자 이내">
            <FormField
              control={form.control}
              name="seo_description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ''} maxLength={160} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
        </Section>

        {/* 9. 추가 설정 (잘 안 쓰는 항목) */}
        <section id="sec-more" className="scroll-mt-16 overflow-hidden rounded-lg border border-dashed border-border">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span>
              <span className="text-sm font-bold">추가 설정 (선택)</span>
              <span className="ml-2 text-xs text-muted-foreground">옵션 · 재고 · 관리코드 · 메모 — 보통은 쓰지 않아요</span>
            </span>
            <ChevronDown className={cn('size-4 transition-transform', moreOpen && 'rotate-180')} />
          </button>
          {moreOpen ? (
            <div className="divide-y divide-border border-t border-border">
              <Row label="옵션 (규격별 가격)">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={hasVariants}
                      onCheckedChange={(checked) => {
                        setHasVariants(checked)
                        if (checked && variantRows.length === 0) setVariantRows([newVariantRow(true)])
                      }}
                    />
                    {hasVariants ? '옵션 사용' : '옵션 사용 안 함'}
                  </label>
                  {hasVariants ? <VariantEditor value={variantRows} onChange={setVariantRows} /> : null}
                </div>
              </Row>
              <Row label="재고 관리" hint="끄면 수량과 상관없이 항상 문의할 수 있어요. (기계 광고는 보통 끔)">
                <div className="flex flex-col gap-3">
                  <FormField
                    control={form.control}
                    name="track_stock"
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        {field.value ? '재고 관리함' : '재고 관리 안 함'}
                      </label>
                    )}
                  />
                  {form.watch('track_stock') ? (
                    <div className="grid max-w-md grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="stock_qty"
                        render={({ field }) => (
                          <FormItem>
                            <span className="text-xs text-muted-foreground">재고 수량</span>
                            <FormControl>
                              <Input type="number" {...field} value={String(field.value)} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="low_stock_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <span className="text-xs text-muted-foreground">재고 부족 알림 기준</span>
                            <FormControl>
                              <Input type="number" {...field} value={String(field.value)} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              </Row>
              <Row label="자체 관리코드">
                <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                  {text('sku', 'SKU')}
                  {text('barcode', '바코드')}
                  {text('weight_grams', '무게(g)')}
                </div>
              </Row>
              <Row label="관리자 메모" hint="고객에게 보이지 않아요.">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={3} {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </Row>
            </div>
          ) : null}
        </section>

        {/* 저장 줄 */}
        <div className="sticky -bottom-5 z-20 -mx-6 -mb-5 border-t border-border bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex h-[47px] items-center justify-between gap-2 px-6">
            <div>
              {mode === 'edit' && product ? (
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="outline">
                      상품 삭제
                    </Button>
                  }
                  title="이 상품을 삭제할까요?"
                  description={`"${product.name}" 상품이 완전히 삭제됩니다.`}
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
              <Button type="submit" disabled={isPending} className="min-w-28">
                {isPending ? '저장 중...' : mode === 'create' ? '상품 등록' : '변경사항 저장'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}

export { ProductForm }
