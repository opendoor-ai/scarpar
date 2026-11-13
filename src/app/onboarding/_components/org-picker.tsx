import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { setActiveOrg } from '@/lib/actions/set-org'
import { getIcon } from '@/lib/icon-map'
import { VERTICAL_PRESETS } from '@/modules/verticals'
import type { Org, Role } from '@/types/db'

interface OrgPickerProps {
  memberships: { org: Org; role: Role }[]
}

/**
 * Plain server component: each "Select" button is a <form action={...}> bound
 * to the shared setActiveOrg server action via .bind() (Next's documented
 * pattern for passing an extra argument to a form action with no client JS).
 * setActiveOrg already redirects to /onboarding on its own failure path
 * (stale/revoked membership), so no client-side error state is needed here.
 */
export function OrgPicker({ memberships }: OrgPickerProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">조직 선택</h2>
      <div className="flex flex-col gap-2">
        {memberships.map(({ org, role }) => {
          const preset = VERTICAL_PRESETS[org.vertical]
          const Icon = getIcon(preset.icon)

          return (
            <Card key={org.id} className="flex-row items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{org.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {preset.name} · {role}
                  </span>
                </div>
              </div>
              <form action={setActiveOrg.bind(null, org.id)}>
                <Button type="submit" size="sm" variant="secondary">
선택
                </Button>
              </form>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
