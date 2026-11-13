'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import type { CustomerAddress } from '@/types/db'

import { deleteCustomerAddress, updateCustomerAddress } from '../actions'
import { AddressFormDialog } from './address-form-dialog'

interface CustomerAddressesCardProps {
  customerId: string
  addresses: CustomerAddress[]
}

export function CustomerAddressesCard({ customerId, addresses }: CustomerAddressesCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CustomerAddress | undefined>(undefined)

  function openAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(address: CustomerAddress) {
    setEditing(address)
    setDialogOpen(true)
  }

  async function handleDelete(addressId: string) {
    const result = await deleteCustomerAddress(addressId, customerId)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('주소가 삭제되었습니다')
    router.refresh()
  }

  async function handleSetDefault(address: CustomerAddress) {
    const result = await updateCustomerAddress(address.id, customerId, {
      label: address.label ?? '',
      recipient: address.recipient,
      phone: address.phone,
      line1: address.line1,
      area: address.area ?? '',
      district: address.district,
      postcode: address.postcode ?? '',
      is_default: true,
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('기본 주소가 변경되었습니다')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>주소</CardTitle>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus /> 추가
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        {addresses.length === 0 ? (
          <EmptyState icon={Star} title="등록된 주소가 없습니다" description="이 고객의 배송 주소를 추가하세요." />
        ) : (
          addresses.map((address) => (
            <div key={address.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <button
                type="button"
                onClick={() => handleSetDefault(address)}
                disabled={address.is_default}
                className="border-input mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border disabled:cursor-default"
                aria-label={address.is_default ? '기본 주소' : '기본 주소로 설정'}
                title={address.is_default ? '기본 주소' : '기본으로 설정'}
              >
                {address.is_default ? <span className="bg-primary block size-2 rounded-full" /> : null}
              </button>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-medium">{address.label || address.recipient}</span>
                <span className="text-muted-foreground">
                  {address.recipient} · {address.phone}
                </span>
                <span className="text-muted-foreground">
                  {[address.line1, address.area, address.district, address.postcode].filter(Boolean).join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(address)}>
수정
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive size-7">
                      <Trash2 className="size-3.5" />
                    </Button>
                  }
                  title="이 주소를 삭제할까요?"
                  confirmLabel="삭제"
                  destructive
                  onConfirm={() => handleDelete(address.id)}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>

      <AddressFormDialog
        customerId={customerId}
        address={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => router.refresh()}
      />
    </Card>
  )
}
