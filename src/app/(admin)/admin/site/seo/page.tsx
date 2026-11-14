// 검색엔진 최적화(SEO) · AI 답변 최적화(AEO) — 메인 관리자 전용

import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { SeoForm } from '@/modules/site-config/components/seo-form'
import { getSiteConfig } from '@/modules/site-config/get'

export const dynamic = 'force-dynamic'

export default async function SeoPage() {
  await requireUser()
  if (!(await isPlatformAdmin())) notFound()
  const { seo } = await getSiteConfig()
  return (
    <div>
      <PageHeader
        title="검색엔진 최적화 (SEO · AEO)"
        description="구글·네이버·다음 검색과 ChatGPT·Claude 같은 AI 답변에 우리 사이트가 잘 나오도록 설정해요."
      />
      <SeoForm initial={seo} siteUrl={env.APP_URL} />
    </div>
  )
}
