'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { audit } from '@/lib/audit'
import { ORG_COOKIE, requireUser, type OrgContext } from '@/lib/auth'
import { env } from '@/lib/env'
import { setActiveOrg } from '@/lib/actions/set-org'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import type { Invitation, Org } from '@/types/db'

import {
  forgotSchema,
  loginSchema,
  signupSchema,
  type ForgotInput,
  type LoginInput,
  type SignupInput,
} from './auth-schemas'

/**
 * Only ever redirect to a same-origin relative path after auth — never an
 * absolute/external URL. Guards the ?next= round trip used by the invite flow.
 */
function safeNextPath(next: string | undefined): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  if (next.includes('://')) return null
  return next
}

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }
  }

  let signInError: string | null = null
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })
    signInError = error?.message ?? null
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '로그인에 실패했습니다.' }
  }

  if (signInError) {
    return { ok: false, error: signInError }
  }

  // redirect() throws — deliberately outside the try/catch above so it is
  // never accidentally swallowed as a "sign in failed" error.
  redirect(safeNextPath(parsed.data.next) ?? '/admin')
}

export async function signupAction(
  input: SignupInput,
): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }
  }

  let hasSession = false
  try {
    const supabase = await getServerClient()
    // emailRedirectTo intentionally omitted ("emailRedirect off") — no email
    // confirmation callback route exists in this slice; if confirmation is
    // required project-side, Supabase's default confirmation page is used.
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.full_name },
      },
    })
    if (error) return { ok: false, error: error.message }
    hasSession = Boolean(data.session)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '회원가입에 실패했습니다.' }
  }

  if (!hasSession) {
    // Email confirmation is required project-side — no session yet.
    return { ok: true, data: { needsEmailConfirmation: true } }
  }

  redirect(safeNextPath(parsed.data.next) ?? '/onboarding')
}

export async function forgotAction(input: ForgotInput): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }
  }

  try {
    const supabase = await getServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.APP_URL}/reset-password`,
    })
    if (error) return { ok: false, error: error.message }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '비밀번호 재설정 메일을 보내지 못했습니다.' }
  }

  return { ok: true }
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await getServerClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[logoutAction] signOut failed', err)
  }

  const cookieStore = await cookies()
  cookieStore.delete(ORG_COOKIE)

  redirect('/login')
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const user = await requireUser()

  // Invitations carry no anon/authenticated RLS policy for non-members by
  // design (supabase/migrations/0001_core.sql) — the admin client is the
  // documented way to read/accept by token.
  const admin = getAdminClient()

  const { data: invitationRow, error: inviteError } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invitationRow) {
    return { ok: false, error: '초대장을 찾을 수 없습니다.' }
  }

  const invitation = invitationRow as Invitation
  const isExpired = new Date(invitation.expires_at).getTime() < Date.now()

  if (invitation.status !== 'pending' || isExpired) {
    return {
      ok: false,
      error: isExpired ? '초대장 유효기간이 지났습니다.' : '더 이상 유효하지 않은 초대장입니다.',
    }
  }

  const { data: orgRow, error: orgError } = await admin
    .from('orgs')
    .select('*')
    .eq('id', invitation.org_id)
    .eq('is_active', true)
    .maybeSingle()

  if (orgError || !orgRow) {
    return { ok: false, error: '조직을 찾을 수 없습니다.' }
  }
  const org = orgRow as Org

  const { error: memberError } = await admin
    .from('org_members')
    .upsert({ org_id: org.id, user_id: user.id, role: invitation.role }, { onConflict: 'org_id,user_id' })

  if (memberError) {
    return { ok: false, error: memberError.message }
  }

  const { error: updateError } = await admin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  const auditCtx: OrgContext = { user, org, role: invitation.role, settings: {} }
  audit(auditCtx, 'invitation.accepted', 'org_member', `${org.id}:${user.id}`, null, {
    role: invitation.role,
  })

  await setActiveOrg(org.id)
  return { ok: true }
}
