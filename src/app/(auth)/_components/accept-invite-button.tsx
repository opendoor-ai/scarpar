'use client'

import { useActionState } from 'react'
import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { acceptInviteAction } from '@/lib/actions/auth'
import type { ActionResult } from '@/lib/types'

interface AcceptInviteButtonProps {
  token: string
}

const initialState: ActionResult = { ok: true }

/**
 * useActionState (not a bare form action bind) so a failed accept — e.g. the
 * invite was revoked/expired in the moment between page render and click —
 * surfaces an error instead of silently doing nothing.
 */
export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async () => acceptInviteAction(token),
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {!state.ok ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '참여 중…' : '초대 수락하기'}
      </Button>
    </form>
  )
}
