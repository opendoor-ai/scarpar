// 한국 전화번호 표시·링크 도우미.

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
