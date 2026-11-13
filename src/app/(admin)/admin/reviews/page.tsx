import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'

import { ReviewsTable, type ReviewRow } from '@/modules/reviews/components/reviews-table'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'reviews')

  const supabase = await getServerClient()
  const { data } = await supabase
    .from('reviews')
    .select('*, product:products(name)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })

  const reviews = (data ?? []) as ReviewRow[]

  return (
    <div className="px-6 py-6">
      <PageHeader title="리뷰관리" description="고객 상품 리뷰를 확인하고 게시합니다." />
      <ReviewsTable reviews={reviews} />
    </div>
  )
}
