'use client'

import { format } from 'date-fns'
import { ScrollText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface AuditRow {
  id: number
  createdAt: string
  actorLabel: string
  action: string
  entity: string
  entityIdShort: string | null
  before: unknown
  after: unknown
}

function DiffPreview({ row }: { row: AuditRow }) {
  const hasDiff = row.before !== null || row.after !== null

  if (!hasDiff) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
보기
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-2xs font-medium tracking-wide text-muted-foreground uppercase">
변경 전
            </p>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
              {row.before === null ? 'null' : JSON.stringify(row.before, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-2xs font-medium tracking-wide text-muted-foreground uppercase">
변경 후
            </p>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
              {row.after === null ? 'null' : JSON.stringify(row.after, null, 2)}
            </pre>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="아직 활동 기록이 없습니다"
        description="설정, 직원, 회사 정보를 바꾸면 여기에 기록됩니다."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>처리자</TableHead>
            <TableHead>작업</TableHead>
            <TableHead>대상</TableHead>
            <TableHead className="text-right">상세</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground">
                {format(new Date(row.createdAt), 'MM.dd HH:mm')}
              </TableCell>
              <TableCell>{row.actorLabel}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.action}</Badge>
              </TableCell>
              <TableCell>
                <span className="font-medium">{row.entity}</span>
                {row.entityIdShort ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">{row.entityIdShort}</span>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                <DiffPreview row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { AuditTable }
