'use client'

import type { BannerBlock } from '@/types/db'
import { Input } from '@/components/ui/input'
import { MediaPicker } from '@/components/admin/media-picker'
import { Field } from './field'

interface BannerFormProps {
  block: BannerBlock
  onChange: (next: BannerBlock) => void
}

function BannerForm({ block, onChange }: BannerFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="이미지">
        <MediaPicker
          value={block.image ? { id: '', path: block.image } : null}
          onChange={(m) => onChange({ ...block, image: m?.path ?? '' })}
        />
      </Field>
      <Field label="링크">
        <Input
          value={block.href ?? ''}
          placeholder="/products/sale"
          onChange={(e) => onChange({ ...block, href: e.target.value })}
        />
      </Field>
    </div>
  )
}

export { BannerForm }
