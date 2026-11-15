'use client'

// [메인] 슬라이드 (B타입) — 화면 너비를 가득 채우는 큰 슬라이드
// 이미지(PC/모바일) 위에 제목·설명·버튼을 원하는 위치에 올리고, HTML 칸에 영상 코드가 있으면 영상으로 보여줌

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import { sendAdEvent } from '@/modules/ads/track'

export interface HeroTextStyle {
  html: string
  color: string
  pc: number | null
  m: number | null
  bold: boolean
}

export interface HeroSlideB {
  id: string
  title: string
  pc: string
  mobile: string
  link: string
  target: '_self' | '_blank'
  /** 글자 위치 (PC / 모바일), 'none' 이면 글자 없음 */
  alignPc: string
  alignM: string
  heading: HeroTextStyle | null
  desc: HeroTextStyle | null
  button: { label: string; color: string; bg: string } | null
  video: string // 정리된 영상 코드
  ratio: string // 영상 비율 (예: 16/9)
}

const H = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' } as const
const V = { top: 'justify-start', center: 'justify-center', bottom: 'justify-end' } as const
const MH = { left: 'max-sm:items-start max-sm:text-left', center: 'max-sm:items-center max-sm:text-center', right: 'max-sm:items-end max-sm:text-right' } as const
const MV = { top: 'max-sm:justify-start', center: 'max-sm:justify-center', bottom: 'max-sm:justify-end' } as const

/** "left-center" → [가로, 세로] */
function parseAlign(v: string): [keyof typeof H, keyof typeof V] {
  const [a, b] = v.trim().toLowerCase().split('-')
  const h = (['left', 'center', 'right'].includes(a) ? a : 'center') as keyof typeof H
  const vert = (['top', 'center', 'bottom'].includes(b ?? 'center') ? (b ?? 'center') : 'center') as keyof typeof V
  return [h, vert]
}

function textStyle(t: HeroTextStyle, fallbackPc: number, fallbackM: number) {
  return {
    color: t.color || undefined,
    fontWeight: t.bold ? 700 : undefined,
    // PC·모바일 글자 크기는 CSS 변수로 넘겨 화면 크기에 따라 고름
    ['--pc' as string]: `${t.pc ?? fallbackPc}px`,
    ['--m' as string]: `${t.m ?? t.pc ?? fallbackM}px`,
  } as React.CSSProperties
}

export function HeroSliderB({ slides }: { slides: HeroSlideB[] }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hover, setHover] = useState(false)
  const seen = useRef(new Set<string>())
  const count = slides.length
  const current = slides[index]

  useEffect(() => {
    if (current && !seen.current.has(current.id)) {
      seen.current.add(current.id)
      sendAdEvent(current.id, 'impression')
    }
  }, [current])

  // 영상 슬라이드에서는 자동 넘김을 멈춤
  useEffect(() => {
    if (count < 2 || !playing || hover || current?.video) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(t)
  }, [count, playing, hover, current?.video])

  if (count === 0) return null
  const go = (i: number) => setIndex((i + count) % count)

  return (
    <section
      className="font-banner group relative w-full overflow-hidden bg-muted"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-roledescription="carousel"
      aria-label="메인 슬라이드"
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => {
          const [ph, pv] = parseAlign(s.alignPc)
          const [mh, mv] = parseAlign(s.alignM || s.alignPc)
          const noText = s.alignPc.trim() === 'none' || (!s.heading && !s.desc && !s.button)
          const external = s.target === '_blank'
          const linkProps = {
            href: s.link,
            target: external ? '_blank' : undefined,
            rel: external ? 'noopener' : undefined,
            onClick: () => sendAdEvent(s.id, 'click'),
          }
          return (
            <div key={s.id} className="relative w-full shrink-0" aria-hidden={i !== index}>
              {s.video ? (
                <div
                  className="relative w-full bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_video]:absolute [&_video]:inset-0 [&_video]:size-full [&_video]:object-cover"
                  style={{ aspectRatio: s.ratio || '16/9', maxHeight: '80vh', marginInline: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: s.video }}
                />
              ) : (
                <picture>
                  <source media="(max-width: 639px)" srcSet={s.mobile || s.pc} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.pc || s.mobile}
                    alt={s.title}
                    className="aspect-[9/10] w-full object-cover sm:aspect-[2550/800]"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </picture>
              )}

              {/* 이미지만 있고 글자가 없으면 이미지 전체가 링크 */}
              {!s.video && noText && s.link ? (
                <a {...linkProps} className="absolute inset-0" aria-label={s.title} tabIndex={i === index ? 0 : -1} />
              ) : null}

              {!noText && !s.video ? (
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-8 pb-14 sm:px-10 sm:py-14',
                    H[ph],
                    V[pv],
                    MH[mh],
                    MV[mv],
                  )}
                >
                  {s.heading ? (
                    <h2
                      className="leading-tight whitespace-pre-line [font-size:var(--m)] sm:[font-size:var(--pc)]"
                      style={textStyle(s.heading, 44, 26)}
                      dangerouslySetInnerHTML={{ __html: s.heading.html }}
                    />
                  ) : null}
                  {s.desc ? (
                    <p
                      className="max-w-xl leading-relaxed whitespace-pre-line [font-size:var(--m)] sm:[font-size:var(--pc)]"
                      style={textStyle(s.desc, 18, 14)}
                      dangerouslySetInnerHTML={{ __html: s.desc.html }}
                    />
                  ) : null}
                  {s.button && s.link ? (
                    <a
                      {...linkProps}
                      tabIndex={i === index ? 0 : -1}
                      className="pointer-events-auto mt-2 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
                      style={{ color: s.button.color || '#ffffff', background: s.button.bg || '#111111' }}
                    >
                      {s.button.label}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full bg-black/35 p-2 text-white group-hover:block sm:left-6"
            aria-label="이전 슬라이드"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-full bg-black/35 p-2 text-white group-hover:block sm:right-6"
            aria-label="다음 슬라이드"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/60')}
                aria-label={`${i + 1}번째 슬라이드`}
              />
            ))}
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="ml-1 text-white"
              aria-label={playing ? '자동 넘김 멈춤' : '자동 넘김 시작'}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
