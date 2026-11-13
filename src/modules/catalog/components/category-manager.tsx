'use client'

// Category list + create/edit dialog + delete (docs brief: "simple two-pane").
// src/app/(admin)/admin/categories/page.tsx (server) fetches rows + counts;
// this component owns all the interaction.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { slugify } from '@/lib/utils'

import { createCategory, deleteCategory, updateCategory } from '../actions'
import { categorySchema, type CategoryInput } from '../schemas'

export interface CategoryRow {
  id: string
  name: string
  slug: string
  parentId: string | null
  parentName: string | null
  sortOrder: number
  productCount: number
}

const NONE_PARENT = '__none__'

interface CategoryManagerProps {
  categories: CategoryRow[]
}

function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', parent_id: null },
  })

  function openCreate() {
    setEditing(null)
    setSlugTouched(false)
    form.reset({ name: '', slug: '', parent_id: null })
    setDialogOpen(true)
  }

  function openEdit(row: CategoryRow) {
    setEditing(row)
    setSlugTouched(true)
    form.reset({ name: row.name, slug: row.slug, parent_id: row.parentId })
    setDialogOpen(true)
  }

  function handleNameChange(value: string) {
    form.setValue('name', value)
    if (!slugTouched) form.setValue('slug', slugify(value), { shouldValidate: true })
  }

  async function onSubmit(values: CategoryInput) {
    setIsSubmitting(true)
    try {
      const result = editing ? await updateCategory(editing.id, values) : await createCategory(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? '카테고리가 수정되었습니다' : '카테고리가 추가되었습니다')
      setDialogOpen(false)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(row: CategoryRow) {
    const result = await deleteCategory(row.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('카테고리가 삭제되었습니다')
    router.refresh()
  }

  // Excludes the category being edited so it can't become its own parent.
  const parentOptions = categories.filter((c) => c.id !== editing?.id)

  const columns: ColumnDef<CategoryRow>[] = [
    { accessorKey: 'name', header: '이름' },
    { accessorKey: 'slug', header: '주소(영문)' },
    {
      accessorKey: 'parentName',
      header: '상위 카테고리',
      cell: ({ row }) => row.original.parentName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'productCount',
      header: () => <div className="text-right">상품 수</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.original.productCount}</div>,
    },
    {
      accessorKey: 'sortOrder',
      header: () => <div className="text-right">순서</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.original.sortOrder}</div>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="icon">
                <Trash2 className="text-destructive size-4" />
              </Button>
            }
            title={`"${row.original.name}" 카테고리를 삭제할까요?`}
            description="하위 카테고리와 상품은 그대로 남고, 카테고리만 비게 됩니다."
            confirmLabel="삭제"
            destructive
            onConfirm={() => handleDelete(row.original)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
새 카테고리
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="아직 카테고리가 없습니다"
          description="고객이 종류별로 찾아볼 수 있게 상품을 분류하세요."
          action={
            <Button type="button" onClick={openCreate}>
    새 카테고리
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} data={categories} searchKey="name" searchPlaceholder="카테고리 검색..." />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '카테고리 수정' : '새 카테고리'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input {...field} onChange={(e) => handleNameChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소(영문)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          setSlugTouched(true)
                          field.onChange(e)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>상위 카테고리</FormLabel>
                    <Select
                      value={field.value ?? NONE_PARENT}
                      onValueChange={(v) => field.onChange(v === NONE_PARENT ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_PARENT}>없음 (최상위)</SelectItem>
                        {parentOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : editing ? '변경사항 저장' : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { CategoryManager }
