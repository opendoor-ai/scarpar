'use client'

import type { CoursesGridBlock } from '@/types/db'
import { Input } from '@/components/ui/input'
import { Field } from './field'

interface CoursesGridFormProps {
  block: CoursesGridBlock
  onChange: (next: CoursesGridBlock) => void
}

function CoursesGridForm({ block, onChange }: CoursesGridFormProps) {
  return (
    <Field label="표시 개수" help="표시할 강의 수. 비워 두면 전체 표시">
      <Input
        type="number"
        min={1}
        value={block.limit ?? ''}
        onChange={(e) => onChange({ ...block, limit: e.target.value ? Number(e.target.value) : undefined })}
      />
    </Field>
  )
}

export { CoursesGridForm }
