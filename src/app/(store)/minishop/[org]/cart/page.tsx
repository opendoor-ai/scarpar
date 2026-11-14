import { notFound } from 'next/navigation'

import { t, type Lang } from '@/lib/i18n'
import { getOrgSettings, settingStr } from '@/lib/settings'
import type { PageProps } from '@/lib/types'

import { CartView } from '@/components/store/cart-view'
import { getStoreOrg } from '@/components/store/get-store-org'

export const dynamic = 'force-dynamic'

export default async function CartPage({ params }: PageProps<{ org: string }>) {
  const { org: orgSlug } = await params
  const org = await getStoreOrg(orgSlug)
  if (!org) notFound()

  const settings = await getOrgSettings(org.id)
  const lang = settingStr(settings, 'localization.language') as Lang

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold">{t('your_cart', lang)}</h1>
      <CartView orgSlug={org.slug} lang={lang} />
    </div>
  )
}
