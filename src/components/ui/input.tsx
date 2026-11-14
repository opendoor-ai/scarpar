import * as React from "react"

import { formatPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

/**
 * 기본 입력칸. type="tel" 이면 전화번호 하이픈을 자동으로 넣어요 (010-1234-5678).
 */
function Input({ className, type, onChange, ...props }: React.ComponentProps<"input">) {
  const handleChange =
    type === "tel"
      ? (event: React.ChangeEvent<HTMLInputElement>) => {
          const formatted = formatPhone(event.target.value)
          if (formatted !== event.target.value) event.target.value = formatted
          onChange?.(event)
        }
      : onChange
  return (
    <input
      type={type}
      inputMode={type === "tel" ? "tel" : props.inputMode}
      data-slot="input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-[13px] shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Input }
