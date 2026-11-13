'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'
import { toggleOrgActiveAction } from '@/modules/platform/actions'

function OrgActiveSwitch({ orgId, isActive }: { orgId: string; isActive: boolean }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleChange(next: boolean) {
    setPending(true)
    try {
      const result = await toggleOrgActiveAction({ orgId, isActive: next })
      if (result.ok) {
        toast.success(next ? '조직이 활성화되었습니다' : '조직이 비활성화되었습니다')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } finally {
      setPending(false)
    }
  }

  return <Switch checked={isActive} disabled={pending} onCheckedChange={handleChange} />
}

export { OrgActiveSwitch }
