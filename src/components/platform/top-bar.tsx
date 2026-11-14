'use client'

// [상단] 탑배너 — 맨 위 띠. 여러 개면 4초마다 바뀜. 텍스트1=문구, 색상1=글자색, 색상2=배경색, PC이미지=아이콘

import { useEffect, useState } from 'react'

import { sendAdEvent } from '@/modules/ads/track'

export interface TopBarItem {
  id: string
  html: string
  color: string
  bg: string
  icon: string
  link: string
  target: '_self' | '_blank'
}

export function TopBar({ items }: { items: TopBarItem[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 4000)
    return () => clearInterval(t)
  }, [items.length])
  const item = items[i]
  useEffect(() => {
    if (item) sendAdEvent(item.id, 'impression')
  }, [item])
  if (!item) return null

  const body = (
    <span className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-2 px-4 text-xs sm:text-sm">
      {item.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.icon} alt="" className="size-5 shrink-0 rounded object-contain" />
      ) : null}
      <span className="truncate" dangerouslySetInnerHTML={{ __html: item.html }} />
    </span>
  )
  const style = { color: item.color || undefined, background: item.bg || undefined }
  return item.link ? (
    <a
      href={item.link}
      target={item.target}
      rel={item.target === '_blank' ? 'noopener' : undefined}
      onClick={() => sendAdEvent(item.id, 'click')}
      className="block bg-primary text-primary-foreground"
      style={style}
    >
      {body}
    </a>
  ) : (
    <div className="bg-primary text-primary-foreground" style={style}>
      {body}
    </div>
  )
}
