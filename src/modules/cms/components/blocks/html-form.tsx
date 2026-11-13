'use client'

import { AlertTriangle } from 'lucide-react'

import type { HtmlBlock } from '@/types/db'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Field } from './field'

interface HtmlFormProps {
  block: HtmlBlock
  onChange: (next: HtmlBlock) => void
}

function HtmlForm({ block, onChange }: HtmlFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning">
        <AlertTriangle />
        <AlertTitle>고급 기능 (관리자 전용)</AlertTitle>
        <AlertDescription>
입력한 HTML이 쇼핑몰에 그대로 표시됩니다. 믿을 수 있는 코드만 붙여 넣으세요.
        </AlertDescription>
      </Alert>
      <Field label="HTML 코드">
        <Textarea
          rows={12}
          value={block.raw}
          onChange={(e) => onChange({ ...block, raw: e.target.value })}
          className="min-h-48 font-mono text-xs"
        />
      </Field>
    </div>
  )
}

export { HtmlForm }
