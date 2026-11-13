// Server-safe presentational component — no 'use client', rendered directly from
// the order detail server component.
import Link from 'next/link'
import { MapPin, Phone, User } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrderAddress {
  line1?: string
  area?: string
  district?: string
  postcode?: string
}

interface CustomerCardProps {
  customerId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  address: Record<string, unknown> | null
}

function CustomerCard({ customerId, customerName, customerPhone, customerEmail, address }: CustomerCardProps) {
  const addr = (address ?? {}) as OrderAddress
  const hasAddress = Boolean(addr.line1 || addr.area || addr.district || addr.postcode)

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <User className="text-muted-foreground size-4" />
          {customerId ? (
            <Link href={`/admin/customers/${customerId}`} className="text-primary font-medium hover:underline">
              {customerName}
            </Link>
          ) : (
            <span className="font-medium">{customerName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <Phone className="text-muted-foreground size-4" />
          <span className="tabular-nums">{customerPhone}</span>
        </div>
        {customerEmail ? (
          <div className="text-muted-foreground pl-6 text-xs">{customerEmail}</div>
        ) : null}
        {hasAddress ? (
          <div className="flex items-start gap-2 text-[13px]">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="text-muted-foreground flex flex-col">
              {addr.line1 ? <span>{addr.line1}</span> : null}
              <span>{[addr.area, addr.district, addr.postcode].filter(Boolean).join(', ')}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export { CustomerCard }
