'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getBrowserClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/actions/auth-schemas'

/**
 * Supabase password-recovery completion. The reset-link email points here with a recovery
 * token in the URL hash; the browser client (detectSessionInUrl, on by default) exchanges it
 * for a session automatically and fires a PASSWORD_RECOVERY auth event — we listen for that
 * (and check getSession() in case it already resolved before mount) rather than parsing the
 * hash ourselves. Per docs/conventions.md, auth forms are the one place the browser Supabase
 * client is used directly instead of a server action.
 */
export function ResetPasswordForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    const supabase = getBrowserClient()

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true)
        setChecking(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  function onSubmit(values: ResetPasswordInput) {
    setFormError(null)
    startTransition(async () => {
      const supabase = getBrowserClient()
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) {
        setFormError(error.message)
        return
      }
      toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.')
      router.push('/login')
    })
  }

  if (checking) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">재설정 링크 확인 중…</p>
        </CardContent>
      </Card>
    )
  }

  if (!sessionReady) {
    return (
      <Card>
        <CardContent className="py-4">
          <EmptyState
            icon={KeyRound}
            title="링크가 만료되었거나 올바르지 않습니다"
            description="이 비밀번호 재설정 링크는 더 이상 쓸 수 없습니다. 새 링크를 요청하세요."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/forgot-password">새 링크 요청</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">새 비밀번호 설정</CardTitle>
        <CardDescription>사용할 새 비밀번호를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>새 비밀번호</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-2 w-full" disabled={isPending}>
              {isPending ? '변경 중…' : '비밀번호 변경'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
