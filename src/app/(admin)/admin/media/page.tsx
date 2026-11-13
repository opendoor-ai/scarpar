import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { MediaManager } from '@/components/admin/media-manager'
import type { Media } from '@/types/db'

export const dynamic = 'force-dynamic'

// Media is core (always-on nav, not module-gated — see src/modules/registry.ts CORE_NAV),
// so this page only needs requireOrg(), no requireModule() call.
export default async function MediaPage() {
  const ctx = await requireOrg()
  const supabase = await getServerClient()

  const { data } = await supabase
    .from('media')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <>
      <PageHeader title="이미지/미디어" description="페이지와 상품에 쓰는 이미지와 파일" />
      <MediaManager initialItems={(data ?? []) as Media[]} />
    </>
  )
}
