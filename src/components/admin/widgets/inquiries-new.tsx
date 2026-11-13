import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

import { requireOrg } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { truncate } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface InquiryRow {
  id: string
  name: string
  message: string | null
  created_at: string
}

/** New (unactioned) buyer inquiries, last 8. */
export async function InquiriesNewWidget() {
  const ctx = await requireOrg()

  let inquiries: InquiryRow[] = []

  try {
    const supabase = await getServerClient()
    const { data } = await supabase
      .from('inquiries')
      .select('id, name, message, created_at')
      .eq('org_id', ctx.org.id)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(8)

    inquiries = (data ?? []) as InquiryRow[]
  } catch {
    // placeholder-env safety — empty on failure
  }

  return (
    <Card className="gap-3 p-4">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <CardTitle className="text-[13px]">새 문의</CardTitle>
        <Link href="/admin/listings" className="text-xs text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {inquiries.length === 0 ? (
          <EmptyState icon={Inbox} title="새 문의가 없습니다" className="py-8" />
        ) : (
          <ul className="flex flex-col gap-2">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="rounded-md px-1.5 py-1 text-[13px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">{inquiry.name}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </div>
                {inquiry.message && (
                  <p className="truncate text-xs text-muted-foreground">
                    {truncate(inquiry.message, 60)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
