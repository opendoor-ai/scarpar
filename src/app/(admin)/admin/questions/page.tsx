import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'

import { QuestionsList, type QuestionRow } from '@/modules/questions/components/questions-list'

export const dynamic = 'force-dynamic'

export default async function QuestionsPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'catalog')

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('product_questions')
    .select('*, product:products(name, product_no)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) console.error('[admin questions] read failed:', error.message)

  return (
    <div className="px-6 py-6">
      <PageHeader title="상품 Q&A" description="고객이 상품 상세페이지에서 남긴 질문에 답변합니다." />
      <QuestionsList questions={(data ?? []) as QuestionRow[]} storeSlug={ctx.org.slug} />
    </div>
  )
}
