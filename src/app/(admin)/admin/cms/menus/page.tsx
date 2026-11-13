import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import type { MenuItem } from '@/types/db'
import { PageHeader } from '@/components/ui/page-header'
import { MenuEditor } from '@/modules/cms/components/menu-editor'

export const dynamic = 'force-dynamic'

export default async function CmsMenusPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'cms')

  const supabase = await getServerClient()

  const [{ data: menus }, { data: pages }] = await Promise.all([
    supabase.from('menus').select('handle, items').eq('org_id', ctx.org.id),
    supabase.from('cms_pages').select('slug').eq('org_id', ctx.org.id).eq('status', 'published'),
  ])

  const menuRows = (menus ?? []) as { handle: string; items: MenuItem[] }[]
  const header = menuRows.find((m) => m.handle === 'header')?.items ?? []
  const footer = menuRows.find((m) => m.handle === 'footer')?.items ?? []

  const linkSuggestions = ['/products', ...((pages ?? []) as { slug: string }[]).map((p) => `/${p.slug}`)]

  return (
    <>
      <PageHeader title="메뉴" description="홈페이지 상단·하단 메뉴를 관리합니다." />
      <MenuEditor header={header} footer={footer} linkSuggestions={linkSuggestions} />
    </>
  )
}
