// 구매문의 등록 (회원가입 없이)

import type { Metadata } from 'next'

import { SITE_NAME } from '@/lib/site'
import { RequestForm } from '@/modules/purchase-requests/components/request-form'
import { RequestShell } from '@/modules/purchase-requests/components/request-shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `구매문의 등록 · ${SITE_NAME}`,
  description: '찾는 기계를 등록하면 공급사가 견적과 함께 연락드려요. 회원가입 없이 무료.',
}

export default function NewRequestPage() {
  return (
    <RequestShell
      title="구매문의"
      description="원하는 제품을 알려주시면 가장 알맞은 공급사·제조사와 연결해 드려요."
      showRegister={false}
    >
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-6 py-4">
          <h2 className="text-lg font-extrabold">구매문의 등록</h2>
          <p className="text-xs text-muted-foreground">회원가입 없이 무료로 등록돼요.</p>
        </div>
        <div className="p-6">
          <RequestForm />
        </div>
      </section>
    </RequestShell>
  )
}
