'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import type { Role } from '@/types/db'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createInviteAction } from '@/modules/staff/actions'
import { ROLE_LABELS } from './members-table'
import { inviteMemberSchema, ROLE_VALUES, type InviteMemberInput } from '@/modules/staff/schemas'

function InviteMemberDialog({ currentRole }: { currentRole: Role }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [createdLink, setCreatedLink] = React.useState<string | null>(null)

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'staff' },
  })

  const assignableRoles = ROLE_VALUES.filter((role) => role !== 'owner' || currentRole === 'owner')

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setCreatedLink(null)
      form.reset({ email: '', role: 'staff' })
      if (createdLink) router.refresh()
    }
  }

  async function onSubmit(values: InviteMemberInput) {
    const result = await createInviteAction(values)
    if (result.ok && result.data) {
      setCreatedLink(result.data.link)
      toast.success('초대 링크가 만들어졌습니다')
    } else if (!result.ok) {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus />
직원 초대
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>직원 초대</DialogTitle>
          <DialogDescription>
            {createdLink
              ? '이 링크를 초대할 분께 직접 보내 주세요. (메일 자동 발송은 아직 지원하지 않습니다)'
              : "초대를 수락하면 관리자 화면을 쓸 수 있습니다."}
          </DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-2">
              <span className="flex-1 truncate text-xs">{createdLink}</span>
              <CopyButton text={createdLink} />
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>완료</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>권한</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '만드는 중…' : '초대 링크 만들기'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { InviteMemberDialog }
