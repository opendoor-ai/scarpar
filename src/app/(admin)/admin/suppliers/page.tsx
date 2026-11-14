// 공급사 관리 (플랫폼 관리자 전용) — 공급사 등급(무료·유료 등) 바꾸기, 등급 설정

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { getAdminClient } from '@/lib/supabase/admin'
import { kstDayStartIso } from '@/modules/catalog/jump'
import {
  SuppliersManager,
  type GradeRow,
  type SupplierLog,
  type SupplierRow,
} from '@/modules/supplier-grades/components/suppliers-manager'

export const dynamic = 'force-dynamic'

interface OrgRow {
  id: string
  name: string
  slug: string
  is_active: boolean
  supplier_grade_id: string | null
  grade_until: string | null
  grade_memo: string | null
  created_at: string
  phone: string | null
  email: string | null
  contact_name: string | null
  address: string | null
  homepage_url: string | null
  bin_number: string | null
  status_reason?: string | null
  status_changed_at?: string | null
}

const ORG_COLS =
  'id, name, slug, is_active, supplier_grade_id, grade_until, grade_memo, created_at, phone, email, contact_name, address, homepage_url, bin_number'

export default async function SuppliersPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()

  const admin = getAdminClient()
  const [gradesRes, orgsFull, productsRes, jumpsRes, logsRes, ownersRes] = await Promise.all([
    admin.from('supplier_grades').select('*').order('sort_order'),
    admin
      .from('orgs')
      .select(`${ORG_COLS}, status_reason, status_changed_at`)
      .order('created_at', { ascending: false }),
    admin.from('products').select('org_id, status').limit(100000),
    admin.from('product_jumps').select('org_id').gte('created_at', kstDayStartIso()),
    admin
      .from('supplier_admin_logs')
      .select('org_id, kind, summary, memo, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('org_members').select('org_id, user_id').eq('role', 'owner'),
  ])
  // 0027 실행 전이면 사유 칸 없이 다시 읽기
  const orgsRes = orgsFull.error
    ? await admin.from('orgs').select(ORG_COLS).order('created_at', { ascending: false })
    : orgsFull

  // 대표 회원(owner) 이메일
  const ownerByOrg = new Map<string, string>()
  const ownerIds = [...new Set(((ownersRes.data ?? []) as { org_id: string; user_id: string }[]).map((o) => o.user_id))]
  const emailById = new Map<string, string>()
  if (ownerIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users?.users ?? []) if (u.email) emailById.set(u.id, u.email)
  }
  for (const o of (ownersRes.data ?? []) as { org_id: string; user_id: string }[]) {
    if (!ownerByOrg.has(o.org_id) && emailById.has(o.user_id)) ownerByOrg.set(o.org_id, emailById.get(o.user_id)!)
  }
  const logsByOrg = new Map<string, SupplierLog[]>()
  for (const l of (logsRes.data ?? []) as (SupplierLog & { org_id: string })[]) {
    const list = logsByOrg.get(l.org_id) ?? []
    if (list.length < 20) list.push({ kind: l.kind, summary: l.summary, memo: l.memo, created_at: l.created_at })
    logsByOrg.set(l.org_id, list)
  }

  const ready = !gradesRes.error && !orgsRes.error
  const productStats = new Map<string, { active: number; total: number }>()
  for (const p of (productsRes.data ?? []) as { org_id: string; status: string }[]) {
    const s = productStats.get(p.org_id) ?? { active: 0, total: 0 }
    s.total += 1
    if (p.status === 'active') s.active += 1
    productStats.set(p.org_id, s)
  }
  const jumpCounts = new Map<string, number>()
  for (const j of (jumpsRes.data ?? []) as { org_id: string }[]) jumpCounts.set(j.org_id, (jumpCounts.get(j.org_id) ?? 0) + 1)

  const suppliers: SupplierRow[] = ((orgsRes.data ?? []) as unknown as OrgRow[]).map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    isActive: o.is_active,
    gradeId: o.supplier_grade_id,
    gradeUntil: o.grade_until,
    gradeMemo: o.grade_memo,
    productsActive: productStats.get(o.id)?.active ?? 0,
    productsTotal: productStats.get(o.id)?.total ?? 0,
    jumpsToday: jumpCounts.get(o.id) ?? 0,
    createdAt: o.created_at,
    phone: o.phone,
    email: o.email,
    contactName: o.contact_name,
    address: o.address,
    homepageUrl: o.homepage_url,
    bizNo: o.bin_number,
    statusReason: o.status_reason ?? null,
    statusChangedAt: o.status_changed_at ?? null,
    ownerEmail: ownerByOrg.get(o.id) ?? null,
    isPlatform: o.slug === PLATFORM_ORG_SLUG,
    logs: logsByOrg.get(o.id) ?? [],
  }))

  return (
    <div>
      <PageHeader
        title="공급사 관리"
        description="공급사의 운영 상태(운영중·중지)와 등급(무료·유료)을 관리하고, 변경 기록을 남겨요. 유료 기간이 끝나면 자동으로 기본 등급이 돼요."
        actions={
          <Button asChild>
            <Link href="/onboarding">
              <Plus className="size-4" />
              공급사 생성
            </Link>
          </Button>
        }
      />
      {logsRes.error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          운영 상태 사유·변경 기록을 쓰려면 Supabase SQL 편집기에서 <code>0027_supplier_admin.sql</code>을 실행해 주세요.
        </p>
      ) : null}
      {ready ? (
        <SuppliersManager suppliers={suppliers} grades={(gradesRes.data ?? []) as GradeRow[]} />
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          공급사 등급 표가 아직 없어요. Supabase SQL 편집기에서 <code>0026_supplier_grades_jump.sql</code>을 먼저 실행해 주세요.
        </p>
      )}
    </div>
  )
}
