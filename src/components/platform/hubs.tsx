// 허브(배너 광고) 화면 — 메인: 스마트·파트너·와이드·플러스 / 분류·검색: 프리미엄·스페셜·멤버스
// 배너 관리의 텍스트·색상·상품 칸을 그룹별 약속(배너 관리 안내 글)대로 화면에 그립니다.

import Link from 'next/link'
import { ArrowRight, Phone, Store } from 'lucide-react'

import { AdLink } from '@/components/platform/ad-link'
import { CONDITION_BADGE_CLASS } from '@/components/store/product-detail/labels'
import { embedHtml } from '@/lib/embed-html'
import { inlineHtml } from '@/lib/inline-html'
import { formatPrice } from '@/lib/money'
import { fetchPlatformCardsByIds, type PlatformProductCard } from '@/lib/platform-products'
import { cn } from '@/lib/utils'
import type { LiveBanner } from '@/modules/ads/live'

// ------------------------------------------------------------------ 공통 도우미

const txt = (b: LiveBanner, i: number) => b.texts[i]?.text?.trim() ?? ''
const plain = (b: LiveBanner, i: number) => txt(b, i).replace(/<[^>]+>/g, '').trim()
const color = (b: LiveBanner, i: number) => b.colors[i] || undefined

/** 텍스트 칸 하나 (굵게·크기·색은 배너 관리 설정을 따름) */
function T({
  b,
  i,
  as: Tag = 'p',
  className,
  fallbackColor,
}: {
  b: LiveBanner
  i: number
  as?: 'p' | 'h3' | 'span'
  className?: string
  fallbackColor?: string
}) {
  const t = b.texts[i]
  if (!t?.text?.trim()) return null
  return (
    <Tag
      className={cn('whitespace-pre-line', className)}
      style={{
        color: t.color && t.color !== '#000000' ? t.color : fallbackColor,
        fontWeight: t.bold ? 700 : undefined,
        fontSize: t.pc_size ? `${t.pc_size}px` : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: inlineHtml(t.text) }}
    />
  )
}

/** "신품"/"중고" 글자 → 배지 */
function ConditionBadge({ value, className }: { value: string; className?: string }) {
  const v = value.replace(/<[^>]+>/g, '').trim()
  const cond = v === '신품' ? 'new' : v === '중고' ? 'used' : null
  if (!cond) return null
  return <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-bold', CONDITION_BADGE_CLASS[cond], className)}>{v}</span>
}

function HubHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 flex flex-col gap-0.5">
      <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function MiniProduct({ p, dark }: { p: PlatformProductCard; dark?: boolean }) {
  return (
    <Link
      href={`/minishop/${p.orgSlug}/products/${p.card.product_no}`}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-lg border transition-colors',
        dark ? 'border-white/20 bg-white/95 text-foreground hover:bg-white' : 'border-border bg-card hover:border-primary/40',
      )}
    >
      <span className="aspect-square w-full overflow-hidden bg-[#e9e9e9]">
        {p.card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.card.image} alt="" loading="lazy" className="size-full object-contain" />
        ) : null}
      </span>
      <span className="flex flex-col gap-0.5 p-2">
        <span className="line-clamp-2 text-xs font-medium">{p.card.name}</span>
        <span className="text-xs font-bold text-red-600">{formatPrice(p.card.price)}</span>
      </span>
    </Link>
  )
}

/** 배너들의 연결 상품을 한 번에 불러와 배너별로 나눔 */
async function productsFor(banners: LiveBanner[], max: number): Promise<Map<string, PlatformProductCard[]>> {
  const ids = [...new Set(banners.flatMap((b) => b.product_ids.slice(0, max)))]
  const cards = await fetchPlatformCardsByIds(ids)
  const byId = new Map(cards.map((c) => [c.card.id, c]))
  return new Map(
    banners.map((b) => [
      b.id,
      b.product_ids.slice(0, max).flatMap((id) => (byId.has(id) ? [byId.get(id) as PlatformProductCard] : [])),
    ]),
  )
}

// ================================================================== 메인 허브

/** 스마트 허브 — 정사각형 카드 4칸: 사진 + 회사명·설명·신품/중고 */
export function SmartHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  return (
    <section>
      <HubHeader title="스마트 허브" description="지금 주목받는 공급사와 제품을 한눈에 만나보세요." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {banners.slice(0, 8).map((b) => (
          <AdLink key={b.id} bannerId={b.id} href={b.link_url} title={b.title} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card">
            <span className="relative aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image_pc} alt={b.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">AD</span>
            </span>
            <span className="flex flex-col gap-1 p-3">
              <span className="flex items-center gap-1.5">
                <T b={b} i={0} as="span" className="truncate text-sm font-bold" fallbackColor={color(b, 0)} />
                <ConditionBadge value={txt(b, 2)} />
              </span>
              <T b={b} i={1} className="line-clamp-2 text-xs text-muted-foreground" fallbackColor={color(b, 1)} />
            </span>
          </AdLink>
        ))}
      </div>
    </section>
  )
}

