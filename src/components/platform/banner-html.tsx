'use client'

// 배너 코드(템플릿)로 만든 HTML 보여주기 + 배너별 노출·클릭 기록 (data-ad-banner)

import { useEffect, useRef } from 'react'

import { sendAdEvent } from '@/modules/ads/track'

export function BannerHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const seen = new Set<string>()
    const nodes = [...root.querySelectorAll<HTMLElement>('[data-ad-banner]')]
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                const id = (e.target as HTMLElement).dataset.adBanner
                if (e.isIntersecting && id && !seen.has(id)) {
                  seen.add(id)
                  sendAdEvent(id, 'impression')
                }
              }
            },
            { threshold: 0.5 },
          )
        : null
    nodes.forEach((n) => io?.observe(n))

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a')
      const banner = (e.target as HTMLElement).closest<HTMLElement>('[data-ad-banner]')
      if (!a || !banner?.dataset.adBanner) return
      if (a.getAttribute('href') === '#none') {
        e.preventDefault()
        return
      }
      sendAdEvent(banner.dataset.adBanner, 'click')
    }
    root.addEventListener('click', onClick)
    return () => {
      io?.disconnect()
      root.removeEventListener('click', onClick)
    }
  }, [html])

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
