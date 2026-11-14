'use client'

// 상품 대량 등록 화면: 양식 받기 → 파일 올리기 → 미리보기 검사 → 등록

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Download, FileUp, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { commitImportAction, previewImportAction } from '../import-actions'
import { IMPORT_EXAMPLE_ROWS, IMPORT_GUIDE, IMPORT_HEADERS, MAX_IMPORT_ROWS, type CheckedImportRow, type RawImportRow } from '../import/columns'
import { decodeCsvBytes, parseCsv, toCsv } from '../import/csv'

const CONDITION_LABEL = { new: '신품', used: '중고', refurbished: '리퍼' } as const

function downloadTemplate() {
  const blob = new Blob([toCsv([[...IMPORT_HEADERS], ...IMPORT_EXAMPLE_ROWS])], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '상품_대량등록_양식.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ProductImport() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [raw, setRaw] = useState<RawImportRow[]>([])
  const [checked, setChecked] = useState<CheckedImportRow[] | null>(null)
  const [isChecking, startChecking] = useTransition()
  const [isSaving, startSaving] = useTransition()

  const okCount = checked?.filter((r) => r.errors.length === 0).length ?? 0
  const errorCount = (checked?.length ?? 0) - okCount
  const publishCount = checked?.filter((r) => r.errors.length === 0 && r.publish).length ?? 0

  async function onFile(file: File) {
    setChecked(null)
    setFileName(file.name)
    if (!/\.csv$/i.test(file.name)) {
      toast.error('CSV 파일만 올릴 수 있어요. 엑셀에서 "다른 이름으로 저장 → CSV UTF-8"로 저장해 주세요.')
      return
    }
    const text = decodeCsvBytes(await file.arrayBuffer())
    const table = parseCsv(text)
    if (table.length < 2) {
      toast.error('제목줄 아래에 상품이 한 줄도 없어요.')
      return
    }
    const header = table[0].map((h) => h.trim())
    if (!header[0]?.startsWith('상품명')) {
      toast.error('양식의 제목줄(첫 줄)을 지우거나 바꾸지 마세요. 양식을 다시 받아 주세요.')
      return
    }
    const rows: RawImportRow[] = table.slice(1).map((cells, i) => ({ line: i + 2, cells }))
    if (rows.length > MAX_IMPORT_ROWS) {
      toast.error(`한 번에 ${MAX_IMPORT_ROWS}개까지 올릴 수 있어요. 파일을 나눠 주세요. (지금 ${rows.length}개)`)
      return
    }
    setRaw(rows)
    startChecking(async () => {
      const result = await previewImportAction(rows)
      if (!result.ok) return void toast.error(result.error)
      setChecked(result.data?.rows ?? [])
    })
  }

  function commit() {
    startSaving(async () => {
      const result = await commitImportAction(raw)
      if (!result.ok) return void toast.error(result.error)
      const { created, skipped, imageErrors } = result.data!
      toast.success(
        `${created}개 상품을 등록했어요.${skipped ? ` (오류 ${skipped}줄 제외)` : ''}${imageErrors ? ` 사진 ${imageErrors}장은 연결하지 못했어요.` : ''}`,
      )
      router.push('/admin/products')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 양식 받기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {IMPORT_GUIDE.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <div>
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" />
              엑셀 양식 받기 (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. 작성한 파일 올리기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            엑셀에서 작성 후 <strong>파일 → 다른 이름으로 저장 → &ldquo;CSV UTF-8(쉼표로 분리)&rdquo;</strong>로 저장해서
            올려 주세요. 일반 &ldquo;CSV(쉼표로 분리)&rdquo;도 읽을 수 있어요.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
              e.target.value = ''
            }}
          />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={isChecking || isSaving}>
              <FileUp className="size-4" />
              {isChecking ? '검사 중…' : 'CSV 파일 선택'}
            </Button>
            {fileName ? <span className="text-muted-foreground">{fileName}</span> : null}
          </div>
        </CardContent>
      </Card>

      {checked ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">3. 미리보기 확인 후 등록</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="success">등록 가능 {okCount}</Badge>
              {errorCount ? <Badge variant="destructive">오류 {errorCount}</Badge> : null}
              <span className="text-xs text-muted-foreground">
                (공개 {publishCount} · 임시저장 {okCount - publishCount})
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="max-h-[520px] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-14">줄</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>모델명</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">판매가</TableHead>
                    <TableHead className="text-center">사진</TableHead>
                    <TableHead>결과</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checked.map((r) => (
                    <TableRow key={r.line} className={cn(r.errors.length > 0 && 'bg-destructive/5')}>
                      <TableCell className="text-muted-foreground tabular-nums">{r.line}</TableCell>
                      <TableCell className="max-w-56 truncate font-medium">{r.name || '—'}</TableCell>
                      <TableCell className="max-w-48 truncate text-xs">{r.categoryLabel ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.model_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.condition ? CONDITION_LABEL[r.condition] : '—'}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.price > 0 ? `${r.price.toLocaleString('ko-KR')}원` : '가격협의'}
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums">{r.images.length || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.errors.length > 0 ? (
                          <span className="flex flex-col gap-0.5 text-destructive">
                            {r.errors.map((e) => (
                              <span key={e} className="flex items-start gap-1">
                                <AlertCircle className="mt-0.5 size-3 shrink-0" />
                                {e}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="size-3" />
                              {r.publish ? '공개로 등록' : '임시저장으로 등록'}
                            </span>
                            {r.warnings.map((w) => (
                              <span key={w} className="flex items-start gap-1 text-amber-600">
                                <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                                {w}
                              </span>
                            ))}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {errorCount ? (
                <p className="text-xs text-muted-foreground">오류가 있는 {errorCount}줄은 등록하지 않아요. 고쳐서 다시 올리면 돼요.</p>
              ) : null}
              <Button type="button" onClick={commit} disabled={okCount === 0 || isSaving}>
                {isSaving ? '등록 중…' : `${okCount}개 상품 등록하기`}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
