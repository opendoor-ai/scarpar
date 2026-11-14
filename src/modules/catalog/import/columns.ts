// 대량 등록 양식의 칸(열) 정의와 한 줄 검사 규칙 (브라우저·서버 공용)

import type { ProductCondition } from '@/types/db'

export const MAX_IMPORT_ROWS = 500
export const MAX_IMAGES_PER_ROW = 5

/** 양식 첫 줄(제목줄). * 는 필수 */
export const IMPORT_HEADERS = [
  '상품명*',
  '1차 카테고리',
  '2차 카테고리',
  '제조사',
  '모델명',
  '상태',
  '판매가(원)',
  '제품사양',
  '간략설명',
  '상세설명',
  '태그',
  '사진주소',
  '공개여부',
] as const

export const IMPORT_EXAMPLE_ROWS: string[][] = [
  [
    '현대위아 VX650 수직머시닝센터',
    '공작기계·금속가공',
    '머시닝센터',
    '현대위아',
    'VX650',
    '중고',
    '0',
    'X축 650mm, 주축 8,000rpm, 툴 24개',
    '정밀 가공용 수직 머시닝센터, 실가동 상태 양호',
    '2018년식, 실가동 확인 가능합니다.\n방문 시연 가능.',
    '머시닝센터, 중고기계, 현대위아',
    'https://example.com/photo1.jpg | https://example.com/photo2.jpg',
    '공개',
  ],
  ['천정형 전기온풍난방기 DEC-1000H', '유공압·공조·에너지', '', '신원에너지', 'DEC-1000H', '신품', '308000', '', '', '', '온풍기, 난방기', '', '임시저장'],
]

/** 사용 안내 (양식 아래 설명용) */
export const IMPORT_GUIDE = [
  '상품명*은 꼭 입력하세요. 나머지 칸은 비워도 됩니다.',
  '카테고리는 사이트의 카테고리 이름과 똑같이 쓰세요. (예: 공작기계·금속가공 / 머시닝센터) 2차를 쓰면 1차는 비워도 됩니다.',
  '상태: 신품 / 중고 / 리퍼 중 하나',
  '판매가(원): 숫자만 (쉼표 가능). 0 또는 비우면 "가격협의"로 표시됩니다.',
  '태그: 쉼표로 구분',
  `사진주소: 인터넷 사진 주소(https://...)를 | 로 구분해 최대 ${MAX_IMAGES_PER_ROW}개. 첫 사진이 대표 사진이 됩니다.`,
  '공개여부: 공개 또는 임시저장 (비우면 임시저장 — 확인 후 공개하세요)',
  `한 번에 최대 ${MAX_IMPORT_ROWS}개까지 올릴 수 있습니다.`,
]

/** 화면·서버가 주고받는 한 줄 원본 */
export interface RawImportRow {
  line: number // 엑셀 줄 번호 (제목줄 = 1)
  cells: string[]
}

export interface ImportCategory {
  id: string
  name: string
  parent_id: string | null
}

/** 검사를 마친 한 줄 */
export interface CheckedImportRow {
  line: number
  name: string
  category_id: string | null
  categoryLabel: string | null
  brand: string | null
  model_name: string | null
  condition: ProductCondition | null
  price: number // 원 단위
  spec_summary: string | null
  short_description: string | null
  description: string | null
  tags: string[]
  images: string[]
  publish: boolean
  errors: string[] // 있으면 등록 안 함
  warnings: string[] // 등록은 하되 알려줄 것
}

const CONDITION_MAP: Record<string, ProductCondition> = {
  신품: 'new',
  새제품: 'new',
  새상품: 'new',
  중고: 'used',
  중고품: 'used',
  리퍼: 'refurbished',
  재생: 'refurbished',
  리퍼비시: 'refurbished',
}

/** 이름 비교용: 공백·가운뎃점 차이 무시 (예: "공작기계 · 금속가공" = "공작기계·금속가공") */
export function normalizeName(v: string): string {
  return v.replace(/\s+/g, '').replace(/[·•ㆍ・]/g, '·').toLowerCase()
}

/** 상품 중복 판단 키: 모델명이 있으면 모델명+상품명, 없으면 상품명 */
export function duplicateKey(name: string, model: string | null): string {
  return `${normalizeName(model ?? '')}|${normalizeName(name)}`
}

const clean = (v: string | undefined) => (v ?? '').trim()
const orNull = (v: string) => (v ? v : null)

