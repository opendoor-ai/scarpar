import Link from 'next/link'
import { Plus } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import type { Discount } from '@/types/db'

import { DiscountsTable } from '@/modules/discounts/components/discounts-table'

export const dynamic = 'force-dynamic'

export default async function DiscountsPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'discounts')

  const supabase = await getServerClient()
  const { data } = await supabase
    .from('discounts')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })

  const discounts = (data ?? []) as Discount[]

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="할인관리"
        description="할인 코드와 자동 할인"
        actions={
          <Button asChild>
            <Link href="/admin/discounts/new">
              <Plus /> 새 할인
            </Link>
          </Button>
        }
      />
      <DiscountsTable discounts={discounts} />
    </div>
  )
}
