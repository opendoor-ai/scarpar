'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { getServerClient } from '@/lib/supabase/server'
import { SETTING_DEFS, type SettingDef } from '@/lib/settings/registry'
import type { ActionResult } from '@/lib/types'
import { orgProfileSchema, updateSettingsSchema, type OrgProfileInput } from './schemas'

const SETTING_DEFS_BY_KEY = new Map<string, SettingDef>(SETTING_DEFS.map((def) => [def.key, def]))

/** Structural validation per SettingDef.type. Client pre-validates too; this is defense in depth. */
function validateSettingValue(def: SettingDef, value: unknown): string | null {
  switch (def.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : `${def.label}: 켜기/끄기 값이어야 합니다`
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : `${def.label}: 숫자를 입력하세요`
    case 'text':
      return typeof value === 'string' ? null : `${def.label}: 글자를 입력하세요`
    case 'select':
      return typeof value === 'string' && def.options?.some((opt) => opt.value === value)
        ? null
        : `${def.label}: 선택값이 올바르지 않습니다`
    case 'json':
      return value === undefined ? `${def.label}: JSON 형식이 올바르지 않습니다` : null
    default:
      return null
  }
}

/**
 * Saves one section's worth of settings (org_settings upsert per key), gated
 * on role (per-def `roles` allowlist on top of the page's admin-minimum) and
 * audited as a single before/after diff (docs/architecture.md §5).
 */
export async function updateSettingsAction(input: {
  entries: { key: string; value: unknown }[]
}): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = updateSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  const rows: { org_id: string; key: string; value: unknown; updated_by: string; updated_at: string }[] = []
  const now = new Date().toISOString()

  for (const entry of parsed.data.entries) {
    const def = SETTING_DEFS_BY_KEY.get(entry.key)
    if (!def) return { ok: false, error: `알 수 없는 설정: ${entry.key}` }
    if (def.roles && !def.roles.includes(ctx.role)) {
      return { ok: false, error: `"${def.label}" 설정을 바꿀 권한이 없습니다.` }
    }
    const validationError = validateSettingValue(def, entry.value)
    if (validationError) return { ok: false, error: validationError }

    before[entry.key] = ctx.settings[entry.key]
    after[entry.key] = entry.value
    // updated_at is explicit here (not left to the column default): the
    // default only fires on INSERT, and upsert's ON CONFLICT DO UPDATE only
    // touches columns present in the payload — omitting it would leave
    // updated_at stale on every save after the first.
    rows.push({
      org_id: ctx.org.id,
      key: entry.key,
      value: entry.value,
      updated_by: ctx.user.id,
      updated_at: now,
    })
  }

  try {
    const supabase = await getServerClient()
    const { error } = await supabase
      .from('org_settings')
      .upsert(rows, { onConflict: 'org_id,key' })

    if (error) return { ok: false, error: error.message }

    audit(ctx, 'settings.updated', 'org_settings', ctx.org.id, before, after)
    revalidatePath('/admin/settings')

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '설정을 저장하지 못했습니다' }
  }
}

/**
 * Saves the Organization section: profile fields + the enabled-modules
 * editor (both live on orgs — one section, one save button per the spec).
 */
export async function updateOrgProfileAction(input: OrgProfileInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = orgProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }
  const data = parsed.data

  const before = {
    name: ctx.org.name,
    phone: ctx.org.phone,
    email: ctx.org.email,
    address: ctx.org.address,
    bin_number: ctx.org.bin_number,
    contact_name: ctx.org.contact_name,
    homepage_url: ctx.org.homepage_url,
    item_keywords: ctx.org.item_keywords,
    timezone: ctx.org.timezone,
    enabled_modules: ctx.org.enabled_modules,
  }
  const after = {
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    bin_number: data.bin_number || null,
    contact_name: data.contact_name || null,
    homepage_url: data.homepage_url || null,
    item_keywords: data.item_keywords
      ? data.item_keywords
          .split(',')
          .map((k) => k.trim().replace(/^#/, ''))
          .filter(Boolean)
      : null,
    timezone: data.timezone,
    enabled_modules: data.enabled_modules,
  }

  try {
    const supabase = await getServerClient()
    const { error } = await supabase
      .from('orgs')
      .update({ ...after, updated_at: new Date().toISOString() })
      .eq('id', ctx.org.id)

    if (error) return { ok: false, error: error.message }

    audit(ctx, 'org.updated', 'orgs', ctx.org.id, before, after)
    revalidatePath('/admin/settings')
    revalidatePath('/admin', 'layout') // nav + module gates read enabled_modules

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '회사 정보를 저장하지 못했습니다' }
  }
}
