'use server'

import { revalidatePath } from 'next/cache'

import { requireOrg, requireRole } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { getServerClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'
import { slugify } from '@/lib/utils'
import type { ActionResult } from '@/lib/types'
import type { Media } from '@/types/db'

const MEDIA_BUCKET = 'media'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB

export interface UploadedMedia {
  id: string
  path: string
}

/**
 * Uploads a file to the `media` storage bucket and inserts its metadata row.
 * Cross-slice contract — consumed by src/components/admin/media-picker.tsx
 * (Upload tab). Role floor matches the `media_insert_staff_up` RLS policy
 * (supabase/migrations/0001_core.sql); storage write uses the admin client
 * per the assigned contract, with the role check enforced here in the app.
 */
export async function uploadMediaAction(formData: FormData): Promise<ActionResult<UploadedMedia>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'staff')

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '파일을 선택하세요.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: '20MB보다 큰 파일은 올릴 수 없습니다.' }
  }

  const folder = String(formData.get('folder') ?? '')
  const dotIndex = file.name.lastIndexOf('.')
  const hasExt = dotIndex > 0 && dotIndex < file.name.length - 1
  const baseName = slugify(hasExt ? file.name.slice(0, dotIndex) : file.name) || 'file'
  const ext = hasExt ? file.name.slice(dotIndex + 1).toLowerCase() : undefined
  const storagePath = `${ctx.org.id}/${Date.now()}-${baseName}${ext ? `.${ext}` : ''}`

  const supabase = getAdminClient()

  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  })

  if (uploadError) {
    return { ok: false, error: uploadError.message }
  }

  const { data, error: insertError } = await supabase
    .from('media')
    .insert({
      org_id: ctx.org.id,
      path: storagePath,
      name: file.name,
      mime: file.type || null,
      size: file.size,
      folder,
      created_by: ctx.user.id,
    })
    .select('id, path')
    .single()

  if (insertError || !data) {
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath])
    return { ok: false, error: insertError?.message ?? 'Failed to save media row.' }
  }

  audit(ctx, 'media:upload', 'media', data.id as string, undefined, { path: data.path, name: file.name })
  revalidatePath('/admin/media')

  return { ok: true, data: { id: data.id as string, path: data.path as string } }
}

/**
 * Latest media rows for the org, optionally scoped to a folder / name search.
 * Cross-slice contract — consumed by src/components/admin/media-picker.tsx
 * (Library tab).
 */
export async function listMediaAction(folder?: string, search?: string): Promise<ActionResult<Media[]>> {
  const ctx = await requireOrg()
  const supabase = await getServerClient()

  let query = supabase
    .from('media')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(60)

  if (folder) query = query.eq('folder', folder)
  if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }

  return { ok: true, data: (data ?? []) as Media[] }
}

/**
 * Edits a media row's alt text / folder. Not part of the minimum 3-function
 * contract but required by the Media admin page's detail popover. The media
 * table has no RLS UPDATE policy at all (see migration comment), so this is
 * service-role only — gated here at manager+ (same floor as delete).
 */
export async function updateMediaAction(
  id: string,
  patch: { alt?: string; folder?: string },
): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('media')
    .update(patch)
    .eq('id', id)
    .eq('org_id', ctx.org.id)

  if (error) return { ok: false, error: error.message }

  audit(ctx, 'media:update', 'media', id, undefined, patch)
  revalidatePath('/admin/media')
  return { ok: true }
}

/**
 * Removes the storage object then the metadata row. Role floor matches the
 * `media_delete_manager_up` RLS policy.
 */
export async function deleteMediaAction(id: string): Promise<ActionResult<void>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')

  const supabase = getAdminClient()

  const { data: row, error: fetchError } = await supabase
    .from('media')
    .select('id, path')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .single()

  if (fetchError || !row) {
    return { ok: false, error: '파일을 찾을 수 없습니다.' }
  }

  const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove([row.path as string])
  if (removeError) {
    return { ok: false, error: removeError.message }
  }

  const { error: deleteError } = await supabase.from('media').delete().eq('id', id).eq('org_id', ctx.org.id)
  if (deleteError) {
    return { ok: false, error: deleteError.message }
  }

  audit(ctx, 'media:delete', 'media', id, { path: row.path }, undefined)
  revalidatePath('/admin/media')
  return { ok: true }
}
