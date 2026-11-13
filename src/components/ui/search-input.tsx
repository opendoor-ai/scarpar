"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface SearchInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

function SearchInput({
  value,
  onChange,
  debounceMs = 300,
  className,
  placeholder = "검색...",
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(value)

  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (internalValue !== value) onChange(internalValue)
    }, debounceMs)
    return () => clearTimeout(handle)
    // Intentionally omits `value`/`onChange` from deps: this effect only
    // fires the debounced callback in response to local typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalValue, debounceMs])

  return (
    <div data-slot="search-input" className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        value={internalValue}
        onChange={(event) => setInternalValue(event.target.value)}
        placeholder={placeholder}
        className={cn("pl-8", className)}
        {...props}
      />
    </div>
  )
}

export { SearchInput }
