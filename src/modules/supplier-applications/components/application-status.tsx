// 내 입점 신청 상태 카드 (심사 중 / 거절됨)

import { format } from 'date-fns'
import { Clock, XCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export interface MyApplication {
  id: string
  company_name: string
  desired_slug: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  created_at: string
}

export function ApplicationStatus({ application }: { application: MyApplication }) {
  if (application.status === 'pending') {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-5">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">입점 신청을 심사하고 있어요</p>
            <p className="text-muted-foreground">
              {application.company_name} · {format(new Date(application.created_at), 'yyyy.MM.dd')} 신청. 승인되면 이
              화면에서 바로 관리자 화면으로 들어갈 수 있어요. 급한 문의는 전자동 고객센터로 연락해 주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  if (application.status === 'rejected') {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-5">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">입점 신청이 반려되었어요</p>
            {application.reject_reason ? (
              <p className="text-muted-foreground">사유: {application.reject_reason}</p>
            ) : null}
            <p className="text-muted-foreground">내용을 보완해서 아래에서 다시 신청할 수 있어요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return null
}
