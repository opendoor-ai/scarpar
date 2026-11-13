"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CopyButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick" | "children"> {
  text: string
}

function CopyButton({ text, className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard write failed (unsupported browser or denied permission);
      // no feedback shown beyond the icon staying in its default state.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="copy-button"
      onClick={handleCopy}
      className={cn("size-7", className)}
      {...props}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span className="sr-only">복사</span>
    </Button>
  )
}

export { CopyButton }
