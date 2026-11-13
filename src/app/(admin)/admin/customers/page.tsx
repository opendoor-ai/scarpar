import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import type { Customer } from '@/types/db'

import { CustomersTable } from '@/modules/customers/components/customers-table'
import { NewCustomerDialog } from '@/modules/customers/components/new-customer-dialog'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'customers')

  const supabase = await getServerClient()
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })

  const customers = (data ?? []) as Customer[]

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="고객관리"
        description="고객 정보, 주문 이력, 차단 목록"
        actions={<NewCustomerDialog />}
      />
      <CustomersTable customers={customers} />
    </div>
  )
}
