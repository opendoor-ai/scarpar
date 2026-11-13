import { Download } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface ExportButtonProps {
  report: 'sales' | 'products' | 'delivery' | 'mushak'
  from: string
  to: string
  label?: string
}

function ExportButton({ report, from, to, label = 'CSV 내보내기' }: ExportButtonProps) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/api/export/${report}?from=${from}&to=${to}`} prefetch={false}>
        <Download className="size-4" />
        {label}
      </Link>
    </Button>
  )
}

export { ExportButton }
