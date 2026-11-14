// 엑셀에서 저장한 CSV 파일 읽기·만들기 (브라우저·서버 공용)
// - 따옴표("") 안의 쉼표·줄바꿈도 올바르게 처리합니다.
// - 엑셀 "CSV UTF-8" 과 일반 "CSV(쉼표로 분리)"(한글 윈도우는 EUC-KR) 둘 다 읽을 수 있습니다.

/** CSV 글자 → 2차원 배열 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const s = text.replace(/^﻿/, '') // BOM 제거

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // 완전히 빈 줄 제거
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** 2차원 배열 → CSV 글자 (엑셀에서 한글이 깨지지 않도록 BOM 포함) */
export function toCsv(rows: string[][]): string {
  const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return '﻿' + rows.map((r) => r.map(escape).join(',')).join('\r\n')
}

/** 파일 바이트 → 글자. UTF-8로 먼저 읽고, 깨지면 한글 윈도우 엑셀 기본값(EUC-KR)으로 다시 읽음 */
export function decodeCsvBytes(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('euc-kr').decode(bytes)
  }
}
