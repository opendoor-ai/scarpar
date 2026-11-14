'use client'

import { Plus, Trash2 } from 'lucide-react'

import type { CompanyIntroBlock } from '@/types/db'
import { MediaPicker } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Field } from './field'

interface CompanyIntroFormProps {
  block: CompanyIntroBlock
  onChange: (next: CompanyIntroBlock) => void
}

const MAX_STATS = 6

function CompanyIntroForm({ block, onChange }: CompanyIntroFormProps) {
  const stats = block.stats ?? []

  function setStat(index: number, key: 'label' | 'value', value: string) {
    onChange({ ...block, stats: stats.map((s, i) => (i === index ? { ...s, [key]: value } : s)) })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="제목">
        <Input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} />
      </Field>
      <Field label="소개글" help="회사 연혁, 주력 기계, 강점 등을 적어 주세요. 줄바꿈이 그대로 보여요.">
        <Textarea rows={6} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} />
      </Field>
      <Field label="사진 (선택)" help="공장·사무실·대표 기계 사진 등">
        <MediaPicker
          value={block.image ? { id: '', path: block.image } : null}
          onChange={(m) => onChange({ ...block, image: m?.path })}
        />
      </Field>

      <Field label="숫자로 보는 회사 (선택)" help="예: 설립 · 1998년 / 보유 장비 · 120대 / 거래처 · 500곳">
        <div className="flex flex-col gap-2">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="항목 (예: 설립)" value={s.label} onChange={(e) => setStat(i, 'label', e.target.value)} />
              <Input placeholder="값 (예: 1998년)" value={s.value} onChange={(e) => setStat(i, 'value', e.target.value)} />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="삭제"
                onClick={() => onChange({ ...block, stats: stats.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {stats.length < MAX_STATS ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onChange({ ...block, stats: [...stats, { label: '', value: '' }] })}
            >
              <Plus className="size-4" />
              항목 추가
            </Button>
          ) : null}
        </div>
      </Field>

      <Field label="연락처 표시" help="설정에 입력한 담당자·전화·이메일·주소를 함께 보여줘요.">
        <div className="flex h-9 items-center gap-2">
          <Switch checked={block.showContact} onCheckedChange={(v) => onChange({ ...block, showContact: v })} />
          <span className="text-sm text-muted-foreground">{block.showContact ? '보이기' : '숨기기'}</span>
        </div>
      </Field>
    </div>
  )
}

export { CompanyIntroForm }
