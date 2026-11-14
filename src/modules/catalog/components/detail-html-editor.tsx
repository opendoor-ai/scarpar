'use client'

// 상품 상세 내용 편집기 (간단 버전)
// - 글은 그대로 쓰고, 버튼으로 제목·굵게·목록·표·이미지를 넣을 수 있습니다.
// - 저장할 때 서버에서 허용된 태그만 남기고 걸러냅니다 (src/lib/detail-html.ts).

import { useRef, useState } from 'react'
import { Bold, Eye, Heading2, ImagePlus, List, Pencil, Table } from 'lucide-react'

import { MediaPicker } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'

interface DetailHtmlEditorProps {
  value: string
  onChange: (value: string) => void
}

const SPEC_TABLE = `<table>
  <tr><th>항목</th><td>내용</td></tr>
  <tr><th>항목</th><td>내용</td></tr>
</table>
`

export function DetailHtmlEditor({ value, onChange }: DetailHtmlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)

  /** 커서 위치(또는 선택한 글자)에 태그를 넣습니다. */
  function insert(before: string, after = '') {
    const el = textareaRef.current
    if (!el) {
      onChange(value + before + after)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + before.length + selected.length + after.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => insert('<h3>', '</h3>\n')} disabled={preview}>
          <Heading2 className="size-4" />
          소제목
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insert('<strong>', '</strong>')} disabled={preview}>
          <Bold className="size-4" />
          굵게
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insert('<ul>\n  <li>', '</li>\n</ul>\n')}
          disabled={preview}
        >
          <List className="size-4" />
          목록
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => insert(SPEC_TABLE)} disabled={preview}>
          <Table className="size-4" />
          사양표
        </Button>
        <div className="ml-auto">
          <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
            {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            {preview ? '편집으로' : '미리보기'}
          </Button>
        </div>
      </div>

      {preview ? (
        <div
          className="detail-html min-h-48 rounded-md border border-border p-4 text-sm"
          // 관리자 본인이 쓴 내용의 미리보기 — 고객 화면에는 서버에서 정화된 내용만 나갑니다.
          dangerouslySetInnerHTML={{ __html: value || '<p style="color:#888">아직 내용이 없습니다.</p>' }}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          rows={12}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'제품 소개, 특징, 사용 용도 등을 자유롭게 쓰세요.\n위 버튼으로 소제목·목록·사양표·이미지를 넣을 수 있습니다.'}
          className="font-mono text-xs"
        />
      )}

      <div className="flex items-center gap-2">
        <ImagePlus className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">상세 이미지 넣기:</span>
        <MediaPicker
          key={pickerKey}
          value={null}
          label="이미지 선택"
          onChange={(media) => {
            if (!media) return
            insert(`<p><img src="${mediaUrl(media.path)}" alt="" /></p>\n`)
            setPickerKey((k) => k + 1)
          }}
        />
      </div>
    </div>
  )
}