export function checkImportRows(
  rows: RawImportRow[],
  categories: ImportCategory[],
  existingKeys: Set<string>,
): CheckedImportRow[] {
  const roots = categories.filter((c) => !c.parent_id)
  const byNormName = new Map<string, ImportCategory[]>()
  for (const c of categories) {
    const key = normalizeName(c.name)
    byNormName.set(key, [...(byNormName.get(key) ?? []), c])
  }
  const nameById = new Map(categories.map((c) => [c.id, c.name]))
  const seenInFile = new Set<string>()

  return rows.map(({ line, cells }) => {
    const errors: string[] = []
    const warnings: string[] = []
    const [name, cat1, cat2, brand, model, conditionRaw, priceRaw, spec, short, desc, tagsRaw, imagesRaw, publishRaw] =
      IMPORT_HEADERS.map((_, i) => clean(cells[i]))

    if (!name) errors.push('상품명이 비어 있어요')
    if (name.length > 200) errors.push('상품명이 200자를 넘어요')

    // 카테고리 찾기
    let category_id: string | null = null
    let categoryLabel: string | null = null
    const root = cat1 ? roots.find((r) => normalizeName(r.name) === normalizeName(cat1)) : undefined
    if (cat1 && !root) errors.push(`1차 카테고리 "${cat1}"를 찾을 수 없어요`)
    if (cat2) {
      const candidates = (byNormName.get(normalizeName(cat2)) ?? []).filter((c) => c.parent_id)
      const match = root ? candidates.find((c) => c.parent_id === root.id) : candidates[0]
      if (!match) errors.push(`2차 카테고리 "${cat2}"를 ${root ? `"${root.name}" 아래에서 ` : ''}찾을 수 없어요`)
      else {
        if (!root && candidates.length > 1) warnings.push(`"${cat2}" 2차 카테고리가 여러 개라 첫 번째로 넣었어요`)
        category_id = match.id
        categoryLabel = `${nameById.get(match.parent_id as string) ?? ''} > ${match.name}`
      }
    } else if (root) {
      category_id = root.id
      categoryLabel = root.name
    }
    if (!cat1 && !cat2) warnings.push('카테고리가 없어요 (나중에 지정 가능)')

    // 상태
    let condition: ProductCondition | null = null
    if (conditionRaw) {
      condition = CONDITION_MAP[conditionRaw.replace(/\s+/g, '')] ?? null
      if (!condition) errors.push(`상태 "${conditionRaw}"는 신품/중고/리퍼 중 하나여야 해요`)
    }

    // 가격 (원)
    let price = 0
    if (priceRaw) {
      const digits = priceRaw.replace(/[,\s원₩]/g, '')
      if (!/^\d{1,13}$/.test(digits)) errors.push(`판매가 "${priceRaw}"는 숫자만 쓸 수 있어요`)
      else price = Number(digits)
    }

    // 사진 주소
    const images = imagesRaw
      ? imagesRaw
          .split(/[|\n]/)
          .map((u) => u.trim())
          .filter(Boolean)
      : []
    const validImages: string[] = []
    for (const url of images) {
      if (/^https?:\/\/[^\s]+$/i.test(url)) validImages.push(url)
      else errors.push(`사진주소 "${url.slice(0, 40)}"는 http:// 또는 https:// 로 시작해야 해요`)
    }
    if (validImages.length > MAX_IMAGES_PER_ROW) {
      warnings.push(`사진은 ${MAX_IMAGES_PER_ROW}개까지만 넣었어요`)
      validImages.length = MAX_IMAGES_PER_ROW
    }

    // 공개 여부
    let publish = false
    if (publishRaw) {
      if (['공개', '판매중', 'y', 'yes', '1'].includes(publishRaw.toLowerCase())) publish = true
      else if (!['임시저장', '비공개', 'n', 'no', '0'].includes(publishRaw.toLowerCase()))
        errors.push(`공개여부 "${publishRaw}"는 공개 또는 임시저장이어야 해요`)
    }

    // 중복
    if (name) {
      const key = duplicateKey(name, orNull(model))
      if (existingKeys.has(key)) errors.push('이미 등록된 상품이에요 (같은 상품명·모델명)')
      else if (seenInFile.has(key)) errors.push('파일 안에 같은 상품이 두 번 있어요')
      seenInFile.add(key)
    }

    return {
      line,
      name,
      category_id,
      categoryLabel,
      brand: orNull(brand),
      model_name: orNull(model),
      condition,
      price,
      spec_summary: orNull(spec.slice(0, 500)),
      short_description: orNull(short.slice(0, 500)),
      description: orNull(desc.slice(0, 5000)),
      tags: tagsRaw
        ? tagsRaw
            .split(',')
            .map((t) => t.trim().replace(/^#/, ''))
            .filter(Boolean)
            .slice(0, 20)
        : [],
      images: validImages,
      publish,
      errors,
      warnings,
    }
  })
}
