import { Clock, Percent, Truck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CodDistrictRow, DeliveryPerformanceResult } from '@/modules/reports/queries'

interface DeliveryTabProps {
  performance: DeliveryPerformanceResult
  codByDistrict: CodDistrictRow[]
}

function rateVariant(rate: number): 'success' | 'warning' | 'destructive' {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'warning'
  return 'destructive'
}

function DeliveryTab({ performance, codByDistrict }: DeliveryTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="평균 배송 시간"
          value={performance.avgHours !== null ? `${performance.avgHours.toFixed(1)}시간` : '—'}
          icon={Clock}
          hint="Assigned to delivered"
        />
        <StatCard
          label="실패율"
          value={`${performance.failureRate.toFixed(1)}%`}
          icon={Percent}
          hint="Of delivered + failed"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-foreground">지역별 착불 성공률</p>
        {codByDistrict.length === 0 ? (
          <EmptyState icon={Truck} title="이 기간에 배송이 없습니다" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>지역</TableHead>
                  <TableHead className="text-right">완료</TableHead>
                  <TableHead className="text-right">실패</TableHead>
                  <TableHead className="text-right">성공률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codByDistrict.map((row) => (
                  <TableRow key={row.district}>
                    <TableCell className="font-medium">{row.district}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.delivered}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.failed}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rateVariant(row.rate)}>{row.rate.toFixed(0)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-foreground">배송기사별</p>
          {performance.byRider.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">이 기간에 배송기사 배송이 없습니다.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>배송기사</TableHead>
                    <TableHead className="text-right">완료</TableHead>
                    <TableHead className="text-right">실패</TableHead>
                    <TableHead className="text-right">평균 시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.byRider.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.delivered}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.failed}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.avgHours !== null ? row.avgHours.toFixed(1) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-foreground">택배사별</p>
          {performance.byCourier.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">이 기간에 택배 배송이 없습니다.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>택배사</TableHead>
                    <TableHead className="text-right">완료</TableHead>
                    <TableHead className="text-right">실패</TableHead>
                    <TableHead className="text-right">평균 시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.byCourier.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium capitalize">{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.delivered}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.failed}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.avgHours !== null ? row.avgHours.toFixed(1) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { DeliveryTab }
