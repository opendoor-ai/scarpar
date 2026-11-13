'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { env } from '@/lib/env'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import type { Invitation } from '@/types/db'
import {
  inviteMemberSchema,
  removeMemberSchema,
  revokeInviteSchema,
  updateMemberRoleSchema,
  type InviteMemberInput,
  type RemoveMemberInput,
  type RevokeInviteInput,
  type UpdateMemberRoleInput,
} from './schemas'

async function countOwners(orgId: string): Promise<number> {
  const supabase = await getServerClient()
  const { count } = await supabase
    .from('org_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('role', 'owner')
  return count ?? 0
}

/** Inserts a pending invitation and returns its shareable link. Email
 *  delivery is stubbed (console driver, matching lib/notify.ts's own email
 *  channel pattern) — invitations aren't a NotifyEvent, so this stays local
 *  rather than reaching into the shared notify() fan-out. */
export async function createInviteAction(
  input: InviteMemberInput,
): Promise<ActionResult<{ token: string; link: string }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = inviteMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }
  const { email, role } = parsed.data

  if (role === 'owner' && ctx.role !== 'owner') {
    return { ok: false, error: '대표(소유자)만 다른 대표를 초대할 수 있습니다.' }
  }

  try {
    const supabase = await getServerClient()

    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('org_id', ctx.org.id)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return { ok: false, error: '이 이메일로 보낸 초대가 이미 대기 중입니다.' }
    }

    const { data: invite, error } = await supabase
      .from('invitations')
      .insert({ org_id: ctx.org.id, email, role, invited_by: ctx.user.id })
      .select()
      .single()

    if (error || !invite) {
      return { ok: false, error: error?.message ?? '초대를 만들지 못했습니다' }
    }

    const row = invite as Invitation
    const link = `${env.APP_URL}/invite/${row.token}`

    console.log('[staff:invite:email]', { to: email, role, link })

    audit(ctx, 'staff.invited', 'invitations', row.id, undefined, { email, role })
    revalidatePath('/admin/staff')

    return { ok: true, data: { token: row.token, link } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '초대를 만들지 못했습니다' }
  }
}

export async function revokeInviteAction(input: RevokeInviteInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = revokeInviteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }

  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', parsed.data.inviteId)
      .eq('org_id', ctx.org.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle()

    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: '초대를 찾을 수 없거나 이미 처리되었습니다' }

    audit(ctx, 'staff.invite_revoked', 'invitations', parsed.data.inviteId, { status: 'pending' }, { status: 'revoked' })
    revalidatePath('/admin/staff')

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '초대를 취소하지 못했습니다' }
  }
}

/** Owner-role changes are double-guarded: assigning OR removing the owner
 *  role both require the caller to already be an owner, and the org's last
 *  remaining owner can never be demoted (mirrors the removeMember guard). */
export async function updateMemberRoleAction(input: UpdateMemberRoleInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = updateMemberRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }
  const { userId, role } = parsed.data

  try {
    const supabase = await getServerClient()
    const { data: member, error: fetchError } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', ctx.org.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !member) return { ok: false, error: '직원을 찾을 수 없습니다' }
    const before = member.role as string

    const touchesOwner = role === 'owner' || before === 'owner'
    if (touchesOwner && ctx.role !== 'owner') {
      return { ok: false, error: '대표(소유자)만 대표 권한을 지정하거나 바꿀 수 있습니다.' }
    }

    if (before === 'owner' && role !== 'owner') {
      const owners = await countOwners(ctx.org.id)
      if (owners <= 1) {
        return { ok: false, error: '유일한 대표의 권한은 바꿀 수 없습니다.' }
      }
    }

    const { error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', ctx.org.id)
      .eq('user_id', userId)

    if (error) return { ok: false, error: error.message }

    audit(ctx, 'staff.role_updated', 'org_members', userId, { role: before }, { role })
    revalidatePath('/admin/staff')

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '권한을 변경하지 못했습니다' }
  }
}

export async function removeMemberAction(input: RemoveMemberInput): Promise<ActionResult> {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const parsed = removeMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  }
  const { userId } = parsed.data

  try {
    const supabase = await getServerClient()
    const { data: member, error: fetchError } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', ctx.org.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !member) return { ok: false, error: '직원을 찾을 수 없습니다' }
    const before = member.role as string

    if (before === 'owner') {
      if (ctx.role !== 'owner') {
        return { ok: false, error: '대표(소유자)만 다른 대표를 삭제할 수 있습니다.' }
      }
      const owners = await countOwners(ctx.org.id)
      if (owners <= 1) {
        return { ok: false, error: '마지막 대표는 삭제할 수 없습니다.' }
      }
    }

    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', ctx.org.id)
      .eq('user_id', userId)

    if (error) return { ok: false, error: error.message }

    audit(ctx, 'staff.removed', 'org_members', userId, { role: before }, undefined)
    revalidatePath('/admin/staff')

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '직원을 삭제하지 못했습니다' }
  }
}
