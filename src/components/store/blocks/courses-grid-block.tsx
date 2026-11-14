import { mediaUrl } from '@/lib/media-url'
import { formatMoney } from '@/lib/money'
import { getAnonClient } from '@/lib/supabase/anon'
import type { Course, CoursesGridBlock, Media } from '@/types/db'

import type { BlockRenderContext } from './render-blocks'

type CourseRow = Pick<Course, 'id' | 'title' | 'description' | 'price' | 'cover_media_id'>

// No public course detail route exists in this storefront (docs/architecture.md's route map
// lists no (store)/minishop/[org]/course/[slug] page) — cards are informational only, per the block
// spec ("coursesGrid (active courses cards)").
export async function CoursesGridBlockView({ block, ctx }: { block: CoursesGridBlock; ctx: BlockRenderContext }) {
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('courses')
    .select('id, title, description, price, cover_media_id')
    .eq('org_id', ctx.org.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(block.limit ?? 6)

  const courses = (data ?? []) as CourseRow[]
  if (courses.length === 0) return null

  const mediaIds = courses.map((c) => c.cover_media_id).filter((id): id is string => Boolean(id))
  let mediaPaths = new Map<string, string>()
  if (mediaIds.length > 0) {
    const { data: mediaRows } = await supabase.from('media').select('id, path').in('id', mediaIds)
    mediaPaths = new Map(((mediaRows ?? []) as Pick<Media, 'id' | 'path'>[]).map((m) => [m.id, m.path]))
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="mb-5 text-lg font-semibold">강의</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => {
          const path = c.cover_media_id ? mediaPaths.get(c.cover_media_id) : undefined
          return (
            <div key={c.id} className="flex flex-col overflow-hidden rounded-lg border border-border">
              <div className="aspect-video w-full bg-muted">
                {path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(path)} alt={c.title} className="size-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <p className="text-sm font-medium">{c.title}</p>
                {c.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                ) : null}
                <p className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(c.price)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
