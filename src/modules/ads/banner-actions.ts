'use server'

// 배너 관리 서버 작업 — 플랫폼 관리자 전용
// 그룹: 추가·수정·복사·삭제·켜고 끄기·순서 / 배너: 그룹 단위 한 번에 저장 / 백업: 시점 복구(최근 5회)·파일

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getPrimaryImages } from '@/components/store/get-primary-images'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

import {
  bannerItemSchema,
  groupSchema,
  type BannerGroupRow,
  type BannerItem,
  type GroupBackup,
  type GroupInput,
} from './banner-types'
import { rowToItem, type BannerRowDb } from './banner-rows'
import { kstEnd, kstStart } from './schemas'

const SNAPSHOT_KEEP = 5

async function guard(): Promise<{ userId: string } | { error: string }> {
  try {
    const user = await requirePlatformAdmin()
    return { userId: user.id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

function refresh() {
  revalidatePath('/admin/ads')
  revalidatePath('/', 'layout')
}

function dbError(error: { code?: string; message: string }): string {
  if (error.code === '23505') return '같은 배너 코드가 이미 있어요. 다른 코드를 입력해 주세요.'
  if (/banner_groups|group_id|schema cache/i.test(error.message)) {
    return '배너 그룹 표가 아직 없어요. Supabase에서 0020_banner_groups.sql을 먼저 실행해 주세요.'
  }
  return error.message
}

// ------------------------------------------------------------------ 그룹

export async function saveGroupAction(id: string | null, input: GroupInput): Promise<ActionResult<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const parsed = groupSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const d = parsed.data
  const admin = getAdminClient()

  if (id) {
    const { data: before } = await admin.from('banner_groups').select('code, is_builtin').eq('id', id).maybeSingle()
    if (!before) return { ok: false, error: '그룹을 찾을 수 없어요.' }
    const b = before as { code: string; is_builtin: boolean }
    if (b.is_builtin && b.code !== d.code) return { ok: false, error: '기본 그룹의 배너 코드는 바꿀 수 없어요.' }
    const { error } = await admin
      .from('banner_groups')
      .update({
        name: d.name,
        code: d.code,
        kind: d.kind,
        guide: d.guide || null,
        template_html: d.template_html.trim() || null,
        is_active: d.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return { ok: false, error: dbError(error) }
    // 배너의 위치 값도 새 코드로
    if (b.code !== d.code) await admin.from('banner_ads').update({ placement: d.code }).eq('group_id', id)
    if (d.is_active) await turnOffPartner(id)
    refresh()
    return { ok: true, data: { id } }
  }

  const { count } = await admin.from('banner_groups').select('id', { count: 'exact', head: true })
  const { data, error } = await admin
    .from('banner_groups')
    .insert({
      name: d.name,
      code: d.code,
      kind: d.kind,
      guide: d.guide || null,
      template_html: d.template_html.trim() || null,
      is_active: d.is_active,
      sort_order: (count ?? 0) * 10 + 1000,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: dbError(error ?? { message: '그룹을 만들지 못했어요.' }) }
  refresh()
  return { ok: true, data: { id: (data as { id: string }).id } }
}

/** 하나만 켤 수 있는 그룹 짝 (메인 슬라이드 A·B타입) */
const EXCLUSIVE_PAIRS: [string, string][] = [['main', 'main_b']]

/** 켠 그룹과 짝인 그룹을 끔 */
async function turnOffPartner(groupId: string) {
  const admin = getAdminClient()
  const { data } = await admin.from('banner_groups').select('code').eq('id', groupId).maybeSingle()
  const code = (data as { code: string } | null)?.code
  const pair = EXCLUSIVE_PAIRS.find((p) => code && p.includes(code))
  if (!pair) return
  const partner = pair[0] === code ? pair[1] : pair[0]
  await admin.from('banner_groups').update({ is_active: false }).eq('code', partner)
}

export async function toggleGroupAction(id: string, active: boolean): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const { error } = await getAdminClient().from('banner_groups').update({ is_active: active }).eq('id', id)
  if (error) return { ok: false, error: dbError(error) }
  if (active) await turnOffPartner(id)
  refresh()
  return { ok: true }
}

export async function deleteGroupAction(id: string): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const admin = getAdminClient()
  const { data } = await admin.from('banner_groups').select('is_builtin').eq('id', id).maybeSingle()
  if (!data) return { ok: false, error: '그룹을 찾을 수 없어요.' }
  if ((data as { is_builtin: boolean }).is_builtin) {
    return { ok: false, error: '사이트에 자리가 정해진 기본 그룹은 삭제할 수 없어요. 대신 꺼 두세요.' }
  }
  const { error } = await admin.from('banner_groups').delete().eq('id', id)
  if (error) return { ok: false, error: dbError(error) }
  refresh()
  return { ok: true }
}

export async function reorderGroupsAction(ids: string[]): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  if (!z.array(z.string().uuid()).max(500).safeParse(ids).success) return { ok: false, error: '순서 정보가 올바르지 않아요.' }
  const admin = getAdminClient()
  const results = await Promise.all(
    ids.map((id, i) => admin.from('banner_groups').update({ sort_order: (i + 1) * 10 }).eq('id', id)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: dbError(failed.error) }
  refresh()
  return { ok: true }
}

export async function duplicateGroupAction(id: string): Promise<ActionResult<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const admin = getAdminClient()
  const { data } = await admin.from('banner_groups').select('*').eq('id', id).maybeSingle()
  if (!data) return { ok: false, error: '그룹을 찾을 수 없어요.' }
  const src = data as BannerGroupRow
  const { data: codes } = await admin.from('banner_groups').select('code')
  const used = new Set(((codes ?? []) as { code: string }[]).map((c) => c.code))
  let code = `${src.code}_copy`
  for (let n = 2; used.has(code); n++) code = `${src.code}_copy${n}`

  const { data: created, error } = await admin
    .from('banner_groups')
    .insert({
      code,
      name: `${src.name} (복사)`,
      kind: src.kind === 'common' ? 'hub' : src.kind,
      guide: src.guide,
      template_html: src.template_html,
      is_active: false,
      sort_order: src.sort_order + 1,
    })
    .select('*')
    .single()
  if (error || !created) return { ok: false, error: dbError(error ?? { message: '복사하지 못했어요.' }) }
  const items = (await loadBannerItems(id)).map((b) => ({ ...b, id: null }))
  const res = await applyBanners(created as BannerGroupRow, items, g.userId, false)
  if (!res.ok) return res
  refresh()
  return { ok: true, data: { id: (created as { id: string }).id } }
}

// ------------------------------------------------------------------ 배너 (그룹 단위 저장)

async function loadBannerItems(groupId: string): Promise<BannerItem[]> {
  const { data } = await getAdminClient()
    .from('banner_ads')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true })
  return ((data ?? []) as BannerRowDb[]).map(rowToItem)
}

