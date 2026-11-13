import Link from 'next/link'
import { Building2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'
import { mediaUrl } from '@/lib/media-url'

import type { ListingAddress, ListingListRow } from '../schemas'

interface ListingsGridProps {
  listings: ListingListRow[]
}

function purposeLabel(purpose: ListingListRow['purpose']): string {
  return purpose === 'sale' ? '매매' : '임대'
}

function propertyTypeLabel(type: ListingListRow['property_type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function factsLine(listing: ListingListRow): string {
  const parts: string[] = []
  if (listing.beds !== null) parts.push(`방 ${listing.beds}`)
  if (listing.baths !== null) parts.push(`욕실 ${listing.baths}`)
  if (listing.area_sqft !== null) parts.push(`${listing.area_sqft} sqft`)
  return parts.join(' · ')
}

/** Plain server-rendered link cards — no client interactivity needed for navigation. */
function ListingsGrid({ listings }: ListingsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing) => {
        const facts = factsLine(listing)
        const district = (listing.address as ListingAddress | null)?.district

        return (
          <Link key={listing.id} href={`/admin/listings/${listing.id}`} className="block h-full">
            <Card className="h-full gap-3 overflow-hidden py-0 transition-colors hover:bg-accent/50">
              <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden">
                {listing.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                  <img src={mediaUrl(listing.cover.path)} alt="" className="size-full object-cover" />
                ) : (
                  <Building2 className="text-muted-foreground size-8" />
                )}
              </div>
              <div className="flex flex-col gap-2 px-4 pb-4">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{purposeLabel(listing.purpose)}</Badge>
                  <Badge variant="outline">{propertyTypeLabel(listing.property_type)}</Badge>
                </div>
                <p className="text-foreground truncate text-[13px] font-medium">{listing.title}</p>
                <p className="text-foreground text-sm font-semibold tabular-nums">{formatMoney(listing.price)}</p>
                {facts ? <p className="text-muted-foreground text-xs">{facts}</p> : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate text-xs">{district ?? '—'}</span>
                  <StatusBadge kind="listing" value={listing.status} />
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export { ListingsGrid }
