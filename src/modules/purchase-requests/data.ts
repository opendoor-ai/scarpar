// 구매문의 읽기 — 서버 전용. 공개 화면에는 연락처를 가린 값만 넘깁니다.

import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

import { maskPhone, type RequestCondition, type RequestStatus } from './schemas'

export interface PublicRequest {
  id: string
  no: number
  title: string
  condition: RequestCondition
  detail: string
  images: string[]
  authorMasked: string
  phoneMasked: string
  region: string | null
  status: RequestStatus
  viewCount: number
  responseCount: number
  responders: string[]
  createdAt: string
}

interface Row {
  id: string
  request_no: number
  title: string
  condition: RequestCondition
  detail: string
  images: string[] | null
  author_name: string
  phone: string
  region: string | null
  status: RequestStatus
  view_count: number
  created_at: string
  purchase_request_responses?: { org: { name: string } | null }[] | null
}

const SELECT =
  'id, request_no, title, condition, detail, images, author_name, phone, region, status, view_count, created_at, purchase_request_responses(org:orgs(name))'

/** "홍길동" → "홍*", "대한기계" → "대*" */
function maskName(name: string): string {
  const s = name.trim()
  return s ? `${s.slice(0, 1)}*` : '*'
}

function toPublic(r: Row): PublicRequest {
  const responders = (r.purchase_request_responses ?? []).map((x) => x.org?.name).filter(Boolean) as string[]
  return {
    id: r.id,
    no: r.request_no,
    title: r.title,
    condition: r.condition,
    detail: r.detail,
    images: r.images ?? [],
    authorMasked: maskName(r.author_name),
    phoneMasked: maskPhone(r.phone),
    region: r.region,
    status: r.status,
    viewCount: r.view_count,
    responseCount: responders.length,
    responders,
    createdAt: r.created_at,
  }
}

export interface RequestListResult {
  items: PublicRequest[]
  total: number
  counts: { total: number; inProgress: number; done: number }
  ready: boolean
}

/** 공개 목록 (숨김 제외) */
export async function listPublicRequests(opts: {
  condition?: RequestCondition | 'all'
  q?: string
  page?: number
  pageSize?: number
}): Promise<RequestListResult> {
  const pageSize = opts.pageSize ?? 15
  const page = Math.max(1, opts.page ?? 1)
  const supabase = getAdminClient()
  try {
    let query = supabase
      .from('purchase_requests')
      .select(SELECT, { count: 'exact' })
      .neq('status', 'hidden')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
    if (opts.condition && opts.condition !== 'all') query = query.eq('condition', opts.condition)
    const q = opts.q?.trim().replace(/[%,()]/g, ' ').slice(0, 50)
    if (q) query = query.or(`title.ilike.%${q}%,detail.ilike.%${q}%`)

    const [{ data, count, error }, all, inProgress, done] = await Promise.all([
      query,
      supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).neq('status', 'hidden'),
      supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'done'),
    ])
    if (error) throw error
    return {
      items: ((data ?? []) as unknown as Row[]).map(toPublic),
      total: count ?? 0,
      counts: { total: all.count ?? 0, inProgress: inProgress.count ?? 0, done: done.count ?? 0 },
      ready: true,
    }
  } catch (err) {
    console.error('[purchase-requests:list]', err instanceof Error ? err.message : err)
    return { items: [], total: 0, counts: { total: 0, inProgress: 0, done: 0 }, ready: false }
  }
}

/** 메인 화면용 최신 문의 */
export async function latestPublicRequests(limit = 12): Promise<PublicRequest[]> {
  try {
    const { data, error } = await getAdminClient()
      .from('purchase_requests')
      .select(SELECT)
      .neq('status', 'hidden')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return ((data ?? []) as unknown as Row[]).map(toPublic)
  } catch {
    return []
  }
}

/** 공개 상세 (조회수 1 증가) */
export async function getPublicRequest(no: number): Promise<PublicRequest | null> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('purchase_requests')
      .select(SELECT)
      .eq('request_no', no)
      .neq('status', 'hidden')
      .maybeSingle()
    if (error || !data) return null
    const row = data as unknown as Row
    await supabase
      .from('purchase_requests')
      .update({ view_count: row.view_count + 1 })
      .eq('id', row.id)
    return toPublic({ ...row, view_count: row.view_count + 1 })
  } catch {
    return null
  }
}

export interface AdminRequest extends PublicRequest {
  authorName: string
  phone: string
  email: string | null
  /** 지금 공급사가 상담 중으로 기록했는지 */
  mine: boolean
  myMemo: string | null
}

/** 관리자(공급사) 화면용 — 연락처 전체 공개 */
export async function listAdminRequests(opts: {
  orgId: string
  status?: RequestStatus | 'all' | 'mine'
  q?: string
  includeHidden: boolean
}): Promise<{ items: AdminRequest[]; ready: boolean }> {
  try {
    const supabase = getAdminClient()
    let query = supabase
      .from('purchase_requests')
      .select(
        'id, request_no, title, condition, detail, images, author_name, phone, email, region, status, view_count, created_at, purchase_request_responses(org_id, memo, org:orgs(name))',
      )
      .order('created_at', { ascending: false })
      .limit(300)
    if (!opts.includeHidden) query = query.neq('status', 'hidden')
    if (opts.status && opts.status !== 'all' && opts.status !== 'mine') query = query.eq('status', opts.status)
    const q = opts.q?.trim().replace(/[%,()]/g, ' ').slice(0, 50)
    if (q) query = query.or(`title.ilike.%${q}%,detail.ilike.%${q}%,author_name.ilike.%${q}%`)
    const { data, error } = await query
    if (error) throw error
    type AdminRow = Omit<Row, 'purchase_request_responses'> & {
      email: string | null
      purchase_request_responses: { org_id: string; memo: string | null; org: { name: string } | null }[] | null
    }
    let items = ((data ?? []) as unknown as AdminRow[]).map((r) => {
      const mineRow = (r.purchase_request_responses ?? []).find((x) => x.org_id === opts.orgId)
      return {
        ...toPublic(r),
        authorName: r.author_name,
        phone: r.phone,
        email: r.email,
        mine: Boolean(mineRow),
        myMemo: mineRow?.memo ?? null,
      }
    })
    if (opts.status === 'mine') items = items.filter((i) => i.mine)
    return { items, ready: true }
  } catch (err) {
    console.error('[purchase-requests:admin-list]', err instanceof Error ? err.message : err)
    return { items: [], ready: false }
  }
}
