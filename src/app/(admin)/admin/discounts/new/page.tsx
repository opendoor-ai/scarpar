import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import type { Category } from '@/types/db'

import { DiscountForm } from '@/modules/discounts/components/discount-form'

export const dynamic = 'force-dynamic'

export default async function NewDiscountPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'discounts')

  const supabase = await getServerClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('org_id', ctx.org.id)
    .order('name', { ascending: true })

  const categories = (data ?? []) as Pick<Category, 'id' | 'name'>[]

  return (
    <div className="px-6 py-6">
      <PageHeader title="새 할인" backHref="/admin/discounts" />
      <DiscountForm categories={categories} />
    </div>
  )
}
