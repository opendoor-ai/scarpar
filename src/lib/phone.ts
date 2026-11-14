// 한국 전화번호 표시·링크·입력 도우미.

/** 숫자만 남김: "010-4360-8872" -> "01043608872". 국가번호 82는 0으로 바꿈. */
export function phoneDigits(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '')
  if (digits.startsWith('82') && digits.length >= 11) digits = `0${digits.slice(2)}`
  return digits
}

/** 보기 좋게: 01043608872 -> 010-4360-8872, 0212345678 -> 02-1234-5678. */
export function formatKrPhone(phone: string): string {
  const d = phoneDigits(phone)
  if (d.startsWith('02')) {
    if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
  }
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`
  return phone
}

/** 휴대폰 번호(010/011/016/017/018/019)인지 — 문자 문의 버튼은 휴대폰일 때만 보여줌. */
export function isMobilePhone(phone: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phoneDigits(phone))
}

/**
 * 입력하는 중에 하이픈 자동 넣기 (입력칸 type="tel"이 사용).
 *   010-1234-5678 · 02-123-4567 · 02-1234-5678 · 031-123-4567 · 031-1234-5678
 *   1588-1234 (대표번호) · 0505-123-4567 (안심번호) · 070-1234-5678
 */
export function formatPhone(raw: string): string {
  const v = raw ?? ''
  // 국제번호(+82 …)나 숫자 외 글자가 섞인 값은 건드리지 않음
  if (/^\s*\+/.test(v) || /[^\d\s-]/.test(v)) return v
  const d = v.replace(/\D/g, '').slice(0, 12)
  if (d.length === 0) return ''

  // 대표번호 15xx·16xx·18xx (8자리)
  if (/^1[5689]/.test(d)) {
    const n = d.slice(0, 8)
    return n.length <= 4 ? n : `${n.slice(0, 4)}-${n.slice(4)}`
  }
  // 서울 02
  if (d.startsWith('02')) {
    const n = d.slice(0, 10)
    if (n.length <= 2) return n
    if (n.length <= 5) return `${n.slice(0, 2)}-${n.slice(2)}`
    if (n.length <= 9) return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5)}`
    return `${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6)}`
  }
  // 0505·0504 안심번호 (12자리)
  if (/^050[2-8]/.test(d)) {
    if (d.length <= 4) return d
    if (d.length <= 7) return `${d.slice(0, 4)}-${d.slice(4)}`
    if (d.length <= 11) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`
    return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`
  }
  // 휴대폰 010·011…, 지역번호 031·051…, 070
  const n = d.slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0, 3)}-${n.slice(3)}`
  if (n.length <= 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`
}
