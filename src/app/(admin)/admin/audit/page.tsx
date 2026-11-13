import { requireOrg, requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'
import type { PageProps } from '@/lib/types'
import type { AuditLog, Profile } from '@/types/db'
import { PageHeader } from '@/components/ui/page-header'
import { AuditFilters } from '@/modules/audit/components/audit-filters'
import { AuditPagination } from '@/modules/audit/components/audit-pagination'
import { AuditTable, type AuditRow } from '@/modules/audit/components/audit-table'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface AuditSearchParams {
  entity?: string
  action?: string
  from?: string
  to?: string
  page?: string
  [key: string]: string | string[] | undefined
}

function shortId(id: string | null): string | null {
  if (!id) return null
  return `${id.slice(0, 8)}…`
}

export default async function AuditPage({ searchParams }: PageProps<Record<string, never>, AuditSearchParams>) {
  const ctx = await requireOrg()
  requireRole(ctx, 'admin')

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const supabase = await getServerClient()

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('org_id', ctx.org.id)

  if (sp.entity) query = query.eq('entity', sp.entity)
  if (sp.action) query = query.ilike('action', `%${sp.action}%`)
  if (sp.from) query = query.gte('created_at', sp.from)
  if (sp.to) query = query.lte('created_at', `${sp.to}T23:59:59.999`)

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const [logResult, entityOptionsResult] = await Promise.all([
    query,
    // Recent-window distinct entities for the filter dropdown — PostgREST has
    // no DISTINCT via the JS client, so this dedupes the latest 500 rows
    // rather than every entity ever logged (good enough for a v1 filter).
    supabase
      .from('audit_log')
      .select('entity')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const rows = (logResult.data ?? []) as AuditLog[]
  const total = logResult.count ?? rows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const entityOptions = Array.from(
    new Set(((entityOptionsResult.data ?? []) as { entity: string }[]).map((r) => r.entity)),
  ).sort()

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id))))
  const profilesResult = actorIds.length
    ? await supabase.from('profiles').select('*').in('user_id', actorIds)
    : { data: [] as Profile[] }
  const profileByUserId = new Map((profilesResult.data as Profile[] | null)?.map((p) => [p.user_id, p]))

  const auditRows: AuditRow[] = rows.map((row) => {
    const profile = row.actor_id ? profileByUserId.get(row.actor_id) : undefined
    return {
      id: row.id,
      createdAt: row.created_at,
      actorLabel: profile?.full_name ?? shortId(row.actor_id) ?? '시스템',
      action: row.action,
      entity: row.entity,
      entityIdShort: shortId(row.entity_id),
      before: row.before,
      after: row.after,
    }
  })

  return (
    <div>
      <PageHeader title="활동 기록" description="이 회사에서 일어난 모든 변경 내역" />

      <div className="flex flex-col gap-4">
        <AuditFilters entityOptions={entityOptions} />
        <AuditTable rows={auditRows} />
        <AuditPagination
          page={page}
          totalPages={totalPages}
          total={total}
          basePath="/admin/audit"
          searchParams={sp}
        />
      </div>
    </div>
  )
}
