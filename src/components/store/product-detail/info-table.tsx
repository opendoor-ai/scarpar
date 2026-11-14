// 상세페이지 오른쪽 정보표 (상품코드·제품분류·모델명·제품사양·제조사·판매가·공급사·연락처)
// 값이 없는 줄은 자동으로 숨깁니다.

import type { ReactNode } from 'react'

export interface InfoRow {
  label: string
  value: ReactNode
  emphasis?: boolean
}

export function InfoTable({ rows }: { rows: InfoRow[] }) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== '')
  if (visible.length === 0) return null
  return (
    <dl className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 border-y border-border py-4 text-sm">
      {visible.map((r) => (
        <div key={r.label} className="contents">
          <dt className={r.emphasis ? 'font-medium text-destructive' : 'text-muted-foreground'}>{r.label}</dt>
          <dd className={r.emphasis ? 'font-semibold text-destructive' : 'text-foreground'}>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
