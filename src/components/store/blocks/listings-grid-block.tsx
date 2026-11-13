import { Bath, BedDouble } from 'lucide-react'

import { formatMoney } from '@/lib/money'
import { getAnonClient } from '@/lib/supabase/anon'
import type { Listing, ListingsGridBlock } from '@/types/db'

import type { BlockRenderContext } from './render-blocks'

type ListingRow = Pick<Listing, 'id' | 'title' | 'price' | 'purpose' | 'beds' | 'baths' | 'address'>

// No public listing detail route exists in this storefront (docs/architecture.md's route map
// lists no (store)/s/[org]/listing/[slug] page) — cards are informational only, per the block
// spec ("listingsGrid (active listings cards — price, beds/baths, district)").
export async function ListingsGridBlockView({ block, ctx }: { block: ListingsGridBlock; ctx: BlockRenderContext }) {
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('listings')
    .select('id, title, price, purpose, beds, baths, address')
    .eq('org_id', ctx.org.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(block.limit ?? 6)

  const listings = (data ?? []) as ListingRow[]
  if (listings.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="mb-5 text-lg font-semibold">매물</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => {
          const district = (l.address as { district?: string } | null)?.district
          return (
            <div key={l.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">{l.title}</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatMoney(l.price)}
                {l.purpose === 'rent' ? (
                  <span className="text-xs font-normal text-muted-foreground"> /month</span>
                ) : null}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {l.beds != null ? (
                  <span className="flex items-center gap-1">
                    <BedDouble className="size-3.5" /> {l.beds}
                  </span>
                ) : null}
                {l.baths != null ? (
                  <span className="flex items-center gap-1">
                    <Bath className="size-3.5" /> {l.baths}
                  </span>
                ) : null}
                {district ? <span>{district}</span> : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
