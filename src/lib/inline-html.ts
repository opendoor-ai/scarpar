// 배너 텍스트에 쓰는 짧은 강조 태그만 허용 (<b>굵게</b>, <br> 등) — 나머지는 글자로 정리
import sanitizeHtml from 'sanitize-html'

export function inlineHtml(text: string | null | undefined): string {
  return sanitizeHtml(text ?? '', {
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 'br', 'span', 'small', 'mark'],
    allowedAttributes: { span: ['style'] },
    allowedStyles: { span: { color: [/^#[0-9a-f]{3,8}$/i], 'font-weight': [/^\d{3}|bold$/] } },
  })
}
