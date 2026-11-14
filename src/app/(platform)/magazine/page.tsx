// 매거진 목록

import type { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { Newspaper } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { mediaUrl } from '@/lib/media-url'
import { SITE_NAME } from '@/lib/site'
import { getAnonClient } from '@/lib/supabase/anon'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `매거진 · ${SITE_NAME}`,
  description: '산업기계·중고기계 업계 소식, 기계 고르는 법, 공급사 이야기를 전합니다.',
}

export default async function MagazinePage() {
  const { data } = await getAnonClient()
    .from('site_contents')
    .select('id, title, thumbnail, summary, published_at')
    .eq('kind', 'magazine')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(60)
  const rows = (data ?? []) as { id: string; title: string; thumbnail: string | null; summary: string | null; published_at: string }[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-xl font-bold sm:text-2xl">MAGAZINE</h1>
      <p className="mb-6 text-sm text-muted-foreground">기계 업계 소식과 정보</p>
      {rows.length === 0 ? (
        <EmptyState icon={Newspaper} title="아직 매거진 글이 없어요" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <Link key={m.id} href={`/magazine/${m.id}`} className="group flex flex-col gap-2">
              <span className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                {m.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(m.thumbnail)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : null}
              </span>
              <span className="line-clamp-2 font-semibold group-hover:underline">{m.title}</span>
              {m.summary ? <span className="line-clamp-2 text-sm text-muted-foreground">{m.summary}</span> : null}
              <span className="text-xs text-muted-foreground">{format(new Date(m.published_at), 'yyyy.MM.dd')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
