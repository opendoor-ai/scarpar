'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { checkBlocklistAction, updateRiskAction } from '@/modules/orders/actions'
import type { RiskLevel } from '@/types/db'

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
]

interface RiskCardProps {
  orderId: string
  riskLevel: RiskLevel | null
  riskNote: string | null
}

function RiskCard({ orderId, riskLevel, riskNote }: RiskCardProps) {
  const router = useRouter()
  const [level, setLevel] = React.useState<RiskLevel>(riskLevel ?? 'low')
  const [note, setNote] = React.useState(riskNote ?? '')
  const [saving, setSaving] = React.useState(false)
  const [checking, setChecking] = React.useState(false)

  React.useEffect(() => {
    setLevel(riskLevel ?? 'low')
    setNote(riskNote ?? '')
  }, [riskLevel, riskNote])

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateRiskAction({ orderId, risk_level: level, risk_note: note })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('위험도가 저장되었습니다')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleCheckBlocklist() {
    setChecking(true)
    try {
      const result = await checkBlocklistAction(orderId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.data?.matched) {
        toast.warning('차단 목록과 일치합니다 — 위험도를 높음으로 변경했습니다')
      } else {
        toast.success('차단 목록과 일치하는 항목이 없습니다')
      }
      router.refresh()
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <ShieldAlert
            className={cn(
              'size-4',
              level === 'high' && 'text-destructive',
              level === 'medium' && 'text-amber-600 dark:text-amber-500',
              level === 'low' && 'text-muted-foreground',
            )}
          />
부정 주문 · 위험도
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={level} onValueChange={(v) => setLevel(v as RiskLevel)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RISK_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          rows={2}
          placeholder="위험 메모"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCheckBlocklist} disabled={checking}>
            {checking ? '확인 중…' : '차단 목록 확인'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { RiskCard }
