"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/lib/i18n"

/** Centered search box on /track — pushes to /track/[code]. */
function TrackSearchForm() {
  const router = useRouter()
  const [code, setCode] = React.useState("")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = code.trim()
    if (trimmed) router.push(`/track/${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <Input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="DLV-00001 또는 송장 번호"
        aria-label={t("track_order")}
        autoFocus
      />
      <Button type="submit">
        <Search className="size-4" />
        {t("track_order")}
      </Button>
    </form>
  )
}

export { TrackSearchForm }
