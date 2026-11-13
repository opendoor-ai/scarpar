'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface FeaturesInputProps {
  value: string[]
  onChange: (value: string[]) => void
}

function FeaturesInput({ value, onChange }: FeaturesInputProps) {
  const [draft, setDraft] = useState('')

  function addFeature() {
    const next = draft.trim()
    if (!next || value.includes(next)) {
      setDraft('')
      return
    }
    onChange([...value, next])
    setDraft('')
  }

  function removeFeature(feature: string) {
    onChange(value.filter((item) => item !== feature))
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((feature) => (
            <Badge key={feature} variant="secondary" className="gap-1">
              {feature}
              <button type="button" onClick={() => removeFeature(feature)} aria-label={`Remove ${feature}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addFeature()
          }
        }}
        placeholder="특징 입력 후 Enter"
        className="h-8"
      />
    </div>
  )
}

export { FeaturesInput }
