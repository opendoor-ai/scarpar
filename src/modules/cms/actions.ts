'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'
import type { CmsBlock } from '@/types/db'
import {
  createPageSchema,
  discardDraftSchema,
  type ProductLite,
  publishSchema,
  restoreRevisionSchema,
  saveDraftSchema,
  saveMenuSchema,
  type SaveMenuInput,
  updatePageTitleSchema,
} from './schemas'

// All mutations below use getServerClient() (RLS-enforced), not the admin client — cms_pages /
// cms_revisions / menus all carry a single "write_admin" RLS policy requiring owner/admin/manager
// (supabase/migrations/0003_delivery_cms_ops.sql), so requireRole(ctx,'manager') here mirrors the
// DB's own floor rather than bypassing it.

/** Enforces "one home page per org" (app-level — architecture.md §4 doesn't add a DB constraint for it). */
export async function createPageAction(input: {
  title: string
  slug: string
  type: 'page' | 'home' | 'policy'
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = createPageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다' }
  const { title, slug, type } = parsed.data

  const supabase = await getServerClient()

  if (type === 'home') {
    const { data: existingHome } = await supabase
      .from('cms_pages')
      .select('id')
      .eq('org_id', ctx.org.id)
      .eq('type', 'home')
      .maybeSingle()
    if (existingHome) return { ok: false, error: '이미 메인(홈) 페이지가 있습니다.' }
  }

  const { data, error } = await supabase
    .from('cms_pages')
    .insert({ org_id: ctx.org.id, title, slug, type, updated_by: ctx.user.id })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, error: '같은 주소의 페이지가 이미 있습니다.' }
    return { ok: false, error: error.message }
  }

  audit(ctx, 'cms_page:create', 'cms_pages', data.id as string, undefined, { title, slug, type })
  revalidatePath('/admin/cms/pages')

  return { ok: true, data: { id: data.id as string } }
}

export async function updatePageTitleAction(input: {
  pageId: string
  title: string
}): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = updatePageTitleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '제목이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('cms_pages')
    .update({ title: parsed.data.title, updated_by: ctx.user.id })
    .eq('id', parsed.data.pageId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'cms_page:rename', 'cms_pages', parsed.data.pageId, undefined, { title: parsed.data.title })
  revalidatePath('/admin/cms/pages')
  revalidatePath(`/admin/cms/pages/${parsed.data.pageId}`)
  return { ok: true }
}

export async function saveDraftAction(input: {
  pageId: string
  blocks: CmsBlock[]
}): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = saveDraftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '블록 내용이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('cms_pages')
    .update({ draft_blocks: parsed.data.blocks, updated_by: ctx.user.id })
    .eq('id', parsed.data.pageId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'cms_page:save_draft', 'cms_pages', parsed.data.pageId)
  revalidatePath(`/admin/cms/pages/${parsed.data.pageId}`)
  revalidatePath('/admin/cms/pages')
  return { ok: true }
}

/**
 * blocks = draft_blocks ?? blocks, draft_blocks -> null, status -> published, published_at stamped,
 * snapshots into cms_revisions then prunes to the latest 20 (architecture.md §4).
 */
