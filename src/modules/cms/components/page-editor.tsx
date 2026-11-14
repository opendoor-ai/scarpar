'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ExternalLink, LayoutTemplate } from 'lucide-react'

import type { CmsBlock, CmsPage } from '@/types/db'
import { discardDraftAction, publishAction, saveDraftAction, updatePageTitleAction } from '@/modules/cms/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BlockEditor } from './block-editor'
import { RevisionHistory, type RevisionRow } from './revision-history'
import type { CategoryOption } from './block-meta'
import { PAGE_TEMPLATES, type PageTemplate } from './templates'

interface PageEditorProps {
  page: CmsPage
  orgSlug: string
  orgName: string
  categories: CategoryOption[]
  revisions: RevisionRow[]
}

function PageEditor({ page, orgSlug, orgName, categories, revisions }: PageEditorProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState(page.title)
  const [blocks, setBlocks] = React.useState<CmsBlock[]>(page.draft_blocks ?? page.blocks)
  const [dirty, setDirty] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [pendingTemplate, setPendingTemplate] = React.useState<PageTemplate | null>(null)
  const [editorVersion, setEditorVersion] = React.useState(0)

  function applyTemplate(template: PageTemplate) {
    setBlocks(template.build(orgName))
    setDirty(true)
    setEditorVersion((v) => v + 1)
    toast.success(`'${template.name}' 템플릿을 채웠어요. 글·사진을 바꾼 뒤 임시저장 → 게시하기를 눌러 주세요.`)
  }

  const hasDraft = page.draft_blocks !== null || dirty
  // Best-effort storefront URL — this slice doesn't own the (store) route implementation, so the
  // exact path for non-home pages is inferred (/minishop/[org]/[slug]) rather than confirmed against it.
  const viewHref = page.type === 'home' ? `/minishop/${orgSlug}` : `/minishop/${orgSlug}/${page.slug}`

  function handleBlocksChange(next: CmsBlock[]) {
    setBlocks(next)
    setDirty(true)
  }

  async function handleTitleBlur() {
    if (title.trim() === page.title || !title.trim()) {
      setTitle(page.title)
      return
    }
    const result = await updatePageTitleAction({ pageId: page.id, title: title.trim() })
    if (!result.ok) {
      toast.error(result.error)
      setTitle(page.title)
      return
    }
    router.refresh()
  }

  async function handleSaveDraft() {
    setSaving(true)
    const result = await saveDraftAction({ pageId: page.id, blocks })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setDirty(false)
    toast.success('임시저장되었습니다.')
    router.refresh()
  }

  async function handlePublish() {
    const result = await publishAction({ pageId: page.id })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('페이지가 게시되었습니다.')
    router.refresh()
  }

  async function handleDiscard() {
    const result = await discardDraftAction({ pageId: page.id })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setBlocks(page.blocks)
    setDirty(false)
    toast.success('임시저장본을 버렸습니다.')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cms/pages"
              className="-ml-1 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">뒤로</span>
            </Link>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="h-8 max-w-md border-transparent bg-transparent px-1.5 text-xl font-semibold shadow-none hover:border-input focus-visible:border-ring"
            />
            <Badge variant={page.status === 'published' ? 'success' : 'secondary'}>
              {page.status === 'published' ? '게시됨' : '임시저장'}
            </Badge>
            {hasDraft && page.status === 'published' ? <Badge variant="warning">게시 안 된 변경사항</Badge> : null}
          </div>
          <p className="pl-8 text-sm text-muted-foreground">/{page.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {page.status === 'published' ? (
            <Button variant="outline" asChild>
              <Link href={viewHref} target="_blank">
                <ExternalLink className="size-4" />
미리보기
              </Link>
            </Button>
          ) : null}
          {hasDraft ? (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline">
임시저장본 버리기
                </Button>
              }
              title="임시저장본을 버릴까요?"
              description="마지막으로 게시한 버전으로 돌아갑니다. 되돌릴 수 없습니다."
              confirmLabel="버리기"
              destructive
              onConfirm={handleDiscard}
            />
          ) : null}
          <Button type="button" variant="secondary" disabled={saving} onClick={handleSaveDraft}>
            {saving ? '저장 중...' : '임시저장'}
          </Button>
          <ConfirmDialog
            trigger={<Button type="button">게시하기</Button>}
            title="이 페이지를 게시할까요?"
            description="임시저장본이 고객에게 보이는 실제 페이지가 됩니다."
            confirmLabel="게시"
            onConfirm={handlePublish}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3">
        <span className="text-sm text-muted-foreground">처음이라면 템플릿으로 시작해 보세요.</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <LayoutTemplate className="size-4" />
              템플릿 적용
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>기계 공급사용 템플릿</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PAGE_TEMPLATES.map((t) => (
              <DropdownMenuItem key={t.id} onSelect={() => setPendingTemplate(t)} className="flex-col items-start gap-0.5">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={pendingTemplate !== null}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
        title={`'${pendingTemplate?.name ?? ''}' 템플릿으로 바꿀까요?`}
        description="지금 편집 중인 블록이 템플릿 구성으로 바뀝니다. 아직 게시한 페이지에는 영향이 없고, 마음에 들지 않으면 '임시저장본 버리기'로 되돌릴 수 있어요."
        confirmLabel="바꾸기"
        onConfirm={() => {
          if (pendingTemplate) applyTemplate(pendingTemplate)
          setPendingTemplate(null)
        }}
      />

      <BlockEditor key={editorVersion} blocks={blocks} onChange={handleBlocksChange} categories={categories} />

      <RevisionHistory pageId={page.id} revisions={revisions} />
    </div>
  )
}

export { PageEditor }
