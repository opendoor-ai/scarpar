'use client'

import type { ContactBlock } from '@/types/db'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Field } from './field'

interface ContactFormProps {
  block: ContactBlock
  onChange: (next: ContactBlock) => void
}

function ContactForm({ block, onChange }: ContactFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="제목">
        <Input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} />
      </Field>
      <div className="flex items-center gap-2">
        <Switch
          id="contact-show-form"
          checked={block.showForm}
          onCheckedChange={(checked) => onChange({ ...block, showForm: checked })}
        />
        <Label htmlFor="contact-show-form">문의 입력창 표시</Label>
      </div>
    </div>
  )
}

export { ContactForm }
