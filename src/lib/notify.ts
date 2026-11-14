import { getAdminClient } from '@/lib/supabase/admin'
import { getOrgSettings, getSetting } from '@/lib/settings'
import { ROLE_RANK } from '@/lib/auth'
import type { Role } from '@/types/db'

/** Events fired across the app (docs/architecture.md §10). */
export type NotifyEvent =
  | 'order_placed'
  | 'payment_received'
  | 'order_dispatched'
  | 'order_delivered'
  | 'low_stock'
  | 'return_requested'
  | 'inquiry_received'
  | 'question_received'

export type NotifyChannel = 'inapp' | 'sms' | 'email'

export interface NotifyPayload {
  title: string
  body?: string
  link?: string
  targetUserIds?: string[]
}

type ChannelAdapter = (orgId: string, event: NotifyEvent, payload: NotifyPayload) => Promise<void>

async function resolveTargetUserIds(orgId: string, targetUserIds?: string[]): Promise<string[]> {
  if (targetUserIds && targetUserIds.length > 0) return targetUserIds

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('org_members')
    .select('user_id, role')
    .eq('org_id', orgId)

  if (error || !data) return []

  return (data as { user_id: string; role: Role }[])
    .filter((member) => ROLE_RANK[member.role] >= ROLE_RANK.staff)
    .map((member) => member.user_id)
}

const channels: Record<NotifyChannel, ChannelAdapter> = {
  inapp: async (orgId, event, payload) => {
    const userIds = await resolveTargetUserIds(orgId, payload.targetUserIds)
    if (userIds.length === 0) return

    const supabase = getAdminClient()
    const rows = userIds.map((userId) => ({
      org_id: orgId,
      user_id: userId,
      type: event,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    }))

    const { error } = await supabase.from('notifications').insert(rows)
    if (error) console.error('[notify:inapp] insert failed', error)
  },

  // v1 driver = console.log + audit trail; real provider adapters are documented
  // stubs (docs/architecture.md §10/§13).
  sms: async (orgId, event, payload) => {
    console.log('[notify:sms]', orgId, event, payload)
  },

  email: async (orgId, event, payload) => {
    console.log('[notify:email]', orgId, event, payload)
  },
}

/**
 * Reads the org's `notifications.events` setting (event -> channel list;
 * unlisted events default to ["inapp"]) and fans out to the configured
 * channel adapters. Server-only, never throws.
 */
export async function notify(
  orgId: string,
  event: NotifyEvent,
  payload: NotifyPayload,
): Promise<void> {
  try {
    const settings = await getOrgSettings(orgId)
    const eventsSetting = getSetting<Partial<Record<NotifyEvent, NotifyChannel[]>>>(
      settings,
      'notifications.events',
    )
    const channelKeys = eventsSetting?.[event] ?? (['inapp'] as NotifyChannel[])

    await Promise.all(channelKeys.map((key) => channels[key](orgId, event, payload)))
  } catch (err) {
    console.error('[notify] failed', orgId, event, err)
  }
}
