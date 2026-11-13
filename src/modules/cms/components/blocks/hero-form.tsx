'use client'

import type { HeroBlock } from '@/types/db'
import { Input } from '@/components/ui/input'
import { MediaPicker } from '@/components/admin/media-picker'
import { Field } from './field'

interface HeroFormProps {
  block: HeroBlock
  onChange: (next: HeroBlock) => void
}

function HeroForm({ block, onChange }: HeroFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="제목">
        <Input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} />
      </Field>
      <Field label="부제목">
        <Input
          value={block.subheading ?? ''}
          onChange={(e) => onChange({ ...block, subheading: e.target.value })}
        />
      </Field>
      <Field label="이미지">
        <MediaPicker
          value={block.image ? { id: '', path: block.image } : null}
          onChange={(m) => onChange({ ...block, image: m?.path })}
        />
      </Field>
      <Field label="버튼 문구">
        <Input
          value={block.ctaLabel ?? ''}
          onChange={(e) => onChange({ ...block, ctaLabel: e.target.value })}
        />
      </Field>
      <Field label="버튼 링크">
        <Input
          value={block.ctaHref ?? ''}
          placeholder="/products"
          onChange={(e) => onChange({ ...block, ctaHref: e.target.value })}
        />
      </Field>
    </div>
  )
}

export { HeroForm }
