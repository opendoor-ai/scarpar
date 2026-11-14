export const dynamic = 'force-dynamic'

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { isModuleEnabled, requireModule } from '@/lib/modules'
import { settingBool, settingNum, settingStr } from '@/lib/settings'
import { getServerClient } from '@/lib/supabase/server'
import type { DeliveryZone } from '@/types/db'
import { NewOrderForm, type DefaultAdvance } from '@/modules/orders/components/new-order-form'

export default async function NewOrderPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'orders')

  const deliveryEnabled = isModuleEnabled(ctx.org, 'delivery')

  let deliveryZones: DeliveryZone[] = []
  if (deliveryEnabled) {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('is_active', true)
      .order('position')
    deliveryZones = (data ?? []) as DeliveryZone[]
  }

  const defaultAdvance: DefaultAdvance = {
    required: settingBool(ctx.settings, 'payments.advance_required'),
    type: settingStr(ctx.settings, 'payments.advance_type') === 'percent' ? 'percent' : 'fixed',
    amountMinor: settingNum(ctx.settings, 'payments.advance_amount'),
  }

  return (
    <div className="px-6 py-6">
      <PageHeader title="새 주문" backHref="/admin/orders" />
      <NewOrderForm deliveryZones={deliveryZones} deliveryEnabled={deliveryEnabled} defaultAdvance={defaultAdvance} />
    </div>
  )
}
