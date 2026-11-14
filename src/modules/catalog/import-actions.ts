'use server'

// 상품 대량 등록 (엑셀 CSV) — 미리보기 검사 / 실제 등록
// 화면에서 보낸 내용을 서버에서 다시 검사한 뒤 저장합니다 (화면 검사만 믿지 않음).

import { revalidatePath } from 'next/cache'

import { audit } from '@/lib/audit'
import { requireOrg, requireRole } from '@/lib/auth'
import { getPlatformCategories } from '@/lib/platform-categories'
import { getServerClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

import {
  MAX_IMPORT_ROWS,
  checkImportRows,
  duplicateKey,
  type CheckedImportRow,
  type RawImportRow,
} from './import/columns'

async function loadExistingKeys(orgId: string): Promise<Set<string>> {
  const supabase = await getServerClient()
  const keys = new Set<string>()
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase
      .from('products')
      .select('name, model_name')
      .eq('org_id', orgId)
      .range(from, from + 999)
    const rows = (data ?? []) as { name: string; model_name: string | null }[]
    for (const r of rows) keys.add(duplicateKey(r.name, r.model_name))
    if (rows.length < 1000) break
  }
  return keys
}

function sanitizeRaw(rows: RawImportRow[]): RawImportRow[] {
  return rows.slice(0, MAX_IMPORT_ROWS).map((r) => ({
    line: Number(r.line) || 0,
    cells: (Array.isArray(r.cells) ? r.cells : []).slice(0, 20).map((c) => String(c ?? '').slice(0, 6000)),
  }))
}

async function check(orgId: string, rows: RawImportRow[]): Promise<CheckedImportRow[]> {
  const [categories, existing] = await Promise.all([getPlatformCategories(), loadExistingKeys(orgId)])
  return checkImportRows(sanitizeRaw(rows), categories, existing)
}

/** 1단계: 미리보기 검사 (저장 안 함) */
export async function previewImportAction(rows: RawImportRow[]): Promise<ActionResult<{ rows: CheckedImportRow[] }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, error: `한 번에 ${MAX_IMPORT_ROWS}개까지 올릴 수 있어요` }
  return { ok: true, data: { rows: await check(ctx.org.id, rows) } }
}

/** 2단계: 오류 없는 줄만 등록 */
export async function commitImportAction(
  rows: RawImportRow[],
): Promise<ActionResult<{ created: number; skipped: number; imageErrors: number }>> {
  const ctx = await requireOrg()
  requireRole(ctx, 'manager')
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, error: `한 번에 ${MAX_IMPORT_ROWS}개까지 올릴 수 있어요` }

  const checked = await check(ctx.org.id, rows)
  const valid = checked.filter((r) => r.errors.length === 0)
  if (valid.length === 0) return { ok: false, error: '등록할 수 있는 상품이 없어요. 오류를 고친 뒤 다시 올려 주세요.' }

  const supabase = await getServerClient()
  let created = 0
  let imageErrors = 0

  // 50개씩 나눠서 저장
  for (let i = 0; i < valid.length; i += 50) {
    const chunk = valid.slice(i, i + 50)
    const { data: inserted, error } = await supabase
      .from('products')
      .insert(
        chunk.map((r) => ({
          org_id: ctx.org.id,
          name: r.name,
          slug: `new-${crypto.randomUUID()}`, // 내부용 주소 — 저장 직후 상품번호로 바꿈
          category_id: r.category_id,
          brand: r.brand,
          model_name: r.model_name,
          condition: r.condition,
          price: r.price * 100, // 원 → 내부 단위
          spec_summary: r.spec_summary,
          short_description: r.short_description,
          description: r.description,
          tags: r.tags.length ? r.tags : null,
          status: r.publish ? 'active' : 'draft',
          track_stock: false, // 기계 광고는 재고 관리 안 함이 기본
          stock_qty: 0,
        })),
      )
      .select('id, product_no')
    if (error || !inserted) {
      return {
        ok: false,
        error: `${created}개까지 등록한 뒤 오류가 났어요: ${error?.message ?? '알 수 없는 오류'}`,
      }
    }
    const products = inserted as { id: string; product_no: number }[]
    created += products.length

    // 내부 주소를 상품번호로 정리
    await Promise.all(
      products.map((p) =>
        supabase.from('products').update({ slug: String(p.product_no) }).eq('id', p.id).eq('org_id', ctx.org.id),
      ),
    )

    // 사진: 인터넷 주소를 미디어로 등록하고 상품에 연결 (첫 사진 = 대표)
    const mediaRows: { org_id: string; path: string; name: string; folder: string; created_by: string }[] = []
    const owners: { productId: string; position: number }[] = []
    products.forEach((p, idx) => {
      chunk[idx].images.forEach((url, position) => {
        mediaRows.push({
          org_id: ctx.org.id,
          path: url,
          name: decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'image').slice(0, 200),
          folder: 'imports',
          created_by: ctx.user.id,
        })
        owners.push({ productId: p.id, position })
      })
    })
    if (mediaRows.length > 0) {
      const { data: media, error: mediaError } = await supabase.from('media').insert(mediaRows).select('id')
      if (mediaError || !media) {
        imageErrors += mediaRows.length
      } else {
        const { error: linkError } = await supabase.from('product_images').insert(
          (media as { id: string }[]).map((m, k) => ({
            org_id: ctx.org.id,
            product_id: owners[k].productId,
            media_id: m.id,
            position: owners[k].position,
          })),
        )
        if (linkError) imageErrors += mediaRows.length
      }
    }
  }

  audit(ctx, 'product.bulk_import', 'product', ctx.org.id, undefined, { created, skipped: checked.length - valid.length })
  revalidatePath('/admin/products')
  return { ok: true, data: { created, skipped: checked.length - valid.length, imageErrors } }
}
