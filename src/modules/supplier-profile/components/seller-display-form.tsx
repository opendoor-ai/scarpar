'use client'

// 판매정보 표시설정 — 상품 상세페이지 · 미니샵에 보이는 공급사 정보 상자

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DetailHtmlEditor } from '@/modules/catalog/components/detail-html-editor'

import { saveSellerDisplayAction } from '../actions'

export interface SellerDisplayValues {
  detailEnabled: boolean
  detailHtml: string
  shopEnabled: boolean
  shopHtml: string
}

function Block({
  title,
  hint,
  enabled,
  onEnabled,
  html,
  onHtml,
  defaultHtml,
}: {
  title: string
  hint: string
  enabled: boolean
  onEnabled: (v: boolean) => void
  html: string
  onHtml: (v: string) => void
  defaultHtml: string
}) {
  return (
    <div className="flex flex-col border-b border-border last:border-b-0 sm:flex-row">
      <div className="bg-muted/50 px-4 py-3 text-[13px] font-medium sm:w-40 sm:shrink-0">
        {title}
        <p className="mt-1 text-[11px] font-normal text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-3 text-[13px]">
        <div className="flex items-center gap-4">
          {[
            [true, '표시함'],
            [false, '표시안함'],
          ].map(([v, l]) => (
            <label key={String(v)} className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" checked={enabled === v} onChange={() => onEnabled(v as boolean)} className="size-3.5 accent-indigo-600" />
              {l as string}
            </label>
          ))}
          <button type="button" onClick={() => onHtml(defaultHtml)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3" />
            기본 표로 되돌리기
          </button>
        </div>
        {enabled ? (
          <>
            <DetailHtmlEditor value={html} onChange={onHtml} />
            <p className="text-xs text-muted-foreground">비워 두면 공급사 기본정보(업체명·담당자·연락처·이메일·주소)로 만든 기본 상자가 보여요.</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">표시하지 않아요.</p>
        )}
      </div>
    </div>
  )
}

export function SellerDisplayForm({ initial, defaultHtml }: { initial: SellerDisplayValues; defaultHtml: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<SellerDisplayValues>(initial)
  const set = (patch: Partial<SellerDisplayValues>) => setV((p) => ({ ...p, ...patch }))

  function save() {
    start(async () => {
      const res = await saveSellerDisplayAction(v)
      if (!res.ok) return void toast.error(res.error)
      toast.success('판매정보 표시설정을 저장했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[15px] font-bold">표시설정</h2>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Block
          title="상품상세페이지"
          hint="상품 상세의 공급사 정보 자리"
          enabled={v.detailEnabled}
          onEnabled={(x) => set({ detailEnabled: x })}
          html={v.detailHtml}
          onHtml={(x) => set({ detailHtml: x })}
          defaultHtml={defaultHtml}
        />
        <Block
          title="공급사 쇼핑몰"
          hint="미니샵 첫 화면 아래쪽"
          enabled={v.shopEnabled}
          onEnabled={(x) => set({ shopEnabled: x })}
          html={v.shopHtml}
          onHtml={(x) => set({ shopHtml: x })}
          defaultHtml={defaultHtml}
        />
      </div>
      <div className="flex justify-center pb-6">
        <Button onClick={save} disabled={pending} className="w-32 bg-indigo-600 hover:bg-indigo-700">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          저장
        </Button>
      </div>
    </div>
  )
}