/** 배너 목록을 그대로 저장 (없어진 배너는 삭제) + 시점 기록 */
async function applyBanners(
  group: BannerGroupRow,
  items: BannerItem[],
  userId: string,
  snapshot = true,
): Promise<ActionResult> {
  const admin = getAdminClient()
  const { data: existingRows } = await admin.from('banner_ads').select('id').eq('group_id', group.id)
  const existing = new Set(((existingRows ?? []) as { id: string }[]).map((r) => r.id))
  const keep = new Set(items.flatMap((b) => (b.id && existing.has(b.id) ? [b.id] : [])))

  const toDelete = [...existing].filter((id) => !keep.has(id))
  if (toDelete.length > 0) {
    const { error } = await admin.from('banner_ads').delete().in('id', toDelete)
    if (error) return { ok: false, error: dbError(error) }
  }

  const now = new Date().toISOString()
  for (const [i, b] of items.entries()) {
    const texts = b.texts.filter((t, idx) => idx === 0 || t.text.trim() !== '' || t.color || t.pc_size)
    const row = {
      group_id: group.id,
      placement: group.code,
      title: b.title || `${group.name} ${i + 1}`,
      image_pc: b.image_pc || null,
      image_mobile: b.image_mobile || null,
      texts,
      subtitle: texts[0]?.text.replace(/<[^>]+>/g, '') || null,
      phone: texts[1]?.text.replace(/<[^>]+>/g, '') || null,
      link_url: b.link_url || null,
      link_target: b.link_target,
      colors: b.colors.slice(0, 4),
      html: b.html || null,
      product_ids: b.product_ids,
      extra_images: b.extra_images.filter(Boolean),
      starts_at: b.always || !b.starts_on ? null : kstStart(b.starts_on),
      ends_at: b.always || !b.ends_on ? null : kstEnd(b.ends_on),
      is_active: b.is_active,
      sort_order: i,
      category_id: b.category_id,
      advertiser_org_id: b.advertiser_org_id,
      advertiser_name: b.advertiser_name || null,
      payment_status: b.payment_status,
      price_won: b.price_won,
      memo: b.memo || null,
      updated_at: now,
    }
    const { error } =
      b.id && keep.has(b.id)
        ? await admin.from('banner_ads').update(row).eq('id', b.id)
        : await admin.from('banner_ads').insert({ ...row, created_by: userId })
    if (error) return { ok: false, error: dbError(error) }
  }

  if (snapshot) {
    const saved = await loadBannerItems(group.id)
    const data: GroupBackup = {
      version: 1,
      exported_at: now,
      group: {
        code: group.code,
        name: group.name,
        kind: group.kind,
        guide: group.guide,
        template_html: group.template_html,
        is_active: group.is_active,
      },
      banners: saved,
    }
    await admin
      .from('banner_group_snapshots')
      .insert({ group_id: group.id, data, banner_count: saved.length, created_by: userId })
    const { data: old } = await admin
      .from('banner_group_snapshots')
      .select('id')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .range(SNAPSHOT_KEEP, 1000)
    const oldIds = ((old ?? []) as { id: number }[]).map((r) => r.id)
    if (oldIds.length > 0) await admin.from('banner_group_snapshots').delete().in('id', oldIds)
  }
  return { ok: true }
}

