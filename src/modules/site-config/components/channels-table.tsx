'use client'

// 네이버 연관채널 · SNS 표 — 사용여부 스위치 + 채널 + 바로가기 주소 (카페24처럼)

import { useMemo, useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { PRESET_CHANNELS, parseChannels, serializeChannels, type Channel } from '../schemas'

/** 기본 채널 7개 + 저장된 채널을 합친 목록 */
function buildRows(text: string): (Channel & { preset: boolean })[] {
  const saved = parseChannels(text)
  const rows: (Channel & { preset: boolean })[] = PRESET_CHANNELS.map((label) => {
    const hit = saved.find((c) => c.label === label)
    return { label, url: hit?.url ?? '', enabled: hit?.enabled ?? false, preset: true }
  })
  for (const c of saved) {
    if (PRESET_CHANNELS.includes(c.label)) continue
    rows.push({ ...c, label: c.label || '채널', preset: false })
  }
  return rows
}

export function ChannelsTable({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const initial = useMemo(() => buildRows(value), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState(initial)
  const [drag, setDrag] = useState<number | null>(null)

  function update(next: typeof rows) {
    setRows(next)
    onChange(serializeChannels(next))
  }
  const patch = (i: number, p: Partial<Channel>) => update(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-8" />
              <th className="w-10 py-2">NO</th>
              <th className="w-20 py-2">사용여부</th>
              <th className="w-40 py-2 text-left">연관채널</th>
              <th className="py-2 text-left">바로가기 URL</th>
              <th className="w-14" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag === null || drag === i) return
                  const next = [...rows]
                  const [m] = next.splice(drag, 1)
                  next.splice(i, 0, m)
                  setDrag(null)
                  update(next)
                }}
                className="border-t border-border"
              >
                <td className="cursor-grab text-center text-muted-foreground">
                  <GripVertical className="mx-auto size-4" />
                </td>
                <td className="text-center text-muted-foreground">{i + 1}</td>
                <td className="text-center">
                  <Switch checked={r.enabled} onCheckedChange={(on) => patch(i, { enabled: on })} aria-label={`${r.label} 사용`} />
                </td>
                <td className="p-1.5">
                  {r.preset ? (
                    <span className="px-1">{r.label}</span>
                  ) : (
                    <Input value={r.label} onChange={(e) => patch(i, { label: e.target.value })} className="h-8" placeholder="예) 네이버블로그" />
                  )}
                </td>
                <td className="p-1.5">
                  <Input
                    value={r.url}
                    onChange={(e) => patch(i, { url: e.target.value, enabled: r.enabled || Boolean(e.target.value.trim()) })}
                    className="h-8"
                    placeholder="https://"
                  />
                </td>
                <td className="p-1.5 text-center">
                  {!r.preset ? (
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => update(rows.filter((_, j) => j !== i))} aria-label="채널 지우기">
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => update([...rows, { label: '', url: '', enabled: true, preset: false }])}
        disabled={rows.length >= 30}
      >
        <Plus className="size-4" />
        추가
      </Button>
      <p className="text-xs text-muted-foreground">
        네이버블로그·네이버카페·밴드처럼 기본 목록에 없는 채널은 [추가]로 넣어요. 켜 둔 채널만 검색엔진에 &quot;같은 회사의 공식 채널&quot;로 알려져요 (네이버 연관채널·구글
        sameAs). 손잡이를 끌어 순서를 바꿀 수 있어요.
      </p>
    </div>
  )
}
