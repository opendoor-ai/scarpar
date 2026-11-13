import { requireOrg, requireRole } from '@/lib/auth'
import { env } from '@/lib/env'
import { getServerClient } from '@/lib/supabase/server'
import type { Invitation, OrgMember, Profile, Role } from '@/types/db'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import { InviteMemberDialog } from '@/modules/staff/components/invite-member-dialog'
import { InvitesSection, type InviteRow } from '@/modules/staff/components/invites-section'
import { MembersTable, type StaffMemberRow } from '@/modules/staff/components/members-table'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const supabase = await getServerClient()

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from('org_members')
      .select('org_id, user_id, role, created_at')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('invitations')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const members = (membersResult.data ?? []) as OrgMember[]
  const userIds = members.map((m) => m.user_id)

  const profilesResult = userIds.length
    ? await supabase.from('profiles').select('*').in('user_id', userIds)
    : { data: [] as Profile[] }

  const profileByUserId = new Map((profilesResult.data as Profile[] | null)?.map((p) => [p.user_id, p]))

  const memberRows: StaffMemberRow[] = members.map((m) => {
    const profile = profileByUserId.get(m.user_id)
    return {
      userId: m.user_id,
      role: m.role,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      createdAt: m.created_at,
    }
  })

  const inviteRows: InviteRow[] = ((invitesResult.data ?? []) as Invitation[]).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role as Role,
    expiresAt: invite.expires_at,
    link: `${env.APP_URL}/invite/${invite.token}`,
  }))

  return (
    <div>
      <PageHeader
        title="직원관리"
        description="관리자 화면을 쓸 수 있는 사람을 관리합니다."
        actions={<InviteMemberDialog currentRole={ctx.role} />}
      />

      <div className="flex flex-col gap-8">
        <MembersTable members={memberRows} currentRole={ctx.role} currentUserId={ctx.user.id} />

        <div className="flex flex-col gap-3">
          <Separator />
          <h2 className="text-sm font-semibold">대기 중인 초대</h2>
          <InvitesSection invites={inviteRows} />
        </div>
      </div>
    </div>
  )
}