async function loadGroup(id: string): Promise<BannerGroupRow | null> {
  const { data } = await getAdminClient().from('banner_groups').select('*').eq('id', id).maybeSingle()
  return (data as BannerGroupRow | null) ?? null
}

export async function saveGroupBannersAction(groupId: string, items: BannerItem[]): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const parsed = z.array(bannerItemSchema).max(300).safeParse(items)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const n = typeof issue?.path[0] === 'number' ? `${issue.path[0] + 1}번째 배너: ` : ''
    return { ok: false, error: `${n}${issue?.message ?? '입력값이 올바르지 않습니다'}` }
  }
  const group = await loadGroup(groupId)
  if (!group) return { ok: false, error: '그룹을 찾을 수 없어요.' }
  if (group.code === 'category' && parsed.data.some((b) => b.is_active && !b.category_id)) {
    return { ok: false, error: '카테고리 배너는 카테고리를 꼭 골라야 해요.' }
  }
  const res = await applyBanners(group, parsed.data, g.userId)
  if (res.ok) refresh()
  return res
}

// ------------------------------------------------------------------ 백업·복구

export async function listSnapshotsAction(
  groupId: string,
): Promise<ActionResult<{ id: number; created_at: string; banner_count: number }[]>> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const { data, error } = await getAdminClient()
    .from('banner_group_snapshots')
    .select('id, created_at, banner_count')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(SNAPSHOT_KEEP)
  if (error) return { ok: false, error: dbError(error) }
  return { ok: true, data: (data ?? []) as { id: number; created_at: string; banner_count: number }[] }
}

export async function restoreSnapshotAction(groupId: string, snapshotId: number): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const admin = getAdminClient()
  const { data } = await admin
    .from('banner_group_snapshots')
    .select('data')
    .eq('id', snapshotId)
    .eq('group_id', groupId)
    .maybeSingle()
  if (!data) return { ok: false, error: '복구할 시점을 찾을 수 없어요.' }
  const group = await loadGroup(groupId)
  if (!group) return { ok: false, error: '그룹을 찾을 수 없어요.' }
  const backup = (data as { data: GroupBackup }).data
  const parsed = z.array(bannerItemSchema).safeParse(backup.banners ?? [])
  if (!parsed.success) return { ok: false, error: '기록이 손상되어 복구할 수 없어요.' }
  const res = await applyBanners(group, parsed.data, g.userId)
  if (res.ok) refresh()
  return res
}

