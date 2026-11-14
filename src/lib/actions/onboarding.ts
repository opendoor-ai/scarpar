'use server'

import { audit } from '@/lib/audit'
import { requireUser, type OrgContext } from '@/lib/auth'
import { setActiveOrg } from '@/lib/actions/set-org'
import { seedDemoData } from '@/lib/demo-seed'
import { provisionOrg } from '@/lib/org-provision'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import { slugify } from '@/lib/utils'
import type { Org } from '@/types/db'

import { createOrgSchema, type CreateOrgInput } from './onboarding-schemas'

/**
 * 플랫폼 관리자(전자동)가 공급사(조직)를 직접 만들 때 쓰는 기능.
 * 일반회원은 "공급사 입점 신청"(supplier-application)을 이용하고, 승인되면 자동으로 만들어집니다.
 */
export async function createOrgAction(input: CreateOrgInput): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = createOrgSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }
  }

  const { name, phone, vertical, seedDemo } = parsed.data
  const slug = slugify(parsed.data.slug) || slugify(name)
  if (!slug) {
    return { ok: false, error: '회사(조직) 이름을 정확히 입력하세요.' }
  }

  // 직접 생성은 플랫폼 관리자만 (일반회원은 입점 신청 → 승인)
  const supabase = await getServerClient()
  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
  if (!isPlatformAdmin) {
    return { ok: false, error: '공급사는 입점 신청 후 승인을 받아 만들어집니다.' }
  }

  const admin = getAdminClient()
  let org: Org
  try {
    const result = await provisionOrg({ name, slug, vertical, phone }, user.id)
    if (!result.ok) return { ok: false, error: result.error }
    org = result.org
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '조직을 만들지 못했습니다.' }
  }

  if (seedDemo) {
    try {
      await seedDemoData(admin, org)
    } catch (err) {
      // Demo content is a nice-to-have, not a hard requirement — the org
      // itself is already created successfully, so this never fails the
      // whole action.
      console.error('[createOrgAction] demo seed failed', err)
    }
  }

  const auditCtx: OrgContext = { user, org, role: 'owner', settings: {} }
  audit(auditCtx, 'org.created', 'org', org.id, null, { vertical: org.vertical, seedDemo })

  await setActiveOrg(org.id)
  return { ok: true }
}
