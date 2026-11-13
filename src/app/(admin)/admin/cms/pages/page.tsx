import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { CmsPagesTable, type CmsPageRow } from '@/modules/cms/components/cms-pages-table'
import { NewPageDialog } from '@/modules/cms/components/new-page-dialog'

export const dynamic = 'force-dynamic'

export default async function CmsPagesListPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'cms')

  const supabase = await getServerClient()
  const { data } = await supabase
    .from('cms_pages')
    .select('id, title, slug, type, status, draft_blocks, updated_at')
    .eq('org_id', ctx.org.id)
    .order('updated_at', { ascending: false })

  return (
    <>
      <PageHeader title="페이지" description="홈페이지에 보일 페이지를 만들고 게시합니다." actions={<NewPageDialog />} />
      <CmsPagesTable data={(data ?? []) as CmsPageRow[]} />
    </>
  )
}
