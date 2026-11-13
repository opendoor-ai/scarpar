import Link from 'next/link'
import { Building2 } from 'lucide-react'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { formatCompact } from '@/lib/money'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

interface ListingRow {
  id: string
  title: string
  price: number
  purpose: string
}

/** Active listings — count + up to 6 latest. */
export async function ListingsActiveWidget() {
  const ctx = await requireOrg()

  let listings: ListingRow[] = []
  let total = 0

  try {
    const supabase = await getServerClient()
    const { data, count } = await supabase
      .from('listings')
      .select('id, title, price, purpose', { count: 'exact' })
      .eq('org_id', ctx.org.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(6)

    listings = (data ?? []) as ListingRow[]
    total = count ?? listings.length
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">활성 매물 ({total})</CardTitle>
        <Link href="/admin/listings" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {listings.length === 0 ? (
          <EmptyState icon={Building2} title="활성 매물이 없습니다" className="py-8" />
        ) : (
          <ul className="flex flex-col gap-1">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/admin/listings/${listing.id}`}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{listing.title}</span>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {listing.purpose}
                  </Badge>
                  <span className="shrink-0 font-medium text-foreground tabular-nums">
                    {formatCompact(listing.price, { symbol: true })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
