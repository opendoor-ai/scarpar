"use client"

import * as React from "react"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PrintButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "onClick"> {
  label?: string
}

function PrintButton({ label = "인쇄", ...props }: PrintButtonProps) {
  return (
    <Button
      type="button"
      data-slot="print-button"
      onClick={() => window.print()}
      {...props}
    >
      <Printer className="size-4" />
      {label}
    </Button>
  )
}

export { PrintButton }
