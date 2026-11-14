"use client"

import * as React from "react"

import { formatCompact, formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * 값 표시 형식. 서버 화면에서는 함수를 넘길 수 없으므로(브라우저 전용 부품) 이름으로 고릅니다.
 * - "won": 1,234원  - "compactWon": 1.2만원  - "count": 1,234회
 */
type ValueFormat = "won" | "compactWon" | "count"

const FORMATTERS: Record<ValueFormat, (value: number) => string> = {
  won: (v) => formatMoney(v),
  compactWon: (v) => formatCompact(v, { symbol: true }),
  count: (v) => `${v.toLocaleString("ko-KR")}회`,
}

interface MiniBarChartProps {
  data: { label: string; value: number }[]
  height?: number
  /** 브라우저 화면에서만 쓸 수 있는 직접 지정 형식 */
  formatValue?: (value: number) => string
  /** 서버 화면에서도 쓸 수 있는 형식 이름 */
  valueFormat?: ValueFormat
  className?: string
}

function roundedTopBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h))
  return `M ${x} ${y + h} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + w - radius} ${y} Q ${x + w} ${y} ${x + w} ${y + radius} L ${x + w} ${y + h} Z`
}

function MiniBarChart({
  data,
  height = 120,
  formatValue: formatValueProp,
  valueFormat,
  className,
}: MiniBarChartProps) {
  const formatValue = formatValueProp ?? (valueFormat ? FORMATTERS[valueFormat] : (value: number) => String(value))
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = data.length > 0 ? 100 / data.length : 100
  const axisSpace = 2 // 날짜 글자는 이제 그래프 아래(HTML)에 표시

  return (
    <div data-slot="mini-bar-chart" className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="막대 그래프"
      >
        {data.map((d, i) => {
          const barHeight = Math.max(
            (d.value / max) * (height - axisSpace - 4),
            1
          )
          const barWidth = slot * 0.6
          const x = i * slot + (slot - barWidth) / 2
          const y = height - axisSpace - barHeight
          return (
            <g key={`${d.label}-${i}`}>
              <path
                d={roundedTopBarPath(x, y, barWidth, barHeight, 2)}
                className="fill-primary"
              >
                {/* React 19: <title> 안에는 글자 하나(문자열)만 넣어야 함 */}
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </path>
            </g>
          )
        })}
      </svg>
      {/* 아래 날짜·이름 글자: SVG 밖에 두어 찌그러지지 않게, 막대가 많으면 일부만 표시 */}
      <div className="flex text-[10px] leading-none text-muted-foreground">
        {data.map((d, i) => {
          const step = Math.max(1, Math.ceil(data.length / 8))
          const show = data.length <= 12 || i % step === 0 || i === data.length - 1
          return (
            <span key={`${d.label}-${i}`} className="flex-1 truncate text-center" style={{ minWidth: 0 }}>
              {show ? d.label : ""}
            </span>
          )
        })}
      </div>
    </div>
  )
}

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
}

function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  const max = Math.max(...data, 0)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data
    .map((value, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg
      data-slot="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("text-primary overflow-visible", className)}
      role="img"
      aria-label="추이 그래프"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { MiniBarChart, Sparkline }
