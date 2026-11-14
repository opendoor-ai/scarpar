'use client'

// 상품정보표시 설정 — 상품 목록 카드 · 상품 상세 정보표에서 어떤 항목을 보여줄지 (카페24 상품정보표시 설정처럼)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { saveSiteSectionAction } from '../actions'
import { CARD_FIELDS, DETAIL_FIELDS, type DisplaySettings } from '../schemas'

export function DisplaySettingsForm({ initial }: { initial: DisplaySettings }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<DisplaySettings>(initial)
  const [tab, setTab] = useState<'card' | 'detail'>('card')

  const fields = tab === 'card' ? CARD_FIELDS : DETAIL_FIELDS
  const setField = (key: string, patch: Partial<{ show: boolean; label: string }>) =>
    setV((p) => ({ ...p, [tab]: { ...p[tab], [key]: { ...{ show: true, label: '' }, ...p[tab][key], ...patch } } }))

  function save() {
    start(async () => {
      const res = await saveSiteSectionAction('display', v)
      if (!res.ok) return void toast.error(res.error)
      toast.success('상품정보표시 설정을 저장했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-border">
        {(
          [
            ['card', '메인·상품목록 (상품 카드)'],
            ['detail', '상품상세 (정보표)'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn('-mb-px border-b-2 px-4 py-2 text-sm font-medium', tab === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {tab === 'card'
          ? '메인 화면·전체 제품·분류·미니샵·관련상품 등 모든 상품 카드에 한 번에 적용돼요. 상품명과 대표이미지는 항상 보여요.'
          : '상품 상세페이지 오른쪽 정보표에 적용돼요. 값이 없는 항목은 자동으로 숨겨져요.'}
      </p>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-14 py-2">No</th>
              <th className="w-32 py-2">표시설정</th>
              <th className="py-2">항목</th>
              {tab === 'detail' ? <th className="py-2">항목 표시 이름</th> : null}
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => {
              const cur = v[tab][f.key] ?? { show: true, label: '' }
              return (
                <tr key={f.key} className={cn('border-t border-border', cur.show ? 'bg-amber-50/50 dark:bg-amber-950/10' : '')}>
                  <td className="text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-2 text-center">
                    <select
                      value={cur.show ? 'y' : 'n'}
                      onChange={(e) => setField(f.key, { show: e.target.value === 'y' })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="y">표시함</option>
                      <option value="n">표시안함</option>
                    </select>
                  </td>
                  <td className="p-2 text-center">{f.label}</td>
                  {tab === 'detail' ? (
                    <td className="p-2">
                      <Input value={cur.label} onChange={(e) => setField(f.key, { label: e.target.value })} maxLength={20} placeholder={f.label} className="h-8" />
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center pb-6">
        <Button onClick={save} disabled={pending} className="w-32">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          확인
        </Button>
      </div>
    </div>
  )
}
