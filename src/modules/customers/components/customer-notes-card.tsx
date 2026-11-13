'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { updateCustomerNotes } from '../actions'

export function CustomerNotesCard({ customerId, notes }: { customerId: string; notes: string | null }) {
  const [value, setValue] = React.useState(notes ?? '')
  const [saving, setSaving] = React.useState(false)
  const savedRef = React.useRef(notes ?? '')

  async function handleBlur() {
    if (value === savedRef.current) return
    setSaving(true)
    const result = await updateCustomerNotes(customerId, value)
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    savedRef.current = value
    toast.success('메모가 저장되었습니다')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>메모</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="이 고객에 대한 내부 메모..."
          className="min-h-24"
          disabled={saving}
        />
      </CardContent>
    </Card>
  )
}
