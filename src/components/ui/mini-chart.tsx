"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface MiniBarChartProps {
  data: { label: string; value: number }[]
  height?: number
  formatValue?: (value: number) => string
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
  formatValue = (value) => String(value),
  className,
}: MiniBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = data.length > 0 ? 100 / data.length : 100
  const axisSpace = 14

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
                <title>
                  {d.label}: {formatValue(d.value)}
                </title>
              </path>
              <text
                x={i * slot + slot / 2}
                y={height - 3}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
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
