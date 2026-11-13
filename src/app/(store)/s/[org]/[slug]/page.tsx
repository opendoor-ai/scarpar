import { decodeParam } from '@/lib/utils'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { type Lang } from '@/lib/i18n'
import { getOrgSettings, settingStr } from '@/lib/settings'
import { getAnonClient } from '@/lib/supabase/anon'
import type { PageProps } from '@/lib/types'
import type { CmsPage } from '@/types/db'

import { RenderBlocks } from '@/components/store/blocks/render-blocks'
import { getStoreOrg } from '@/components/store/get-store-org'

export const dynamic = 'force-dynamic'

type PublishedPage = Pick<CmsPage, 'id' | 'title' | 'blocks' | 'seo'>

/**
 * Published cms_pages lookup by (org_id, slug) — React cache()'d so generateMetadata and the
 * page component below share one query per request. Only ever returns status='published' rows;
 * draft/unpublished pages 404 on the public storefront.
 */
const getPublishedPage = cache(async (orgId: string, slug: string): Promise<PublishedPage | null> => {
  const supabase = getAnonClient()
  const { data } = await supabase
    .from('cms_pages')
    .select('id, title, blocks, seo')
    .eq('org_id', orgId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  return (data as PublishedPage | null) ?? null
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; slug: string }>
}): Promise<Metadata> {
  const { org: orgSlug, slug: rawSlug } = await params
  const slug = decodeParam(rawSlug)
  const org = await getStoreOrg(orgSlug)
  if (!org) return {}

  const page = await getPublishedPage(org.id, slug)
  if (!page) return {}

  const seo = page.seo as { title?: string; description?: string } | null
  return {
    title: seo?.title || page.title,
    description: seo?.description,
  }
}

/**
 * Public CMS page renderer — catch-all for any published cms_pages row not covered by a static
 * storefront segment (products/cart/checkout/order/track live as their own folders one level up
 * and always win over this dynamic segment; product/[slug] is nested under /product/ so it never
 * collides with /s/[org]/[slug]). notFound() for missing or unpublished slugs.
 */
export default async function CmsPageRoute({ params }: PageProps<{ org: string; slug: string }>) {
  const { org: orgSlug, slug: rawSlug } = await params
  const slug = decodeParam(rawSlug)
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const page = await getPublishedPage(org.id, slug)
  if (!page) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  return <RenderBlocks blocks={page.blocks} ctx={{ org, lang }} />
}
