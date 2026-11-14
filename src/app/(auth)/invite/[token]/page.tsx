import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getUser } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import type { PageProps } from '@/lib/types'
import type { Invitation, Org } from '@/types/db'

import { AcceptInviteButton } from '../../_components/accept-invite-button'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '조직 초대 — 전자동기계광고' }

function InvalidInviteCard({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <EmptyState
          icon={AlertCircle}
          title={title}
          description="초대한 분께 새 초대 링크를 요청하세요."
          action={
            <Button asChild size="sm" variant="secondary">
              <Link href="/login">로그인으로 돌아가기</Link>
            </Button>
          }
        />
      </CardContent>
    </Card>
  )
}

export default async function InvitePage({ params }: PageProps<{ token: string }>) {
  const { token } = await params
  const user = await getUser()

  // invitations carries no anon/authenticated RLS policy for non-members by
  // design (supabase/migrations/0001_core.sql) — the admin client is the
  // documented way to look up an invite by its secret token.
  const admin = getAdminClient()

  const { data: invitationRow } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  const invitation = invitationRow as Invitation | null
  const isExpired = invitation ? new Date(invitation.expires_at).getTime() < Date.now() : false
  const isValid = Boolean(invitation) && invitation?.status === 'pending' && !isExpired

  if (!invitation || !isValid) {
    return (
      <InvalidInviteCard
        title={!invitation ? '초대장을 찾을 수 없습니다' : isExpired ? '초대장 유효기간이 지났습니다' : '더 이상 유효하지 않은 초대장입니다'}
      />
    )
  }

  const { data: orgRow } = await admin
    .from('orgs')
    .select('*')
    .eq('id', invitation.org_id)
    .eq('is_active', true)
    .maybeSingle()
  const org = orgRow as Org | null

  if (!org) {
    return <InvalidInviteCard title="조직을 찾을 수 없습니다" />
  }

  const nextPath = `/invite/${token}`

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{org.name}에 초대되었습니다</CardTitle>
          <CardDescription>
            초대를 수락하려면 {invitation.email} 계정으로 로그인하거나 회원가입하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pb-4">
          <Button asChild className="w-full">
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>로그인</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>회원가입</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Join {org.name}</CardTitle>
        <CardDescription>You&apos;ve been invited to join as {invitation.role}.</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <AcceptInviteButton token={token} />
      </CardContent>
    </Card>
  )
}
