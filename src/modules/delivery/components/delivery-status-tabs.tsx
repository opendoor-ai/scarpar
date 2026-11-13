"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DeliveryStatus } from "@/lib/status"

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "assigned", label: "배정됨" },
  { value: "picked_up", label: "집하 완료" },
  { value: "in_transit", label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
  { value: "failed", label: "실패" },
  { value: "returned", label: "반송" },
]

interface DeliveryStatusTabsProps {
  counts: Partial<Record<DeliveryStatus | "all", number>>
}

/** URL-driven status filter (?status=) for the deliveries list — server page re-queries per tab. */
function DeliveryStatusTabs({ counts }: DeliveryStatusTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get("status") ?? "all"

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Tabs value={active} onValueChange={handleChange}>
      <TabsList>
        {TABS.map((tab) => {
          const count = counts[tab.value as DeliveryStatus | "all"]
          return (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {typeof count === "number" ? (
                <span className="text-muted-foreground ml-1 text-[11px] tabular-nums">{count}</span>
              ) : null}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

export { DeliveryStatusTabs }
