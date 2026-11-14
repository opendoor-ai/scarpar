// 매거진 글 보기

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronLeft } from 'lucide-react'

import { ProductCard } from '@/components/store/product-card'
import { sanitizeDetailHtml } from '@/lib/detail-html'
import { mediaUrl } from '@/lib/media-url'
import { fetchPlatformCardsByIds } from '@/lib/platform-products'
import { SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Row {
  id: string
  title: string
  thumbnail: string | null
  summary: string | null
  body_html: string | null
  product_id: string | null
  published_at: string
}

async function load(id: string): Promise<Row | null> {
  if (!UUID_RE.test(id)) return null
  const { data } = await getAnonClient()
    .from('site_contents')
    .select('id, title, thumbnail, summary, body_html, product_id, published_at')
    .eq('id', id)
    .eq('kind', 'magazine')
    .eq('is_published', true)
    .maybeSingle()
  return (data as Row | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const row = await load((await params).id)
  if (!row) return {}
  return {
    title: `${row.title} · ${SITE_NAME} 매거진`,
    description: row.summary ?? undefined,
    openGraph: {
      title: row.title,
      description: row.summary ?? undefined,
      images: row.thumbnail ? [mediaUrl(row.thumbnail)] : undefined,
      type: 'article',
      locale: 'ko_KR',
    },
  }
}

export default async function MagazineArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const row = await load((await params).id)
  if (!row) notFound()
  const [product] = row.product_id ? await fetchPlatformCardsByIds([row.product_id]) : []

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/magazine" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        매거진 목록
      </Link>
      <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{row.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{format(new Date(row.published_at), 'yyyy.MM.dd')}</p>
      {row.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(row.thumbnail)} alt="" className="mt-6 w-full rounded-xl border border-border" />
      ) : null}
      {row.summary ? <p className="mt-6 text-base leading-relaxed text-foreground/80">{row.summary}</p> : null}
      {row.body_html ? (
        <div className="detail-html mt-6" dangerouslySetInnerHTML={{ __html: sanitizeDetailHtml(row.body_html) }} />
      ) : null}
      {product ? (
        <section className="mt-10 flex flex-col gap-3">
          <h2 className="text-lg font-bold">이 글에서 소개한 제품</h2>
          <div className="w-1/2 sm:w-1/3">
            <ProductCard orgSlug={product.orgSlug} product={product.card} supplierName={product.orgName} />
          </div>
        </section>
      ) : null}
    </article>
  )
}
