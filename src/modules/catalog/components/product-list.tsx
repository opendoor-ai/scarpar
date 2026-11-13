'use client'

// Products list DataTable + status-filter tabs. Rows are pre-joined by
// src/app/(admin)/admin/products/page.tsx (server) — this component only
// renders + navigates.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money'
import { mediaUrl } from '@/lib/media-url'
import type { ProductStatus } from '@/types/db'

export interface ProductListRow {
  id: string
  name: string
  status: ProductStatus
  price: number
  track_stock: boolean
  stock_qty: number
  low_stock_threshold: number
  updated_at: string
  categoryName: string | null
  variantCount: number
  minVariantPrice: number | null
  thumbPath: string | null
}

const STATUS_TABS: { value: 'all' | ProductStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '판매중' },
  { value: 'draft', label: '임시저장' },
  { value: 'archived', label: '보관' },
]

function ProductStatusTabs({ current }: { current: 'all' | ProductStatus }) {
  return (
    <div className="flex items-center gap-1">
      {STATUS_TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === 'all' ? '/admin/products' : `/admin/products?status=${tab.value}`}
          className={cn(
            'rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors',
            current === tab.value
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

function StockCell({ row }: { row: ProductListRow }) {
  if (!row.track_stock) return <span className="text-muted-foreground">—</span>
  if (row.stock_qty <= 0) return <Badge variant="destructive">품절</Badge>
  if (row.stock_qty <= row.low_stock_threshold) {
    return (
      <span className="flex items-center justify-end gap-1.5 tabular-nums">
        {row.stock_qty}
        <Badge variant="warning">부족</Badge>
      </span>
    )
  }
  return <span className="tabular-nums">{row.stock_qty}</span>
}

const columns: ColumnDef<ProductListRow>[] = [
  {
    id: 'thumb',
    header: '',
    cell: ({ row }) => {
      const path = row.original.thumbPath
      return path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(path)} alt="" className="border-border size-8 rounded-md border object-cover" />
      ) : (
        <div className="bg-muted size-8 rounded-md" />
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: '상품명',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.variantCount > 0 ? (
          <Badge variant="outline">{row.original.variantCount} variants</Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'categoryName',
    header: '카테고리',
    cell: ({ row }) => row.original.categoryName ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'price',
    header: () => <div className="text-right">가격</div>,
    cell: ({ row }) => {
      const { variantCount, minVariantPrice, price } = row.original
      return (
        <div className="text-right tabular-nums">
          {variantCount > 0 && minVariantPrice != null ? `${formatMoney(minVariantPrice)}~` : formatMoney(price)}
        </div>
      )
    },
  },
  {
    accessorKey: 'stock_qty',
    header: () => <div className="text-right">재고</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <StockCell row={row.original} />
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => <StatusBadge kind="product" value={row.original.status} />,
  },
  {
    accessorKey: 'updated_at',
    header: '수정일',
    cell: ({ row }) => new Date(row.original.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
]

interface ProductListProps {
  products: ProductListRow[]
  status: 'all' | ProductStatus
}

function ProductList({ products, status }: ProductListProps) {
  const router = useRouter()

  return (
    <DataTable
      columns={columns}
      data={products}
      searchKey="name"
      searchPlaceholder="상품 검색..."
      toolbar={<ProductStatusTabs current={status} />}
      onRowClick={(row) => router.push(`/admin/products/${row.id}`)}
    />
  )
}

export { ProductList }
