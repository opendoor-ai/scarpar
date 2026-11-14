import { cache } from 'react'

import { getAnonClient } from '@/lib/supabase/anon'

/**
 * Narrow, public-safe projection of `orgs` — deliberately NOT the full admin `Org` type from
 * @/types/db (which includes internal fields like plan/enabled_modules/bin_number). Storefront
 * server components should only ever select these columns for anonymous visitors.
 */
export interface StoreOrg {
  id: string
  name: string
  slug: string
  vertical: 'ecommerce' | 'courses' | 'services' | 'realestate'
  currency: string
  timezone: string
  logo_path: string | null
  phone: string | null
  email: string | null
  address: string | null
  contact_name: string | null
  homepage_url: string | null
  item_keywords: string[] | null
}

const STORE_ORG_COLUMNS =
  'id, name, slug, vertical, currency, timezone, logo_path, phone, email, address, contact_name, homepage_url, item_keywords'

/**
 * Resolves an active org by its public slug via the anon client (RLS: `orgs_anon_select_active`,
 * supabase/migrations/0004_storefront_public_org_read.sql). React cache()'d so layout.tsx and
 * any page.tsx under the same request tree share one query. Returns null (caller should
 * notFound()) when the slug doesn't match an active org.
 */
export const getStoreOrg = cache(async (slug: string): Promise<StoreOrg | null> => {
  if (!slug) return null

  const supabase = getAnonClient()
  const { data, error } = await supabase
    .from('orgs')
    .select(STORE_ORG_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as StoreOrg
})
