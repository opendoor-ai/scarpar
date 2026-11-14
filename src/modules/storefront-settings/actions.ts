'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

// Separate module from src/modules/storefront/ (owned by the customer-facing storefront slice —
// checkout/cart/review/inquiry actions) to avoid colliding with that slice's files. This one is
// purely the /admin/storefront settings page's own action.

const updateStorefrontSettingsSchema = z.object({
  announcement: z.string().trim().max(300),
  kakao_channel_url: z.string().trim().max(300),
  primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #059669'),
  org: z.object({
    name: z.string().trim().min(1, 'Business name is required').max(200),
    phone: z.string().trim().max(32),
    email: z.union([z.string().trim().email('이메일 형식이 올바르지 않습니다'), z.literal('')]),
    address: z.string().trim().max(500),
    logo_path: z.string().nullable(),
  }),
})

export type UpdateStorefrontSettingsInput = z.infer<typeof updateStorefrontSettingsSchema>

/**
 * Saves the dedicated storefront settings page: the 3 storefront.* org_settings keys plus the
 * org's public-facing fields (name/phone/email/address/logo_path). Role floor matches
 * org_settings_write_owner_admin / orgs_update_owner_admin RLS (owner/admin only — stricter than
 * the manager+ floor used elsewhere in this slice for cms_pages/menus).
 */
export async function updateOrgSettingsAction(input: UpdateStorefrontSettingsInput): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = updateStorefrontSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '설정값이 올바르지 않습니다.' }
  }

  const { announcement, kakao_channel_url, primary_color, org } = parsed.data
  const supabase = await getServerClient()

  const settingsRows = [
    { org_id: ctx.org.id, key: 'storefront.announcement', value: announcement, updated_by: ctx.user.id },
    { org_id: ctx.org.id, key: 'storefront.kakao_channel_url', value: kakao_channel_url, updated_by: ctx.user.id },
    { org_id: ctx.org.id, key: 'storefront.primary_color', value: primary_color, updated_by: ctx.user.id },
  ]

  const { error: settingsError } = await supabase
    .from('org_settings')
    .upsert(settingsRows, { onConflict: 'org_id,key' })

  if (settingsError) {
    return { ok: false, error: settingsError.message }
  }

  const { error: orgError } = await supabase
    .from('orgs')
    .update({
      name: org.name,
      phone: org.phone || null,
      email: org.email || null,
      address: org.address || null,
      logo_path: org.logo_path,
    })
    .eq('id', ctx.org.id)

  if (orgError) {
    return { ok: false, error: orgError.message }
  }

  audit(ctx, 'org_settings:update', 'org_settings', ctx.org.id, undefined, {
    announcement,
    kakao_channel_url,
    primary_color,
  })
  audit(ctx, 'org:update', 'orgs', ctx.org.id, undefined, org)

  revalidatePath('/admin/storefront')

  return { ok: true }
}
