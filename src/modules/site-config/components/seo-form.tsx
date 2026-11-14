'use client'

// 검색엔진 최적화(SEO) + AI 답변 최적화(AEO) 설정 — 카페24 SEO 화면처럼 접었다 펴는 칸 + 오른쪽 미리보기

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { MediaPicker } from '@/components/admin/media-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { mediaUrl } from '@/lib/media-url'
import { cn } from '@/lib/utils'

import { saveSiteSectionAction } from '../actions'
import { CRAWLERS, SEO_VARIABLES, type SeoSettings } from '../schemas'
import { ChannelsTable } from './channels-table'

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {desc ? <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p> : null}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

function Fold({ title, hint, defaultOpen, children }: { title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold hover:bg-muted/40">
        {title}
        {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
        <ChevronDown className={cn('ml-auto size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? <div className="flex flex-col gap-4 px-5 pt-1 pb-5">{children}</div> : null}
    </div>
  )
}

function Field({ label, sub, hint, children }: { label: string; sub?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
      <div className="text-sm font-medium">
        {label}
        {sub ? <span className="block text-[11px] font-normal text-muted-foreground">{sub}</span> : null}
      </div>
      <div className="flex flex-col gap-1">
        {children}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function Counter({ value, max, good }: { value: string; max: number; good: [number, number] }) {
  const n = value.length
  const ok = n >= good[0] && n <= good[1]
  return (
    <span className={cn('text-[11px] tabular-nums', ok ? 'text-emerald-600' : 'text-amber-600')}>
      {n}/{max}자 · 권장 {good[0]}~{good[1]}자
    </span>
  )
}

function Vars({ list }: { list: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((v) => (
        <code key={v} className="rounded bg-muted px-1 text-[11px]">
          {v}
        </code>
      ))}
    </span>
  )
}

export function SeoForm({ initial, siteUrl }: { initial: SeoSettings; siteUrl: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState<SeoSettings>(initial)
  const [tab, setTab] = useState<'google' | 'naver' | 'sns'>('google')
  const set = (patch: Partial<SeoSettings>) => setV((p) => ({ ...p, ...patch }))
  const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')

  function save() {
    start(async () => {
      const res = await saveSiteSectionAction('seo', {
        ...v,
        faq: v.faq.filter((f) => f.q.trim() && f.a.trim()),
      })
      if (!res.ok) return void toast.error(res.error)
      toast.success('검색엔진 최적화 설정을 저장했어요')
      router.refresh()
    })
  }

  const toggleCrawler = (key: string) =>
    set({ blockedCrawlers: v.blockedCrawlers.includes(key) ? v.blockedCrawlers.filter((k) => k !== key) : [...v.blockedCrawlers, key] })

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* 기본설정 */}
        <Card title="기본설정" desc="검색 결과와 브라우저 제목에 보이는 대표 정보예요. 모든 페이지의 기본값이 돼요.">
          <Fold title="공통 페이지 SEO 태그" defaultOpen>
            <Field label="사이트 이름" sub="Title 태그" hint={<Counter value={v.title} max={70} good={[20, 60]} />}>
              <Input value={v.title} onChange={(e) => set({ title: e.target.value })} maxLength={70} />
            </Field>
            <Field label="사이트 안내" sub="Description 태그" hint={<Counter value={v.description} max={200} good={[80, 160]} />}>
              <Textarea value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={200} rows={3} />
            </Field>
            <Field label="대표 검색어" sub="Keywords" hint="쉼표로 나눠 적어요. 구글은 거의 쓰지 않지만 네이버·다음 참고용이에요.">
              <Input value={v.keywords} onChange={(e) => set({ keywords: e.target.value })} maxLength={300} />
            </Field>
          </Fold>
          <Fold title="파비콘" hint="브라우저 탭·검색 결과에 보이는 작은 아이콘">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-4">
                <MediaPicker
                  accept="image/x-icon,image/vnd.microsoft.icon,.ico,image/png,image/svg+xml,image/webp"
                  value={v.favicon ? { id: '', path: v.favicon } : null}
                  onChange={(m) => set({ favicon: m?.path ?? '' })}
                />
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  ICO · PNG · SVG 모두 돼요
                  <br />
                  권장: 정사각형 PNG 512×512 (또는 ICO)
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 text-sm">
                <p className="text-muted-foreground">파비콘은 주소창·브라우저 탭·북마크·검색 결과에 보이는 사이트 대표 아이콘이에요.</p>
                <div className="mt-3 overflow-hidden rounded-t-lg border border-border bg-muted">
                  <div className="flex items-center gap-1.5 px-3 pt-2">
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="ml-3 flex min-w-0 items-center gap-2 rounded-t-md bg-background px-3 py-1.5 text-xs">
                      {v.favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(v.favicon)} alt="" className="size-4 object-contain" />
                      ) : (
                        <span className="size-4 rounded-sm bg-primary/60" />
                      )}
                      <span className="truncate">{v.title || '사이트 이름'}</span>
                    </span>
                  </div>
                  <div className="h-8 bg-background" />
                </div>
              </div>
            </div>
          </Fold>
          <Fold title="SNS 공유 이미지" hint="카카오톡·페이스북·밴드에 링크를 보낼 때 보이는 그림">
            <Field label="공유 이미지" hint="1200×630 권장. 상품 페이지는 상품 대표이미지가 먼저 쓰여요.">
              <MediaPicker value={v.ogImage ? { id: '', path: v.ogImage } : null} onChange={(m) => set({ ogImage: m?.path ?? '' })} />
            </Field>
          </Fold>
          <Fold title="네이버 연관채널 · SNS" hint="블로그·유튜브·인스타그램 등 공식 채널 (검색엔진이 같은 회사로 인식)">
            <ChannelsTable value={v.channels} onChange={(channels) => set({ channels })} />
          </Fold>
          <Fold title="검색엔진 서비스 연결" hint="구글 서치콘솔 · 네이버 서치어드바이저 · 빙 · 다음 웹마스터도구">
            <Field label="구글 서치콘솔" hint={<>HTML 태그 방식의 <code>content=&quot;…&quot;</code> 값만 넣어요.</>}>
              <Input value={v.googleVerification} onChange={(e) => set({ googleVerification: e.target.value })} placeholder="예) AbCdEf123..." />
            </Field>
            <Field label="네이버 서치어드바이저" hint="사이트 소유확인 → HTML 태그의 content 값">
              <Input value={v.naverVerification} onChange={(e) => set({ naverVerification: e.target.value })} />
            </Field>
            <Field label="빙 웹마스터" hint="msvalidate.01 의 content 값">
              <Input value={v.bingVerification} onChange={(e) => set({ bingVerification: e.target.value })} />
            </Field>
            <Field label="다음 웹마스터도구" hint="로봇 파일(robots.txt)에 넣는 인증 문구 전체 — 예) #DaumWebMasterTool:abc…:abc…">
              <Input value={v.daumPin} onChange={(e) => set({ daumPin: e.target.value })} placeholder="#DaumWebMasterTool:..." />
            </Field>
            <Field label="구글 애널리틱스" hint="측정 ID (G-로 시작)">
              <Input value={v.ga4Id} onChange={(e) => set({ ga4Id: e.target.value })} placeholder="G-XXXXXXXXXX" />
            </Field>
            <Field label="네이버 애널리틱스" hint="사이트 ID (숫자·영문)">
              <Input value={v.naverAnalyticsId} onChange={(e) => set({ naverAnalyticsId: e.target.value })} />
            </Field>
          </Fold>
        </Card>

        {/* 고급설정 */}
        <Card title="고급설정" desc="검색 로봇이 어디까지 볼 수 있는지, 페이지마다 어떤 제목·설명을 쓸지 정해요.">
          <Fold title="검색로봇 · AI 크롤링 접근" hint="체크를 끄면 그 로봇은 사이트를 가져갈 수 없어요" defaultOpen>
            <Field label="검색엔진" hint="검색 결과에 나오려면 켜 두세요.">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {CRAWLERS.filter((c) => c.group === 'search').map((c) => (
                  <label key={c.key} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={!v.blockedCrawlers.includes(c.key)} onChange={() => toggleCrawler(c.key)} className="size-4 accent-primary" />
                    {c.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="AI 검색·답변" hint="AEO: ChatGPT·Claude·Perplexity·Gemini가 답변할 때 우리 사이트를 출처로 쓰게 하려면 켜 두세요.">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {CRAWLERS.filter((c) => c.group === 'ai').map((c) => (
                  <label key={c.key} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={!v.blockedCrawlers.includes(c.key)} onChange={() => toggleCrawler(c.key)} className="size-4 accent-primary" />
                    {c.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="추가로 막을 주소" hint="한 줄에 하나 (예: /minishop/test-supplier). 관리자·로그인·장바구니는 이미 막혀 있어요.">
              <Textarea value={v.extraDisallow} onChange={(e) => set({ extraDisallow: e.target.value })} rows={3} />
            </Field>
          </Fold>
          <Fold title="개별 페이지 SEO 태그" hint="변수를 넣으면 페이지마다 자동으로 바뀌어요">
            <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              상품 등록 화면의 "검색 노출 문구"를 따로 적은 상품은 그 문구가 먼저 쓰여요. 사이트 이름(| 전자동기계광고)은 자동으로 뒤에 붙어요.
            </p>
            <Field label="상품 상세 제목" hint={<Vars list={SEO_VARIABLES.product} />}>
              <Input value={v.productTitle} onChange={(e) => set({ productTitle: e.target.value })} />
            </Field>
            <Field label="상품 상세 설명">
              <Textarea value={v.productDescription} onChange={(e) => set({ productDescription: e.target.value })} rows={2} />
            </Field>
            <Field label="분류 페이지 제목" hint={<Vars list={SEO_VARIABLES.category} />}>
              <Input value={v.categoryTitle} onChange={(e) => set({ categoryTitle: e.target.value })} />
            </Field>
            <Field label="분류 페이지 설명">
              <Textarea value={v.categoryDescription} onChange={(e) => set({ categoryDescription: e.target.value })} rows={2} />
            </Field>
            <Field label="미니샵 제목" hint={<Vars list={SEO_VARIABLES.minishop} />}>
              <Input value={v.minishopTitle} onChange={(e) => set({ minishopTitle: e.target.value })} />
            </Field>
            <Field label="미니샵 설명">
              <Textarea value={v.minishopDescription} onChange={(e) => set({ minishopDescription: e.target.value })} rows={2} />
            </Field>
          </Fold>
          <Fold title="사이트맵 · RSS · AI 안내 파일" hint="자동으로 만들어져요">
            <ul className="flex flex-col gap-1.5 text-sm">
              {[
                ['/sitemap.xml', '사이트맵 — 구글·네이버·다음에 제출하세요'],
                ['/rss.xml', 'RSS — 네이버 서치어드바이저 "RSS 제출"에 넣으세요 (최신 상품)'],
                ['/robots.txt', '로봇 파일 — 위의 접근 설정이 반영돼요'],
                ['/llms.txt', 'AI 안내 파일 — ChatGPT·Claude 같은 AI가 사이트를 이해하는 요약'],
              ].map(([path, label]) => (
                <li key={path} className="flex flex-wrap items-center gap-2">
                  <a href={path} target="_blank" rel="noopener" className="font-mono text-primary hover:underline">
                    {host}
                    {path}
                  </a>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </Fold>
        </Card>

        {/* AEO */}
        <Card title="AI 답변 최적화 (AEO)" desc="ChatGPT·Claude·Perplexity·네이버 큐: 같은 AI 검색이 질문에 답할 때 우리 사이트를 인용하도록, 짧고 정확한 소개와 자주 묻는 질문을 적어요.">
          <Fold title="사이트 한눈에 소개" hint="AI 안내 파일(/llms.txt)과 회사 정보(구조화 데이터)에 쓰여요" defaultOpen>
            <Field label="소개 문단" hint="누가·무엇을·어떻게 — 3~5문장. 예) 전자동기계광고는 ○○개 공급사가 중고기계를 올리는 직거래 플랫폼으로, 고객은 공급사에 바로 전화해 상담합니다.">
              <Textarea value={v.aiSummary} onChange={(e) => set({ aiSummary: e.target.value })} rows={5} maxLength={2000} />
            </Field>
          </Fold>
          <Fold title="자주 묻는 질문 (FAQ)" hint="고객센터 화면 + 검색엔진 FAQ 구조화 데이터 + AI 안내 파일" defaultOpen>
            <p className="text-xs text-muted-foreground">질문은 실제 고객이 검색하는 말투로, 답은 첫 문장에 결론을 적어요. 비워 두면 고객센터의 기본 질문이 쓰여요.</p>
            {v.faq.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">Q{i + 1}</span>
                  <Input value={f.q} onChange={(e) => set({ faq: v.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} placeholder="예) 중고 CNC선반은 어디서 살 수 있나요?" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => set({ faq: v.faq.filter((_, j) => j !== i) })} aria-label="질문 지우기">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea value={f.a} onChange={(e) => set({ faq: v.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} rows={3} placeholder="답변" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set({ faq: [...v.faq, { q: '', a: '' }] })} disabled={v.faq.length >= 30}>
              <Plus className="size-4" />
              질문 추가
            </Button>
          </Fold>
        </Card>

        <div className="flex justify-center pb-6">
          <Button onClick={save} disabled={pending} className="w-36">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            저장하기
          </Button>
        </div>
      </div>

      {/* 미리보기 */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-bold">미리보기</p>
          <p className="text-[11px] text-muted-foreground">실제 검색 결과와 조금 다를 수 있어요.</p>
          <div className="mt-3 flex border-b border-border text-sm">
            {(
              [
                ['google', '구글'],
                ['naver', '네이버'],
                ['sns', 'SNS'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={cn('flex-1 border-b-2 py-1.5', tab === k ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground')}>
                {l}
              </button>
            ))}
          </div>
          {tab === 'sns' ? (
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-xs text-muted-foreground">
                {v.ogImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(v.ogImage)} alt="" className="size-full object-cover" />
                ) : (
                  '공유 이미지 없음'
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-sm font-semibold">{v.title || '사이트 이름'}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{v.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{host}</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-1">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {v.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(v.favicon)} alt="" className="size-4 rounded-full" />
                ) : (
                  <span className="size-4 rounded-full bg-primary/30" />
                )}
                {tab === 'google' ? `https://${host}` : host}
              </p>
              <p className={cn('line-clamp-2 text-[15px] leading-snug', tab === 'google' ? 'text-[#1a0dab] dark:text-[#8ab4f8]' : 'font-bold text-[#0c43b7] dark:text-[#8ab4f8]')}>{v.title || '사이트 이름'}</p>
              <p className="line-clamp-3 text-xs text-muted-foreground">{v.description || '사이트 안내 문구'}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
