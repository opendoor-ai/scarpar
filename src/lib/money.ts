// Money helpers (KRW). DB stores bigint "minor units" (1원 = 100 units) — kept from the
// original schema so no data migration is needed. Display is always whole 원.
// No float math — toPaisa parses via string math to avoid float artifacts.

const WON_SUFFIX = '원'

export function fromPaisa(paisa: number): number {
  return paisa / 100
}

/**
 * Parses a 원 amount (string or number) into integer minor units via string math
 * — avoids classic float-multiplication artifacts (e.g. 1234.5 * 100).
 * Rounds half-up on the 3rd decimal digit if more than 2 fraction digits are given.
 */
export function toPaisa(taka: string | number): number {
  const raw = String(taka).trim()
  if (raw === '' || raw === '-') return 0

  const negative = raw.startsWith('-')
  const clean = (negative ? raw.slice(1) : raw).replace(/,/g, '').replace(/원/g, '')
  const [wholeRaw, fracRaw = ''] = clean.split('.')
  const whole = wholeRaw === '' ? '0' : wholeRaw

  const fracExtended = (fracRaw + '000').slice(0, 3)
  const keep = fracExtended.slice(0, 2)
  const roundUp = Number(fracExtended[2] ?? '0') >= 5

  let paisa = Number(whole) * 100 + Number(keep === '' ? '0' : keep)
  if (roundUp) paisa += 1

  return negative ? -paisa : paisa
}

/** "1,234원" — KRW has no decimals, so the minor-unit remainder is rounded away. */
export function formatMoney(paisa: number, opts?: { symbol?: boolean }): string {
  const showSymbol = opts?.symbol ?? true
  const negative = paisa < 0
  const won = Math.round(Math.abs(paisa) / 100)
  const amount = won.toLocaleString('ko-KR')
  return `${negative ? '-' : ''}${amount}${showSymbol ? WON_SUFFIX : ''}`
}

/** Amount for receipts, e.g. "금 일백이십삼만사천오백원정". */
export function moneyToWords(paisa: number): string {
  const negative = paisa < 0
  const won = Math.round(Math.abs(paisa) / 100)
  return `${negative ? '마이너스 ' : ''}금 ${integerToKorean(won)}원정`
}

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const SMALL_UNITS = ['', '십', '백', '천']
const BIG_UNITS = ['', '만', '억', '조', '경']

function integerToKorean(n: number): string {
  if (n === 0) return '영'
  let result = ''
  let bigIndex = 0
  while (n > 0) {
    const chunk = n % 10000
    if (chunk > 0) {
      let chunkText = ''
      let c = chunk
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10
        if (d > 0) chunkText = DIGITS[d] + SMALL_UNITS[i] + chunkText
        c = Math.floor(c / 10)
      }
      result = chunkText + BIG_UNITS[bigIndex] + result
    }
    n = Math.floor(n / 10000)
    bigIndex++
  }
  return result
}

function trimTrailingZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

/** Compact 원 display: "1.2천" / "3.4만" / "2.1억". No suffix by default. */
export function formatCompact(paisa: number, opts?: { symbol?: boolean }): string {
  const showSymbol = opts?.symbol ?? false
  const negative = paisa < 0
  const won = Math.abs(paisa) / 100

  let value: string
  if (won >= 100000000) {
    value = `${trimTrailingZero((won / 100000000).toFixed(1))}억`
  } else if (won >= 10000) {
    value = `${trimTrailingZero((won / 10000).toFixed(1))}만`
  } else {
    value = Math.round(won).toLocaleString('ko-KR')
  }

  return `${negative ? '-' : ''}${value}${showSymbol ? WON_SUFFIX : ''}`
}

/** 상품 가격 표시: 0원이면 "가격협의" (산업기계는 가격 상담이 일반적). */
export function formatPrice(paisa: number): string {
  return paisa > 0 ? formatMoney(paisa) : '가격협의'
}
