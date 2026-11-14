import { notFound } from 'next/navigation'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getServerClient } from '@/lib/supabase/server'
import type { CmsPage } from '@/types/db'
import type { PageProps } from '@/lib/types'
import { PageEditor } from '@/modules/cms/components/page-editor'
import type { RevisionRow } from '@/modules/cms/components/revision-history'

export const dynamic = 'force-dynamic'

export default async function CmsPageEditorPage({ params }: PageProps<{ id: string }>) {
  const { id } = await params
  const ctx = await requireOrg()
  requireModule(ctx.org, 'cms')

  const supabase = await getServerClient()

  const [{ data: page }, { data: categories }, { data: revisions }] = await Promise.all([
    supabase.from('cms_pages').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    // 플랫폼 공통 카테고리 ("1차 / 2차" 이름으로 표시)
    getPlatformCategories().then((rows) => {
      const nameById = new Map(rows.map((r) => [r.id, r.name]))
      return {
        data: rows.map((r) => ({
          id: r.id,
          name: r.parent_id ? `${nameById.get(r.parent_id) ?? ''} / ${r.name}` : r.name,
        })),
      }
    }),
    supabase
      .from('cms_revisions')
      .select('id, created_at, saved_by')
      .eq('page_id', id)
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!page) notFound()

  const savedByIds = Array.from(
    new Set(
      ((revisions ?? []) as { saved_by: string | null }[])
        .map((r) => r.saved_by)
        .filter((v): v is string => Boolean(v)),
    ),
  )

  let profileNames: Record<string, string> = {}
  if (savedByIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', savedByIds)
    profileNames = Object.fromEntries(
      ((profiles ?? []) as { user_id: string; full_name: string | null }[]).map((p) => [
        p.user_id,
        p.full_name ?? '알 수 없음',
      ]),
    )
  }

  const revisionRows: RevisionRow[] = ((revisions ?? []) as { id: number; created_at: string; saved_by: string | null }[]).map(
    (r) => ({
      id: r.id,
      created_at: r.created_at,
      savedByName: r.saved_by ? profileNames[r.saved_by] ?? '알 수 없음' : '시스템',
    }),
  )

  return (
    <PageEditor
      key={`${page.id}-${page.updated_at}`}
      page={page as CmsPage}
      orgSlug={ctx.org.slug}
      orgName={ctx.org.name}
      categories={(categories ?? []) as { id: string; name: string }[]}
      revisions={revisionRows}
    />
  )
}
