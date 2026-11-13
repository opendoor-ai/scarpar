'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { GraduationCap } from 'lucide-react'

import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatMoney } from '@/lib/money'
import { mediaUrl } from '@/lib/media-url'

import type { CourseListRow } from '../schemas'

interface CoursesTableProps {
  courses: CourseListRow[]
}

function CoursesTable({ courses }: CoursesTableProps) {
  const router = useRouter()

  const columns = useMemo<ColumnDef<CourseListRow>[]>(
    () => [
      {
        id: 'cover',
        header: '',
        cell: ({ row }) => {
          const cover = row.original.cover
          return cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(cover.path)} alt="" className="size-8 rounded-md border object-cover" />
          ) : (
            <div className="bg-muted flex size-8 items-center justify-center rounded-md border">
              <GraduationCap className="text-muted-foreground size-4" />
            </div>
          )
        },
      },
      {
        accessorKey: 'title',
        header: '강의명',
        cell: ({ row }) => <span className="text-foreground font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'price',
        header: () => <div className="text-right">가격</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{formatMoney(row.original.price)}</div>
        ),
      },
      {
        accessorKey: 'lessons_count',
        header: () => <div className="text-right">수업 수</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.lessons_count}</div>,
      },
      {
        accessorKey: 'enrollments_count',
        header: () => <div className="text-right">수강생 수</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.enrollments_count}</div>,
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ row }) => <StatusBadge kind="product" value={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={courses}
      searchKey="title"
      searchPlaceholder="Search courses..."
      onRowClick={(course) => router.push(`/admin/courses/${course.id}`)}
    />
  )
}

export { CoursesTable }
