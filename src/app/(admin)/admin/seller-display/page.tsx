// 판매정보 표시설정 (공급사 관리자 → 디자인관리)

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { formatKrPhone } from '@/lib/phone'
import { getAdminClient } from '@/lib/supabase/admin'
import { SellerDisplayForm } from '@/modules/supplier-profile/components/seller-display-form'

export const dynamic = 'force-dynamic'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default async function SellerDisplayPage() {
  const ctx = await requireOrg()
  const { data } = await getAdminClient().from('orgs').select('*').eq('id', ctx.org.id).single()
  const o = (data ?? ctx.org) as Record<string, unknown>
  const needsSql = Boolean(data) && !('seller_info_detail_enabled' in (data as object))

  // 기본 표 (공급사 기본정보로 만듦)
  const rows: [string, string][] = [
    ['업체명', String(o.name ?? '')],
    ['담당자명', String(o.contact_name ?? '')],
    ['연락처', o.phone ? formatKrPhone(String(o.phone)) : ''],
    ['이메일', String(o.email ?? '')],
    ['주소', String(o.address ?? '')],
  ].filter(([, v]) => v) as [string, string][]
  const defaultHtml = `<table><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`

  return (
    <div>
      <PageHeader title="판매정보 표시설정" description="상품 상세페이지와 미니샵에 보이는 공급사 정보 상자를 정해요." />
      {needsSql ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          이 설정을 쓰려면 Supabase SQL 편집기에서 <code>0029_supplier_profile.sql</code>을 실행해 주세요.
        </p>
      ) : null}
      <SellerDisplayForm
        defaultHtml={defaultHtml}
        initial={{
          detailEnabled: o.seller_info_detail_enabled !== false,
          detailHtml: String(o.seller_info_detail_html ?? ''),
          shopEnabled: o.seller_info_shop_enabled !== false,
          shopHtml: String(o.seller_info_shop_html ?? ''),
        }}
      />
    </div>
  )
}
