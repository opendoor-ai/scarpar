'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { loginAction } from '@/lib/actions/auth'
import { loginSchema, type LoginInput } from '@/lib/actions/auth-schemas'

import { SocialLoginButtons } from './social-login-buttons'

interface LoginFormProps {
  next?: string
  /** 간편로그인 실패 등 이전 화면에서 넘어온 안내 */
  initialError?: string
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(initialError ?? null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: LoginInput) {
    setFormError(null)
    startTransition(async () => {
      const result = await loginAction({ ...values, next })
      if (!result.ok) {
        setFormError(result.error)
      }
    })
  }

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'
  const forgotHref = next ? `/forgot-password?next=${encodeURIComponent(next)}` : '/forgot-password'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">로그인</CardTitle>
        <CardDescription>이메일과 비밀번호를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <SocialLoginButtons next={next} />
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@business.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>비밀번호</FormLabel>
                    <Link href={forgotHref} className="text-xs text-primary hover:underline">
                      비밀번호를 잊으셨나요?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-2 w-full" disabled={isPending}>
              {isPending ? '로그인 중…' : '로그인'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          아직 회원이 아니신가요?{' '}
          <Link href={signupHref} className="font-medium text-primary hover:underline">
회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
