'use client'

import { useRouter } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ServiceJobStatus } from '@/types/db'

const STATUSES: { label: string; value: ServiceJobStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '견적', value: 'quoted' },
  { label: '예약됨', value: 'scheduled' },
  { label: '진행 중', value: 'in_progress' },
  { label: '완료', value: 'done' },
  { label: '청구 완료', value: 'invoiced' },
  { label: '취소', value: 'cancelled' },
]

interface JobStatusTabsProps {
  current: string
}

function JobStatusTabs({ current }: JobStatusTabsProps) {
  const router = useRouter()

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        router.push(value === 'all' ? '/admin/services' : `/admin/services?status=${value}`)
      }}
    >
      <TabsList>
        {STATUSES.map((status) => (
          <TabsTrigger key={status.value} value={status.value}>
            {status.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { JobStatusTabs }
