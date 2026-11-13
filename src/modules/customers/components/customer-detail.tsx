'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CopyButton } from '@/components/ui/copy-button'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatMoney } from '@/lib/money'
import type { Customer, CustomerAddress } from '@/types/db'

import { toggleCustomerBlock } from '../actions'
import { CustomerAddressesCard } from './customer-addresses-card'
import { CustomerNotesCard } from './customer-notes-card'
import { CustomerOrdersTable, type CustomerOrderRow } from './customer-orders-table'
import { CustomerTagsEditor } from './customer-tags-editor'
import { EditCustomerDialog } from './edit-customer-dialog'

interface CustomerDetailProps {
  customer: Customer
  addresses: CustomerAddress[]
  orders: CustomerOrderRow[]
}

export function CustomerDetail({ customer, addresses, orders }: CustomerDetailProps) {
  const router = useRouter()

  async function handleToggleBlock() {
    const result = await toggleCustomerBlock(customer.id, !customer.is_blocked)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(customer.is_blocked ? '고객 차단을 해제했습니다' : '고객을 차단했습니다')
    router.refresh()
  }

  const aov = customer.orders_count > 0 ? Math.round(customer.total_spent / customer.orders_count) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{customer.name}</h2>
          {customer.is_blocked ? <Badge variant="destructive">차단됨</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <EditCustomerDialog customer={customer} />
          <ConfirmDialog
            trigger={
              <Button variant={customer.is_blocked ? 'outline' : 'destructive'}>
                {customer.is_blocked ? <CheckCircle2 /> : <Ban />}
                {customer.is_blocked ? '차단 해제' : '차단'}
              </Button>
            }
            title={customer.is_blocked ? '이 고객의 차단을 해제할까요?' : '이 고객을 차단할까요?'}
            description={
              customer.is_blocked
                ? '전화번호가 차단 목록에서 빠지고, 새 주문이 위험 주문으로 표시되지 않습니다.'
                : '전화번호가 차단 목록에 추가되어, 이 번호로 들어오는 주문은 위험 주문으로 표시됩니다.'
            }
            confirmLabel={customer.is_blocked ? '차단 해제' : '고객 차단'}
            destructive={!customer.is_blocked}
            onConfirm={handleToggleBlock}
          />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">요약</TabsTrigger>
          <TabsTrigger value="orders">주문</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="주문 수" value={customer.orders_count} />
            <StatCard label="총 구매액" value={formatMoney(customer.total_spent)} />
            <StatCard label="평균 주문액" value={formatMoney(aov)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>연락처</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground w-16">전화번호</span>
                <span className="tabular-nums">{customer.phone}</span>
                <CopyButton text={customer.phone} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground w-16">이메일</span>
                <span>{customer.email ?? '—'}</span>
              </div>
            </CardContent>
          </Card>

          <CustomerAddressesCard customerId={customer.id} addresses={addresses} />
          <CustomerNotesCard customerId={customer.id} notes={customer.notes} />
          <CustomerTagsEditor customerId={customer.id} tags={customer.tags ?? []} />
        </TabsContent>

        <TabsContent value="orders" className="pt-4">
          <CustomerOrdersTable orders={orders} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
