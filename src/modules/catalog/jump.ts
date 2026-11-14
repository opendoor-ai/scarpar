// 점프(최상단으로 올리기) 현황 — 서버 전용
// 등급·한도 규칙은 DB 함수(0026 jump_products / effective_supplier_grade)가 최종 판단해요.

import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

export interface SupplierGrade {
  id: string
  code: string
  name: string
  description: string | null
  is_paid: boolean
  jump_featured_limit: number
  jump_normal_limit: number
  color: string
  sort_order: number
  is_default: boolean
}

export interface JumpStatus {
  ready: boolean
  grade: SupplierGrade | null
  gradeUntil: string | null
  featuredUsed: number
  normalUsed: number
  featuredLimit: number
  normalLimit: number
}

/** 오늘(한국 시간) 0시 */
export function kstDayStartIso(): string {
  const kst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  return new Date(`${kst}T00:00:00+09:00`).toISOString()
}

export async function getJumpStatus(orgId: string): Promise<JumpStatus> {
  const empty: JumpStatus = {
    ready: false,
    grade: null,
    gradeUntil: null,
    featuredUsed: 0,
    normalUsed: 0,
    featuredLimit: 0,
    normalLimit: 0,
  }
  try {
    const admin = getAdminClient()
    const [gradeRes, orgRes, jumpsRes] = await Promise.all([
      admin.rpc('effective_supplier_grade', { p_org: orgId }),
      admin.from('orgs').select('grade_until').eq('id', orgId).maybeSingle(),
      admin.from('product_jumps').select('kind').eq('org_id', orgId).gte('created_at', kstDayStartIso()),
    ])
    if (gradeRes.error || jumpsRes.error) return empty
    const grade = (Array.isArray(gradeRes.data) ? gradeRes.data[0] : gradeRes.data) as SupplierGrade | null
    const kinds = ((jumpsRes.data ?? []) as { kind: string }[]).map((r) => r.kind)
    return {
      ready: true,
      grade: grade?.id ? grade : null,
      gradeUntil: (orgRes.data as { grade_until: string | null } | null)?.grade_until ?? null,
      featuredUsed: kinds.filter((k) => k === 'featured').length,
      normalUsed: kinds.filter((k) => k === 'normal').length,
      featuredLimit: grade?.jump_featured_limit ?? 0,
      normalLimit: grade?.jump_normal_limit ?? 0,
    }
  } catch {
    return empty
  }
}
