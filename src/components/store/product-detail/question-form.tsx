'use client'

// 상품 Q&A 질문 작성 폼 (로그인 없이 작성)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { askQuestionAction } from '@/modules/questions/public-actions'

export function QuestionForm({ orgSlug, productId }: { orgSlug: string; productId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [question, setQuestion] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [website, setWebsite] = useState('')

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        상품 문의하기
      </Button>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await askQuestionAction({
        orgSlug,
        productId,
        authorName: name,
        authorContact: contact,
        question,
        isPrivate,
        website,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('질문이 등록되었습니다. 공급사가 확인 후 답변해 드립니다.')
      setQuestion('')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qa-name">이름</Label>
          <Input id="qa-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qa-contact">연락처 (선택, 공개되지 않음)</Label>
          <Input
            id="qa-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="휴대폰 번호 또는 이메일"
            maxLength={100}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qa-question">문의 내용</Label>
        <Textarea
          id="qa-question"
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="사양, 상태, 납기, 설치 조건 등 궁금한 점을 남겨 주세요."
          maxLength={2000}
          required
        />
      </div>
      {/* 스팸 방지용 숨김 칸 — 화면에 보이지 않음 */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={isPrivate} onCheckedChange={(v) => setIsPrivate(v === true)} />
        비밀글로 등록 (공급사만 볼 수 있음)
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          취소
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? '등록 중…' : '질문 등록'}
        </Button>
      </div>
    </form>
  )
}
