'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import type { Lesson } from '@/types/db'

import { deleteLesson, moveLesson } from '../actions'
import { LessonDialog } from './lesson-dialog'

interface LessonsSectionProps {
  courseId: string
  lessons: Lesson[]
}

function LessonsSection({ courseId, lessons }: LessonsSectionProps) {
  const [dialogLesson, setDialogLesson] = useState<Lesson | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  async function handleMove(lessonId: string, direction: 'up' | 'down') {
    const result = await moveLesson(lessonId, courseId, direction)
    if (!result.ok) toast.error(result.error)
  }

  async function handleDelete(lessonId: string) {
    const result = await deleteLesson(lessonId, courseId)
    if (result.ok) toast.success('수업이 삭제되었습니다')
    else toast.error(result.error)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>수업 목록</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus />
          수업 추가
        </Button>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <EmptyState icon={PlayCircle} title="아직 수업이 없습니다" description="첫 수업을 추가하세요." />
        ) : (
          <ul className="flex flex-col gap-2">
            {lessons.map((lesson, index) => (
              <li key={lesson.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <PlayCircle className="text-muted-foreground size-4 shrink-0" />
                  <span className="text-foreground truncate text-[13px] font-medium">{lesson.title}</span>
                  {lesson.is_free ? (
                    <Badge variant="outline" className="shrink-0">
                      무료
                    </Badge>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => handleMove(lesson.id, 'up')}
                  >
                    <ArrowUp />
                    <span className="sr-only">위로</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === lessons.length - 1}
                    onClick={() => handleMove(lesson.id, 'down')}
                  >
                    <ArrowDown />
                    <span className="sr-only">아래로</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDialogLesson(lesson)}>
                    <Pencil />
                    <span className="sr-only">수업 수정</span>
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 />
                        <span className="sr-only">수업 삭제</span>
                      </Button>
                    }
                    title="수업을 삭제할까요?"
                    description={`"${lesson.title}" will be permanently removed.`}
                    confirmLabel="삭제"
                    destructive
                    onConfirm={() => handleDelete(lesson.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <LessonDialog courseId={courseId} open={addOpen} onOpenChange={setAddOpen} />
      <LessonDialog
        courseId={courseId}
        lesson={dialogLesson ?? undefined}
        open={dialogLesson !== null}
        onOpenChange={(open) => !open && setDialogLesson(null)}
      />
    </Card>
  )
}

export { LessonsSection }
