export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Building2, MessageSquare } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { getServerClient } from '@/lib/supabase/server'
import { getStatusMeta } from '@/lib/status'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import type { Listing, ListingStatus } from '@/types/db'

import { InquiriesTable } from '@/modules/listings/components/inquiries-table'
import { ListingsGrid } from '@/modules/listings/components/listings-grid'
import { NewListingDialog } from '@/modules/listings/components/new-listing-dialog'
import type { InquiryRow, ListingListRow, ListingMedia } from '@/modules/listings/schemas'

// Hand-rolled rather than the shared PageProps<TParams, TSearchParams> helper: `{ status?: string }`
// is an all-optional object literal, which doesn't satisfy PageProps' `TSearchParams extends
// Record<string, string | string[] | undefined>` constraint (TS2344) — see the same workaround
// in src/app/(admin)/admin/orders/page.tsx.
interface ListingsPageProps {
  searchParams: Promise<{ status?: string }>
}

const LISTING_STATUSES: ListingStatus[] = ['draft', 'active', 'under_offer', 'sold', 'rented']

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'listings')

  const sp = await searchParams
  const status = sp.status ?? ''

  const supabase = await getServerClient()

  let listingsQuery = supabase
    .from('listings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })

  if (status) listingsQuery = listingsQuery.eq('status', status)

  const [{ data: listings }, { data: inquiries }] = await Promise.all([
    listingsQuery,
    supabase
      .from('inquiries')
      .select('*, listing:listings(title)')
      .eq('org_id', ctx.org.id)
      .not('listing_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const listingRows = (listings ?? []) as Listing[]

  // media_ids is a uuid[] and can never be PostgREST-embedded — resolve cover images
  // with a separate lookup against media, keyed by each listing's first media id.
  const coverIds = Array.from(
    new Set(listingRows.map((listing) => listing.media_ids[0]).filter((id): id is string => Boolean(id))),
  )

  const mediaMap = new Map<string, string>()
  if (coverIds.length > 0) {
    const { data: media } = await supabase.from('media').select('id, path').in('id', coverIds)
    for (const item of (media ?? []) as { id: string; path: string }[]) {
      mediaMap.set(item.id, item.path)
    }
  }

  const rows: ListingListRow[] = listingRows.map((listing) => {
    const coverId = listing.media_ids[0]
    const coverPath = coverId ? mediaMap.get(coverId) : undefined
    const cover: ListingMedia | null = coverId && coverPath ? { id: coverId, path: coverPath } : null
    return { ...listing, cover }
  })

  const inquiryRows = (inquiries ?? []) as InquiryRow[]

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="매물관리"
        description="매물과 구매 문의를 관리합니다."
        actions={<NewListingDialog />}
      />

      <div className="flex flex-wrap items-center gap-1.5 pb-4">
        <Link href="/admin/listings">
          <Badge variant={status === '' ? 'default' : 'outline'} className="cursor-pointer">
            전체
          </Badge>
        </Link>
        {LISTING_STATUSES.map((value) => (
          <Link key={value} href={`/admin/listings?status=${value}`}>
            <Badge variant={status === value ? 'default' : 'outline'} className="cursor-pointer">
              {getStatusMeta('listing', value).label}
            </Badge>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="아직 매물이 없습니다"
          description="첫 매물을 등록하고 문의를 받아 보세요."
        />
      ) : (
        <ListingsGrid listings={rows} />
      )}

      <div className="mt-8 flex flex-col gap-3">
        <h2 className="text-foreground text-[14px] font-semibold">문의</h2>
        {inquiryRows.length === 0 ? (
          <EmptyState icon={MessageSquare} title="아직 문의가 없습니다" description="구매 문의가 여기에 표시됩니다." />
        ) : (
          <InquiriesTable inquiries={inquiryRows} />
        )}
      </div>
    </div>
  )
}
