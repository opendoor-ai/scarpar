'use client'

// [메인] 팝업 — 메인 화면 처음 열 때. "오늘 하루 보지 않기" (이 브라우저에만 기억)

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import { sendAdEvent } from '@/modules/ads/track'

export interface PopupItem {
  id: string
  title: string
  image: string
  link: string
  target: '_self' | '_blank'
}

const KEY = 'jadong-popup-hide-until'

export function MainPopup({ items }: { items: PopupItem[] }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(KEY) || 0)
      if (Date.now() < until) return
    } catch {
      // 저장소를 못 쓰는 브라우저면 그냥 보여줌
    }
    if (items.length > 0) setOpen(true)
  }, [items.length])

  useEffect(() => {
    if (open && items[i]) sendAdEvent(items[i].id, 'impression')
  }, [open, i, items])

  if (!open || items.length === 0) return null
  const item = items[i]

  function hideToday() {
    try {
      const d = new Date()
      d.setHours(23, 59, 59, 999)
      localStorage.setItem(KEY, String(d.getTime()))
    } catch {
      // 무시
    }
    setOpen(false)
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt={item.title} className="max-h-[70vh] w-full object-contain" />
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label="알림 팝업">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-background shadow-2xl">
        {item.link ? (
          <a
            href={item.link}
            target={item.target}
            rel={item.target === '_blank' ? 'noopener' : undefined}
            onClick={() => sendAdEvent(item.id, 'click')}
          >
            {img}
          </a>
        ) : (
          img
        )}
        {items.length > 1 ? (
          <div className="flex justify-center gap-1.5 py-2">
            {items.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setI(idx)}
                className={idx === i ? 'size-2 rounded-full bg-foreground' : 'size-2 rounded-full bg-border'}
                aria-label={`${idx + 1}번째 팝업`}
              />
            ))}
          </div>
        ) : null}
        <div className="flex border-t border-border text-sm">
          <button type="button" onClick={hideToday} className="flex-1 py-3 text-muted-foreground hover:bg-accent">
            오늘 하루 보지 않기
          </button>
          <button type="button" onClick={() => setOpen(false)} className="flex flex-1 items-center justify-center gap-1 border-l border-border py-3 font-semibold hover:bg-accent">
            <X className="size-4" />
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