export async function publishAction(input: { pageId: string }): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = publishSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }
  const { pageId } = parsed.data

  const supabase = await getServerClient()

  const { data: page, error: fetchError } = await supabase
    .from('cms_pages')
    .select('id, blocks, draft_blocks, status')
    .eq('id', pageId)
    .eq('org_id', ctx.org.id)
    .single()

  if (fetchError || !page) return { ok: false, error: '페이지를 찾을 수 없습니다.' }

  const nextBlocks = page.draft_blocks ?? page.blocks

  const { error: updateError } = await supabase
    .from('cms_pages')
    .update({
      blocks: nextBlocks,
      draft_blocks: null,
      status: 'published',
      published_at: new Date().toISOString(),
      updated_by: ctx.user.id,
    })
    .eq('id', pageId)
    .eq('org_id', ctx.org.id)

  if (updateError) return { ok: false, error: updateError.message }

  const { error: revisionError } = await supabase.from('cms_revisions').insert({
    org_id: ctx.org.id,
    page_id: pageId,
    blocks: nextBlocks,
    saved_by: ctx.user.id,
  })
  if (revisionError) console.error('[cms] revision insert failed', revisionError)

  // Prune to the latest 20 revisions for this page.
  const { data: oldRevisions } = await supabase
    .from('cms_revisions')
    .select('id')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false })
    .range(20, 999)

  if (oldRevisions && oldRevisions.length > 0) {
    await supabase
      .from('cms_revisions')
      .delete()
      .in('id', (oldRevisions as { id: number }[]).map((r) => r.id))
  }

  audit(ctx, 'cms_page:publish', 'cms_pages', pageId, { status: page.status }, { status: 'published' })
  revalidatePath('/admin/cms/pages')
  revalidatePath(`/admin/cms/pages/${pageId}`)
  return { ok: true }
}

export async function discardDraftAction(input: { pageId: string }): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = discardDraftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('cms_pages')
    .update({ draft_blocks: null, updated_by: ctx.user.id })
    .eq('id', parsed.data.pageId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'cms_page:discard_draft', 'cms_pages', parsed.data.pageId)
  revalidatePath(`/admin/cms/pages/${parsed.data.pageId}`)
  revalidatePath('/admin/cms/pages')
  return { ok: true }
}

/** Loads a past revision's blocks back into draft_blocks — does not touch the published version. */
export async function restoreRevisionAction(input: {
  pageId: string
  revisionId: number
}): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = restoreRevisionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: '입력값이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { data: revision, error: fetchError } = await supabase
    .from('cms_revisions')
    .select('blocks')
    .eq('id', parsed.data.revisionId)
    .eq('page_id', parsed.data.pageId)
    .eq('org_id', ctx.org.id)
    .single()

  if (fetchError || !revision) return { ok: false, error: '버전을 찾을 수 없습니다.' }

  const { error } = await supabase
    .from('cms_pages')
    .update({ draft_blocks: revision.blocks, updated_by: ctx.user.id })
    .eq('id', parsed.data.pageId)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'cms_page:restore_revision', 'cms_pages', parsed.data.pageId, undefined, {
    revisionId: parsed.data.revisionId,
  })
  revalidatePath(`/admin/cms/pages/${parsed.data.pageId}`)
  return { ok: true }
}

export async function saveMenuAction(input: SaveMenuInput): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const parsed = saveMenuSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '메뉴 내용이 올바르지 않습니다' }

  const supabase = await getServerClient()
  const { error } = await supabase
    .from('menus')
    .upsert(
      { org_id: ctx.org.id, handle: parsed.data.handle, items: parsed.data.items },
      { onConflict: 'org_id,handle' },
    )

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'menu:save', 'menus', parsed.data.handle)
  revalidatePath('/admin/cms/menus')
  return { ok: true }
}

// --- Product search for the productGrid block's manual picker ---------------------------------
// Lives here (not in the catalog slice, which hadn't built actions.ts when this was needed) —
// read-only, RLS-scoped to the caller's own org, so it's safe for this slice to own.

export async function searchProductsAction(query: string): Promise<ActionResult<ProductLite[]>> {
  const ctx = await requireOrg()
  const supabase = await getServerClient()

  let request = supabase
    .from('products')
    .select('id, name, sku, price')
    .eq('org_id', ctx.org.id)
    .order('name')
    .limit(20)

  const trimmed = query.trim()
  if (trimmed) request = request.ilike('name', `%${trimmed}%`)

  const { data, error } = await request
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data ?? []) as ProductLite[] }
}

/** Resolves display names for already-selected product ids (e.g. a saved block reopened for editing). */
export async function getProductsByIdsAction(ids: string[]): Promise<ActionResult<ProductLite[]>> {
  const ctx = await requireOrg()
  if (ids.length === 0) return { ok: true, data: [] }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, price')
    .eq('org_id', ctx.org.id)
    .in('id', ids)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data ?? []) as ProductLite[] }
}
