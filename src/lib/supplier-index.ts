// 공급사 이름 → 색인 글자 (ㄱ~ㅎ · A~Z · 0-9)
// "(주)", "주식회사", "㈜" 같은 앞말은 빼고 첫 글자로 정해요.

export const KO_INDEX = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'] as const
export const EN_INDEX = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const DOUBLE: Record<string, string> = { ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ' }

export function cleanCompanyName(name: string): string {
  return name
    .replace(/^\s*(\(주\)|㈜|주식회사|\(유\)|유한회사|\(합\))\s*/g, '')
    .replace(/^[\s\-·.()[\]]+/, '')
    .trim()
}

export function indexOf(name: string): string {
  const c = cleanCompanyName(name).charAt(0)
  if (!c) return '#'
  const code = c.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const cho = CHO[Math.floor((code - 0xac00) / 588)]
    return DOUBLE[cho] ?? cho
  }
  if (/[a-z]/i.test(c)) return c.toUpperCase()
  if (/\d/.test(c)) return '0-9'
  return '#'
}
