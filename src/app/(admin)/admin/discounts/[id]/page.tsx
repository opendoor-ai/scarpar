import { notFound } from 'next/navigation'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import type { PageProps } from '@/lib/types'
import type { Category, Discount } from '@/types/db'

import { DiscountForm } from '@/modules/discounts/components/discount-form'

export const dynamic = 'force-dynamic'

export default async function EditDiscountPage({ params }: PageProps<{ id: string }>) {
  const { id } = await params
  const ctx = await requireOrg()
  requireModule(ctx.org, 'discounts')

  const supabase = await getServerClient()
  const [{ data: discountRow }, { data: categoryRows }] = await Promise.all([
    supabase.from('discounts').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('categories').select('id, name').eq('org_id', ctx.org.id).order('name', { ascending: true }),
  ])

  if (!discountRow) notFound()
  const discount = discountRow as Discount
  const categories = (categoryRows ?? []) as Pick<Category, 'id' | 'name'>[]

  let initialProducts: { id: string; name: string }[] = []
  if (discount.scope === 'products' && discount.product_ids && discount.product_ids.length > 0) {
    const { data: productRows } = await supabase
      .from('products')
      .select('id, name')
      .eq('org_id', ctx.org.id)
      .in('id', discount.product_ids)
    initialProducts = (productRows ?? []) as { id: string; name: string }[]
  }

  return (
    <div className="px-6 py-6">
      <PageHeader title="할인 수정" backHref="/admin/discounts" />
      <DiscountForm discount={discount} categories={categories} initialProducts={initialProducts} />
    </div>
  )
}
