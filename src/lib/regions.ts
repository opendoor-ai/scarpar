// 대한민국 시·도 (주소 입력, 배송 지역 delivery_zones.districts, customer_addresses.district 에 사용)

export const REGION_GROUPS = ['수도권', '강원', '충청', '호남', '영남', '제주'] as const

export type RegionGroup = (typeof REGION_GROUPS)[number]

export interface Region {
  name: string
  division: RegionGroup
}

/** 17개 시·도 */
export const REGIONS: Region[] = [
  { name: '서울특별시', division: '수도권' },
  { name: '인천광역시', division: '수도권' },
  { name: '경기도', division: '수도권' },
  { name: '강원특별자치도', division: '강원' },
  { name: '대전광역시', division: '충청' },
  { name: '세종특별자치시', division: '충청' },
  { name: '충청북도', division: '충청' },
  { name: '충청남도', division: '충청' },
  { name: '광주광역시', division: '호남' },
  { name: '전북특별자치도', division: '호남' },
  { name: '전라남도', division: '호남' },
  { name: '부산광역시', division: '영남' },
  { name: '대구광역시', division: '영남' },
  { name: '울산광역시', division: '영남' },
  { name: '경상북도', division: '영남' },
  { name: '경상남도', division: '영남' },
  { name: '제주특별자치도', division: '제주' },
]

/** 수도권 (서울·인천·경기) — 배송 구역 빠른 선택용 */
export const CAPITAL_AREA = new Set(['서울특별시', '인천광역시', '경기도'])
