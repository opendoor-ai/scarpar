export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import type { PageProps } from '@/lib/types'
import type { Listing } from '@/types/db'

import { ListingDetailForm } from '@/modules/listings/components/listing-detail-form'
import type { ListingDetailRow } from '@/modules/listings/schemas'

export default async function ListingDetailPage({ params }: PageProps<{ id: string }>) {
  const { id } = await params
  const ctx = await requireOrg()
  requireModule(ctx.org, 'listings')

  const supabase = await getServerClient()

  const { data: listingData } = await supabase
    .from('listings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('id', id)
    .maybeSingle()

  if (!listingData) notFound()

  const listing = listingData as Listing

  let mediaItems: { id: string; path: string }[] = []
  if (listing.media_ids.length > 0) {
    const { data: mediaRows } = await supabase.from('media').select('id, path').in('id', listing.media_ids)
    const mediaMap = new Map(((mediaRows ?? []) as { id: string; path: string }[]).map((row) => [row.id, row.path]))
    mediaItems = listing.media_ids
      .map((mediaId) => ({ id: mediaId, path: mediaMap.get(mediaId) ?? '' }))
      .filter((item) => item.path)
  }

  const listingRow: ListingDetailRow = { ...listing, mediaItems }

  return (
    <div className="px-6 py-6">
      <PageHeader
        title={listing.title}
        description={`등록일 ${new Date(listing.created_at).toLocaleDateString('ko-KR')}`}
        backHref="/admin/listings"
        actions={<StatusBadge kind="listing" value={listing.status} />}
      />

      <ListingDetailForm listing={listingRow} />
    </div>
  )
}
