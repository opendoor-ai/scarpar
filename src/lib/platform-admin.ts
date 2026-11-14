// 플랫폼 관리자(전자동 운영자) 확인 — 서버 작업 전용

import { requireUser } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase/server'

/** 플랫폼 관리자인지 (오류 시 false) */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const supabase = await getServerClient()
    const { data } = await supabase.rpc('is_platform_admin')
    return Boolean(data)
  } catch {
    return false
  }
}

/** 플랫폼 관리자가 아니면 오류 */
export async function requirePlatformAdmin() {
  const user = await requireUser()
  if (!(await isPlatformAdmin())) throw new Error('플랫폼 관리자만 할 수 있어요.')
  return user
}