/** 파트너 허브 — 세로 카드 4칸: 사진 + 회사명·설명·연락처·신품/중고 (+ 작은 제품) */
export async function PartnerHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  const products = await productsFor(banners, 3)
  return (
    <section>
      <HubHeader title="파트너 허브" description="파트너의 가치와 트렌드를 깊이 있게 연결합니다." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {banners.slice(0, 8).map((b) => {
          const items = products.get(b.id) ?? []
          return (
            <div key={b.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
              <AdLink bannerId={b.id} href={b.link_url} title={b.title} className="group block">
                <span className="relative block aspect-[300/367] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_pc} alt={b.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-2 right-2">
                    <ConditionBadge value={txt(b, 3)} />
                  </span>
                </span>
                <span className="flex flex-col gap-1 p-3">
                  <T b={b} i={0} as="span" className="truncate text-sm font-bold" fallbackColor={color(b, 0)} />
                  <T b={b} i={1} className="line-clamp-2 text-xs text-muted-foreground" fallbackColor={color(b, 1)} />
                  <T b={b} i={2} className="text-xs font-semibold" fallbackColor={color(b, 2)} />
                </span>
              </AdLink>
              {items.length > 0 ? (
                <div className="mt-auto grid grid-cols-3 gap-1.5 border-t border-border p-2">
                  {items.map((p) => (
                    <Link key={p.card.id} href={`/minishop/${p.orgSlug}/products/${p.card.product_no}`} title={p.card.name} className="aspect-square overflow-hidden rounded bg-[#e9e9e9]">
                      {p.card.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.card.image} alt="" loading="lazy" className="size-full object-contain" />
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** 와이드 허브 — 가로 띠: 이미지 위 왼쪽에 큰 문구·회사명/전화 */
export function WideHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      {banners.slice(0, 3).map((b) => (
        <AdLink key={b.id} bannerId={b.id} href={b.link_url} title={b.title} className="group relative block overflow-hidden rounded-xl border border-border">
          <picture>
            <source media="(max-width: 639px)" srcSet={b.image_mobile} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image_pc} alt={b.title} loading="lazy" className="aspect-[5/2] w-full object-cover sm:aspect-[1400/180]" />
          </picture>
          {txt(b, 0) || txt(b, 1) ? (
            <span className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center gap-1 px-5 sm:px-10">
              <T b={b} i={0} className="text-base leading-snug font-extrabold drop-shadow sm:text-2xl" fallbackColor={color(b, 0) ?? '#ffffff'} />
              <T b={b} i={1} className="text-xs drop-shadow sm:text-sm" fallbackColor={color(b, 1) ?? '#ffffff'} />
            </span>
          ) : null}
          <span className="absolute top-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">AD</span>
        </AdLink>
      ))}
    </section>
  )
}

/** 플러스 허브 — 두 칸 가로 광고: 이미지 위 회사명·전화 + 설명 */
export function PlusHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {banners.slice(0, 6).map((b) => (
        <AdLink key={b.id} bannerId={b.id} href={b.link_url} title={b.title} className="group relative block overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image_pc} alt={b.title} loading="lazy" className="aspect-[685/180] w-full object-cover" />
          {txt(b, 0) || txt(b, 1) ? (
            <span className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center gap-1 px-5">
              <T b={b} i={0} className="text-sm font-bold drop-shadow sm:text-base" fallbackColor={color(b, 0) ?? '#ffffff'} />
              <T b={b} i={1} className="text-xs leading-snug drop-shadow" fallbackColor={color(b, 1) ?? '#ffffff'} />
            </span>
          ) : null}
        </AdLink>
      ))}
    </section>
  )
}

// ================================================================== 분류·검색 허브

/** 프리미엄 허브 — 큰 홍보 카드 2칸 (이미지 또는 영상 + 회사명·제목·설명·전화) */
export function PremiumHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  return (
    <section>
      <HubHeader title="프리미엄 허브" description="이 분야를 대표하는 공급사를 먼저 만나보세요." />
      <div className="grid gap-4 md:grid-cols-2">
        {banners.slice(0, 6).map((b) => {
          const video = embedHtml(b.html)
          const phone = plain(b, 3)
          return (
            <div key={b.id} className="flex flex-col overflow-hidden rounded-2xl border border-border" style={{ background: color(b, 0) }}>
              {video ? (
                <div
                  className="relative aspect-video bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_video]:size-full"
                  dangerouslySetInnerHTML={{ __html: video }}
                />
              ) : (
                <AdLink bannerId={b.id} href={b.link_url} title={b.title} className="group block overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_pc} alt={b.title} loading="lazy" className="aspect-[8/5] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </AdLink>
              )}
              <div className="flex flex-1 flex-col gap-1.5 p-5" style={{ color: color(b, 1) }}>
                <T b={b} i={0} as="span" className="text-xs font-semibold opacity-80" />
                <T b={b} i={1} as="h3" className="text-lg leading-snug font-extrabold sm:text-xl" />
                <T b={b} i={2} className="text-sm leading-relaxed opacity-90" />
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  {phone ? (
                    <a href={`tel:${phone.replace(/[^\d]/g, '')}`} className="inline-flex items-center gap-1 text-sm font-bold">
                      <Phone className="size-4" />
                      {phone}
                    </a>
                  ) : null}
                  {b.link_url ? (
                    <AdLink bannerId={b.id} href={b.link_url} className="ml-auto inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
                      자세히 보기
                      <ArrowRight className="size-4" />
                    </AdLink>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** 스페셜 허브 — 색 카드: 썸네일 + 회사명·제목·품목·전화 + 미니샵 버튼 + 대표 제품 2개 */
export async function SpecialHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  const products = await productsFor(banners, 2)
  return (
    <section>
      <HubHeader title="스페셜 허브" description="믿을 수 있는 파트너십에 특별한 가치를 더해드립니다." />
      <div className="flex flex-col gap-4">
        {banners.slice(0, 20).map((b) => {
          const items = products.get(b.id) ?? []
          const fg = color(b, 1) ?? '#ffffff'
          const phone = plain(b, 3)
          return (
            <div
              key={b.id}
              className="grid gap-4 rounded-2xl p-4 sm:p-6 md:grid-cols-[180px_1fr_auto] md:items-center"
              style={{ background: color(b, 0) ?? 'var(--primary)', color: fg }}
            >
              <AdLink bannerId={b.id} href={b.link_url} title={b.title} className="block overflow-hidden rounded-xl bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image_pc} alt={b.title} loading="lazy" className="aspect-square w-full object-cover" />
              </AdLink>
              <div className="flex min-w-0 flex-col gap-1.5">
                <T b={b} i={0} as="span" className="text-sm font-semibold opacity-90" />
                <T b={b} i={1} as="h3" className="text-xl leading-snug font-extrabold sm:text-2xl" />
                {phone ? (
                  <a href={`tel:${phone.replace(/[^\d]/g, '')}`} className="w-fit text-sm font-bold">
                    TEL : {phone}
                  </a>
                ) : null}
                <T b={b} i={2} className="line-clamp-2 text-xs opacity-80" />
                {b.link_url ? (
                  <AdLink
                    bannerId={b.id}
                    href={b.link_url}
                    className="mt-2 inline-flex h-9 w-fit items-center gap-1 rounded-full px-4 text-sm font-semibold text-white shadow-sm"
                    style={{ background: color(b, 3) ?? '#e5361b' }}
                  >
                    <Store className="size-4" />
                    미니샵 바로가기
                  </AdLink>
                ) : null}
              </div>
              {items.length > 0 ? (
                <div className="grid w-full grid-cols-2 gap-2 md:w-72">
                  {items.map((p) => (
                    <MiniProduct key={p.card.id} p={p} dark />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** 멤버스 허브 — 회사 카드 + 대표 제품 4개 */
export async function MembersHub({ banners }: { banners: LiveBanner[] }) {
  if (banners.length === 0) return null
  const products = await productsFor(banners, 4)
  return (
    <section>
      <HubHeader title="멤버스 허브" description="회원 공급사의 서비스와 제품을 한곳에서 연결합니다." />
      <div className="flex flex-col gap-4">
        {banners.slice(0, 30).map((b) => {
          const items = products.get(b.id) ?? []
          const phone = plain(b, 2)
          return (
            <div key={b.id} className="grid gap-4 rounded-2xl border border-border p-4 lg:grid-cols-[320px_1fr]" style={{ background: color(b, 0) }}>
              <div className="flex gap-3">
                <AdLink bannerId={b.id} href={b.link_url} title={b.title} className="size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_pc} alt={b.title} loading="lazy" className="size-full object-cover" />
                </AdLink>
                <div className="flex min-w-0 flex-col gap-1">
                  <T b={b} i={0} as="h3" className="truncate text-base font-extrabold" fallbackColor={color(b, 1)} />
                  <T b={b} i={1} className="line-clamp-2 text-xs text-muted-foreground" />
                  {phone ? (
                    <a href={`tel:${phone.replace(/[^\d]/g, '')}`} className="w-fit text-sm font-bold" style={{ color: color(b, 3) ?? '#d1180b' }}>
                      {phone}
                    </a>
                  ) : null}
                  <T b={b} i={3} className="line-clamp-2 text-xs text-muted-foreground" />
                  {b.link_url ? (
                    <AdLink bannerId={b.id} href={b.link_url} className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:border-primary">
                      미니샵 바로가기
                      <ArrowRight className="size-3" />
                    </AdLink>
                  ) : null}
                </div>
              </div>
              {items.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {items.map((p) => (
                    <MiniProduct key={p.card.id} p={p} />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
