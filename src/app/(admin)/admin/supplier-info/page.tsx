// 공급사 기본정보 (공급사 관리자 → 상점관리)

import { PageHeader } from '@/components/ui/page-header'
import { requireOrg } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { getJumpStatus } from '@/modules/catalog/jump'
import { SupplierInfoForm, type SupplierInfoView } from '@/modules/supplier-profile/components/supplier-info-form'

export const dynamic = 'force-dynamic'

interface OrgRow {
  name: string
  slug: string
  is_active: boolean
  phone: string | null
  email: string | null
  address: string | null
  homepage_url: string | null
  item_keywords: string[] | null
  contact_name: string | null
  bin_number: string | null
  grade_memo?: string | null
  fax?: string | null
  contacts?: { name?: string; phone?: string; email?: string }[] | null
  company_intro?: string | null
  biz_name?: string | null
  ceo_name?: string | null
  biz_type?: string | null
  biz_item?: string | null
}

export default async function SupplierInfoPage() {
  const ctx = await requireOrg()
  const admin = getAdminClient()
  const [{ data, error }, jump, owner] = await Promise.all([
    admin.from('orgs').select('*').eq('id', ctx.org.id).single(),
    getJumpStatus(ctx.org.id),
    admin.from('org_members').select('user_id').eq('org_id', ctx.org.id).eq('role', 'owner').limit(1).maybeSingle(),
  ])
  const o = (data ?? ctx.org) as unknown as OrgRow
  const platformAdmin = await isPlatformAdmin()
  const needsSql = !error && data && !('contacts' in (data as object))

  // 로그인 ID: 내가 이 공급사 직원이면 내 이메일, 메인 관리자가 대신 보는 중이면 대표 계정 이메일
  let loginEmail = ctx.user.email ?? null
  if (ctx.viaPlatform && owner.data) {
    const { data: u } = await admin.auth.admin.getUserById((owner.data as { user_id: string }).user_id)
    loginEmail = u.user?.email ?? null
  }

  const contacts = (o.contacts ?? []).length > 0 ? o.contacts! : o.contact_name ? [{ name: o.contact_name, phone: o.phone ?? '', email: o.email ?? '' }] : []

  const view: SupplierInfoView = {
    name: o.name,
    slug: o.slug,
    loginEmail,
    gradeName: jump.grade?.name ?? null,
    gradeColor: jump.grade?.color ?? null,
    gradeUntil: jump.grade?.is_paid ? jump.gradeUntil : null,
    isActive: o.is_active,
    memo: o.grade_memo ?? null,
    // 메인 관리자가 보고 있을 때는 메인 관리자 비밀번호가 바뀌지 않게 숨김
    canChangePassword: !ctx.viaPlatform && !platformAdmin,
    values: {
      item_keywords: (o.item_keywords ?? []).join(', '),
      phone: o.phone ?? '',
      fax: o.fax ?? '',
      email: o.email ?? '',
      address: o.address ?? '',
      homepage_url: o.homepage_url ?? '',
      contacts: contacts.map((c) => ({ name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '' })),
      company_intro: o.company_intro ?? '',
      bin_number: o.bin_number ?? '',
      biz_name: o.biz_name ?? '',
      ceo_name: o.ceo_name ?? '',
      biz_type: o.biz_type ?? '',
      biz_item: o.biz_item ?? '',
    },
  }

  return (
    <div>
      <PageHeader title="공급사 기본정보" description="공급사 연락처·담당자·사업자 정보를 관리해요. 미니샵과 상품 상세페이지에 보여요." />
      {needsSql ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          팩스·담당자·회사소개·사업자 정보 칸을 쓰려면 Supabase SQL 편집기에서 <code>0029_supplier_profile.sql</code>을 실행해 주세요.
        </p>
      ) : null}
      <SupplierInfoForm view={view} />
    </div>
  )
}
