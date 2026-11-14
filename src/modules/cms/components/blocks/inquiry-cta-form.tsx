'use client'

import type { InquiryCtaBlock } from '@/types/db'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field } from './field'

interface InquiryCtaFormProps {
  block: InquiryCtaBlock
  onChange: (next: InquiryCtaBlock) => void
}

function InquiryCtaForm({ block, onChange }: InquiryCtaFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        설정에 입력한 대표 전화번호로 바로 연결돼요. 번호가 없으면 이 블록은 보이지 않아요.
      </p>
      <Field label="제목">
        <Input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} />
      </Field>
      <Field label="설명 (선택)">
        <Input value={block.body ?? ''} onChange={(e) => onChange({ ...block, body: e.target.value })} />
      </Field>
      <Field label="문자 문의 버튼" help="휴대폰 번호(010 등)일 때만 보여요.">
        <div className="flex h-9 items-center gap-2">
          <Switch checked={block.showSms} onCheckedChange={(v) => onChange({ ...block, showSms: v })} />
          <span className="text-sm text-muted-foreground">{block.showSms ? '보이기' : '숨기기'}</span>
        </div>
      </Field>
    </div>
  )
}

export { InquiryCtaForm }