export async function exportGroupAction(groupId: string): Promise<ActionResult<GroupBackup>> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const group = await loadGroup(groupId)
  if (!group) return { ok: false, error: '그룹을 찾을 수 없어요.' }
  return {
    ok: true,
    data: {
      version: 1,
      exported_at: new Date().toISOString(),
      group: {
        code: group.code,
        name: group.name,
        kind: group.kind,
        guide: group.guide,
        template_html: group.template_html,
        is_active: group.is_active,
      },
      banners: await loadBannerItems(groupId),
    },
  }
}

export async function importGroupAction(groupId: string, backup: GroupBackup): Promise<ActionResult> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const group = await loadGroup(groupId)
  if (!group) return { ok: false, error: '그룹을 찾을 수 없어요.' }
  if (!backup || backup.version !== 1 || !Array.isArray(backup.banners)) {
    return { ok: false, error: '배너 백업 파일이 아니에요.' }
  }
  const parsed = z.array(bannerItemSchema).max(300).safeParse(backup.banners)
  if (!parsed.success) return { ok: false, error: '파일 내용이 올바르지 않아요.' }
  // 그룹 설정(안내·배너 코드)도 함께 되돌림 — 코드(이름표)는 그대로
  if (backup.group) {
    await getAdminClient()
      .from('banner_groups')
      .update({
        guide: backup.group.guide ?? group.guide,
        template_html: backup.group.template_html ?? group.template_html,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId)
  }
  const res = await applyBanners({ ...group, ...backup.group, id: group.id, code: group.code }, parsed.data, g.userId)
  if (res.ok) refresh()
  return res
}

// ------------------------------------------------------------------ 상품 검색 (배너에 연결)

export interface ProductPick {
  id: string
  product_no: number
  name: string
  image: string | null
  org_name: string
}

export async function searchProductsForBannerAction(query: string): Promise<ActionResult<ProductPick[]>> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  const q = query.replace(/[,()%*\\]/g, ' ').trim().slice(0, 40)
  const admin = getAdminClient()
  let req = admin
    .from('products')
    .select('id, product_no, name, org_id, org:orgs(name)')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(20)
  const asNo = Number(q.replace(/^p/i, ''))
  if (q) req = Number.isInteger(asNo) && asNo > 0 ? req.eq('product_no', asNo) : req.ilike('name', `%${q}%`)
  const { data, error } = await req
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: await toPicks(data ?? []) }
}

export async function getProductPicksAction(ids: string[]): Promise<ActionResult<ProductPick[]>> {
  const g = await guard()
  if ('error' in g) return { ok: false, error: g.error }
  if (ids.length === 0) return { ok: true, data: [] }
  const { data } = await getAdminClient()
    .from('products')
    .select('id, product_no, name, org_id, org:orgs(name)')
    .in('id', ids.slice(0, 500))
  return { ok: true, data: await toPicks(data ?? []) }
}

async function toPicks(rows: unknown[]): Promise<ProductPick[]> {
  type R = { id: string; product_no: number; name: string; org_id: string; org: { name: string } | { name: string }[] | null }
  const list = rows as R[]
  const byOrg = new Map<string, string[]>()
  for (const r of list) byOrg.set(r.org_id, [...(byOrg.get(r.org_id) ?? []), r.id])
  const maps = await Promise.all([...byOrg].map(([org, ids]) => getPrimaryImages(org, ids)))
  const images: Record<string, string | null> = Object.assign({}, ...maps)
  return list.map((r) => {
    const org = Array.isArray(r.org) ? r.org[0] : r.org
    return { id: r.id, product_no: r.product_no, name: r.name, image: images[r.id] ?? null, org_name: org?.name ?? '' }
  })
}
