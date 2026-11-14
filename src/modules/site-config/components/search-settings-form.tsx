'use client'

// 상품검색 설정 — 검색 항목 · 인기검색어 · 검색창 홍보 문구 (카페24 상품검색 설정처럼)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Minus, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { saveSiteSectionAction } from '../actions'
import { SEARCH_FIELDS, type SearchField, type SearchSettings } from '../schemas'

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col border-b border-border last:border-b-0 sm:flex-row">
      <div className="bg-muted/50 px-4 py-3 text-[13px] font-medium sm:w-44 sm:shrink-0">{label}</div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 py-2.5 text-[13px]">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

export function SearchSettingsForm({ initial, suppliers }: { initial: SearchSettings; suppliers: { name: string; slug: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<SearchSettings>(initial)
  const set = (patch: Partial<SearchSettings>) => setV((p) => ({ ...p, ...patch }))
  const promos = v.promos.length ? v.promos : [{ text: '', url: '' }]
  const setPromo = (i: number, patch: Partial<{ text: string; url: string }>) =>
    set({ promos: promos.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const popularCount = v.popular.split(',').filter((k) => k.trim()).length

  function save() {
    start(async () => {
      const res = await saveSiteSectionAction('search', { ...v, promos: promos.filter((p) => p.text.trim()) })
      if (!res.ok) return void toast.error(res.error)
      toast.success('상품검색 설정을 저장했어요')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-bold">검색조건 설정</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Row label="상품검색 조건" hint="위쪽 검색창에서 이 항목들로 찾아요. 상품코드는 P10006 또는 10006 모두 돼요.">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SEARCH_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={v.fields.includes(f.key)}
                    onChange={() =>
                      set({ fields: v.fields.includes(f.key) ? v.fields.filter((x) => x !== f.key) : [...v.fields, f.key as SearchField] })
                    }
                    className="size-4 accent-primary"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </Row>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-bold">인기검색어 설정</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Row label="인기검색어" hint={`검색어는 쉼표(,)로 구분해 10개까지 적어요. 검색창 아래에 보여요. (지금 ${popularCount}개)`}>
            <Input value={v.popular} onChange={(e) => set({ popular: e.target.value })} placeholder="중고머시닝센터, 머시닝센터, 씨드스프레이, 커튼, 진공펌프, 미니드릴, 숏크리트" />
          </Row>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-bold">검색창 홍보 문구 설정</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Row label="검색창 홍보 문구">
            <div className="flex flex-wrap items-center gap-4">
              {[
                [true, '사용함'],
                [false, '사용안함'],
              ].map(([val, l]) => (
                <label key={String(val)} className="flex items-center gap-1.5">
                  <input type="radio" checked={v.promoEnabled === val} onChange={() => set({ promoEnabled: val as boolean })} className="size-3.5 accent-primary" />
                  {l as string}
                </label>
              ))}
              <span className="ml-auto flex h-9 w-60 items-center rounded-full border-2 border-primary/60 px-4 text-xs text-muted-foreground">
                <span className="truncate">{promos.find((p) => p.text.trim())?.text || '홍보 문구 미리보기'}</span>
                <Search className="ml-auto size-4 text-primary" />
              </span>
            </div>
          </Row>
          <Row label="표시 방법" hint="4초마다 다른 문구로 바뀌어요. 검색어 없이 검색 버튼을 누르면 그 문구의 연결 주소로 가요.">
            <div className="flex gap-4">
              {(
                [
                  ['random', '랜덤 표시'],
                  ['order', '등록순 표시'],
                ] as const
              ).map(([val, l]) => (
                <label key={val} className="flex items-center gap-1.5">
                  <input type="radio" checked={v.promoMode === val} onChange={() => set({ promoMode: val })} className="size-3.5 accent-primary" />
                  {l}
                </label>
              ))}
            </div>
          </Row>
          <Row label="홍보 문구 등록">
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="w-56 py-1.5">홍보 문구</th>
                    <th className="py-1.5">연결 페이지</th>
                    <th className="w-20 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-1.5">
                        <Input value={p.text} onChange={(e) => setPromo(i, { text: e.target.value })} maxLength={40} className="h-8" placeholder="예) 태영SC" />
                      </td>
                      <td className="p-1.5">
                        <div className="flex gap-1">
                          <select
                            value=""
                            onChange={(e) => e.target.value && setPromo(i, { url: e.target.value })}
                            className="h-8 w-36 shrink-0 rounded-md border border-input bg-background px-1.5"
                            aria-label="공급사 미니샵 고르기"
                          >
                            <option value="">URL 직접 설정</option>
                            {suppliers.map((s) => (
                              <option key={s.slug} value={`/minishop/${s.slug}`}>
                                {s.name} 미니샵
                              </option>
                            ))}
                          </select>
                          <Input value={p.url} onChange={(e) => setPromo(i, { url: e.target.value })} className="h-8" placeholder="/minishop/아이디 또는 https://" />
                        </div>
                      </td>
                      <td className="p-1.5">
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => set({ promos: promos.filter((_, j) => j !== i) })} aria-label="문구 빼기">
                            <Minus className="size-3.5" />
                          </Button>
                          {i === promos.length - 1 ? (
                            <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => set({ promos: [...promos, { text: '', url: '' }] })} disabled={promos.length >= 50} aria-label="문구 더하기">
                              <Plus className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Row>
        </div>
      </section>

      <div className="flex justify-center pb-6">
        <Button onClick={save} disabled={pending} className="w-32">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          저장
        </Button>
      </div>
    </div>
  )
}
