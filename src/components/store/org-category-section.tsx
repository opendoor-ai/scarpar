// 미니샵 첫 화면 "제품 카테고리" — 이 공급사 제품이 있는 분류(1차 → 2차)와 상품 수

import Link from 'next/link'
import { FolderOpen } from 'lucide-react'

import { getOrgCategories } from '@/lib/org-categories'
import { categoryQuery } from '@/lib/platform-categories'

import { storePath } from './store-links'

export async function OrgCategorySection({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { categories, counts } = await getOrgCategories(orgId)
  const roots = categories.filter((c) => !c.parent_id)
  if (roots.length === 0) return null
  const productsUrl = (q: string) => `${storePath(orgSlug, '/products')}?${q}`

  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">제품 카테고리</h2>
        <Link href={storePath(orgSlug, '/products')} className="text-sm text-muted-foreground hover:text-foreground">
          전체 제품 보기
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((r) => {
          const subs = categories.filter((c) => c.parent_id === r.id)
          return (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <Link href={productsUrl(categoryQuery(r))} className="flex items-center gap-2 font-semibold hover:text-primary">
                <FolderOpen className="size-4 text-amber-500" />
                <span className="truncate">{r.name}</span>
                <span className="ml-auto text-sm font-normal text-primary tabular-nums">{counts[r.id] ?? 0}</span>
              </Link>
              {subs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {subs.map((c) => (
                    <Link
                      key={c.id}
                      href={productsUrl(categoryQuery(c))}
                      className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                    >
                      {c.name}
                      <span className="ml-1 text-muted-foreground">{counts[c.id] ?? 0}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
