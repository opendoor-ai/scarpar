// 영상 퍼가기 코드만 안전하게 남기기 (유튜브·비메오 iframe, video/source) — 서버 전용

import sanitizeHtml from 'sanitize-html'

export function embedHtml(html: string | null | undefined): string {
  if (!html || !/<(iframe|video)\b/i.test(html)) return ''
  return sanitizeHtml(html, {
    allowedTags: ['iframe', 'video', 'source'],
    allowedAttributes: {
      iframe: ['src', 'title', 'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', 'loading'],
      video: ['src', 'poster', 'autoplay', 'muted', 'loop', 'playsinline', 'controls', 'preload'],
      source: ['src', 'type'],
    },
    allowedSchemes: ['https'],
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'youtube.com', 'player.vimeo.com'],
  })
}
