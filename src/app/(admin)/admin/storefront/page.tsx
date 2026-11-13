import { requireOrg } from '@/lib/auth'
import { requireModule } from '@/lib/modules'
import { settingStr } from '@/lib/settings'
import { env } from '@/lib/env'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { StorefrontSettingsForm } from '@/modules/storefront-settings/components/storefront-settings-form'

export const dynamic = 'force-dynamic'

export default async function StorefrontSettingsPage() {
  const ctx = await requireOrg()
  requireModule(ctx.org, 'storefront')

  const storefrontUrl = `${env.APP_URL}/s/${ctx.org.slug}`

  return (
    <>
      <PageHeader title="쇼핑몰 설정" description="디자인, 연락처, 주문 관련 설정" />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">내 쇼핑몰 주소</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <code className="rounded bg-muted px-2 py-1 text-xs">{storefrontUrl}</code>
              <CopyButton text={storefrontUrl} />
            </div>
            <p className="text-xs text-muted-foreground">개인 도메인 연결: 준비 중</p>
          </CardContent>
        </Card>

        <StorefrontSettingsForm
          defaultValues={{
            announcement: settingStr(ctx.settings, 'storefront.announcement'),
            whatsapp_number: settingStr(ctx.settings, 'storefront.whatsapp_number'),
            primary_color: settingStr(ctx.settings, 'storefront.primary_color') || '#059669',
            name: ctx.org.name,
            phone: ctx.org.phone ?? '',
            email: ctx.org.email ?? '',
            address: ctx.org.address ?? '',
            logo_path: ctx.org.logo_path,
          }}
        />
      </div>
    </>
  )
}
