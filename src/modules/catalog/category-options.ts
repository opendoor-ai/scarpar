// Server-safe helper (no 'use client'): server pages call this before rendering
// the client-side ProductForm. It used to live inside product-form.tsx, but a
// server component cannot call a function exported from a 'use client' file.

export interface CategoryOption {
  id: string
  name: string
  parentId: string | null
  parentName: string | null
}

/** Shared by products/new and products/[id] pages — flattens org categories
 *  (one level of nesting) into "Parent / Child" select options. */
export function toCategoryOptions(
  rows: { id: string; name: string; parent_id: string | null }[],
): CategoryOption[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    parentId: r.parent_id && byId.has(r.parent_id) ? r.parent_id : null,
    parentName: r.parent_id ? (byId.get(r.parent_id)?.name ?? null) : null,
  }))
}
