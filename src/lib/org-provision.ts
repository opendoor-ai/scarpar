// 공급사(조직) 만들기 — 조직 + 대표(owner) 권한 + 문서번호 + 기본 설정을 한 번에 준비합니다.
// 서버 전용 (service role 사용). 온보딩의 직접 생성과 "입점 신청 승인" 두 곳에서 함께 씁니다.
//
// 참고: 0001의 org_members 보안 규칙에는 "새 조직의 첫 대표 넣기" 예외가 없어서
// (새 조직엔 아직 멤버가 없으니 권한 확인을 통과할 수 없음) service role로 처리합니다.

import { SETTING_DEFS } from '@/lib/settings/registry'
import { getAdminClient } from '@/lib/supabase/admin'
import { VERTICAL_PRESETS } from '@/modules/verticals'
import type { Json, Org, Vertical } from '@/types/db'

/** 문서번호 시작값 (docs/architecture.md §3 / §9) */
const DOC_SEQUENCES: { doc_type: string; prefix: string }[] = [
  { doc_type: 'order', prefix: 'SCR-' },
  { doc_type: 'invoice', prefix: 'INV-' },
  { doc_type: 'delivery', prefix: 'DLV-' },
  { doc_type: 'return', prefix: 'RET-' },
  { doc_type: 'job', prefix: 'JOB-' },
]

export interface ProvisionOrgInput {
  name: string
  slug: string
  vertical: Vertical
  phone: string
  email?: string | null
  address?: string | null
  bin_number?: string | null
  contact_name?: string | null
  homepage_url?: string | null
  item_keywords?: string[] | null
}

export type ProvisionResult = { ok: true; org: Org } | { ok: false; error: string }

/** 주소(slug)가 이미 쓰이는지 */
export async function isOrgSlugTaken(slug: string): Promise<boolean> {
  const { data } = await getAdminClient().from('orgs').select('id').eq('slug', slug).maybeSingle()
  return Boolean(data)
}

export async function provisionOrg(input: ProvisionOrgInput, ownerUserId: string): Promise<ProvisionResult> {
  const admin = getAdminClient()

  if (await isOrgSlugTaken(input.slug)) {
    return { ok: false, error: '이미 사용 중인 주소입니다. 다른 주소를 입력하세요.' }
  }

  const { data: orgRow, error: orgError } = await admin
    .from('orgs')
    .insert({
      name: input.name,
      slug: input.slug,
      vertical: input.vertical,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      bin_number: input.bin_number || null,
      contact_name: input.contact_name || null,
      homepage_url: input.homepage_url || null,
      item_keywords: input.item_keywords?.length ? input.item_keywords : null,
      currency: 'KRW',
      country: 'KR',
      timezone: 'Asia/Seoul',
      enabled_modules: VERTICAL_PRESETS[input.vertical].modules,
    })
    .select('*')
    .single()
  if (orgError || !orgRow) return { ok: false, error: orgError?.message ?? '조직을 만들지 못했습니다.' }
  const org = orgRow as Org

  const { error: memberError } = await admin
    .from('org_members')
    .insert({ org_id: org.id, user_id: ownerUserId, role: 'owner' })
  if (memberError) return { ok: false, error: memberError.message }

  const { error: seqError } = await admin
    .from('doc_sequences')
    .insert(DOC_SEQUENCES.map((seq) => ({ org_id: org.id, ...seq })))
  if (seqError) return { ok: false, error: seqError.message }

  const { error: settingsError } = await admin.from('org_settings').insert(
    SETTING_DEFS.map((def) => ({
      org_id: org.id,
      key: def.key,
      value: def.default as Json,
      updated_by: ownerUserId,
    })),
  )
  if (settingsError) return { ok: false, error: settingsError.message }

  return { ok: true, org }
}
