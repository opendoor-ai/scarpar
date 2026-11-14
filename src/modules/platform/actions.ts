'use server'

import { PLATFORM_ORG_SLUG } from '@/lib/site'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { audit } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import type { Org } from '@/types/db'

const toggleOrgActiveSchema = z.object({
  orgId: z.string().uuid(),
  isActive: z.boolean(),
})

/** Platform-admin-only: gated on is_platform_admin(), independent of the
 *  caller's own org membership/role — there is no "current org" here, so
 *  the audit() call below is passed a one-off context built from the
 *  *target* org (the org whose row this action changes owns the audit trail
 *  entry), not from requireOrg(). */
export async function toggleOrgActiveAction(input: {
  orgId: string
  isActive: boolean
}): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = toggleOrgActiveSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const supabase = await getServerClient()
  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
  if (!isPlatformAdmin) {
    return { ok: false, error: '권한이 없습니다' }
  }

  try {
    const admin = getAdminClient()
    const { data: org, error: fetchError } = await admin
      .from('orgs')
      .select('*')
      .eq('id', parsed.data.orgId)
      .single()

    if (fetchError || !org) return { ok: false, error: '조직을 찾을 수 없습니다' }
    const orgRow = org as Org
    // 전자동(플랫폼) 자신은 중지할 수 없음 — 사이트 전체 제품이 숨겨지는 사고 방지
    if (!parsed.data.isActive && orgRow.slug === PLATFORM_ORG_SLUG) {
      return { ok: false, error: '전자동(플랫폼) 공급사는 중지할 수 없어요. 사이트 전체 제품이 숨겨져요.' }
    }

    const { error } = await admin
      .from('orgs')
      .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.orgId)

    if (error) return { ok: false, error: error.message }

    audit(
      { user, org: orgRow, role: 'owner', settings: {} },
      'platform.org_active_toggled',
      'orgs',
      parsed.data.orgId,
      { is_active: orgRow.is_active },
      { is_active: parsed.data.isActive },
    )
    revalidatePath('/admin/platform')

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '조직 정보를 변경하지 못했습니다' }
  }
}
