// 카테고리 아이콘 — 메인 아이콘 칸 · 전체제품 허브 탭 · 모바일 카테고리 메뉴에서 똑같은 모양으로 써요.
// 관리자 → 카테고리에서 올린 "아이콘 그림"이 있으면 그 그림, 없으면 분류에 맞는 기본 아이콘을 같은 바탕 위에 그려요.
// (화면이 서버·브라우저 어디서든 그려지도록 hooks 없이 만들었어요)

import {
  Bot,
  Boxes,
  Cog,
  Cpu,
  Fan,
  FlaskConical,
  LayoutGrid,
  Package,
  Recycle,
  Tractor,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const FALLBACK: Record<string, LucideIcon> = {
  'machine-tools': Cog,
  'laser-welding': Zap,
  'automation-fa-robot': Bot,
  'packaging-logistics': Package,
  'food-pharma-cosmetic': FlaskConical,
  'plastic-mold-injection': Boxes,
  'pneumatic-hvac-energy': Fan,
  'electrical-electronics': Cpu,
  'environment-construction': Tractor,
  'tools-parts-mro': Wrench,
  'etc-used-service': Recycle,
  all: LayoutGrid,
}

/** 둥근 사각형 바탕 (모든 아이콘 공통) */
export const CATEGORY_ICON_FRAME =
  'flex aspect-square items-center justify-center overflow-hidden rounded-[28%] bg-gradient-to-b from-neutral-100 to-neutral-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] dark:from-neutral-800 dark:to-neutral-900'

export function CategoryIcon({
  slug,
  image,
  className,
}: {
  slug: string
  /** 올린 아이콘 그림 주소 (없으면 기본 아이콘) */
  image?: string | null
  className?: string
}) {
  const Icon = FALLBACK[slug] ?? Cog
  return (
    <span className={cn(CATEGORY_ICON_FRAME, className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Icon className="size-[42%] text-primary" strokeWidth={1.75} />
      )}
    </span>
  )
}
