'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Mail } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { signupAction } from '@/lib/actions/auth'
import { signupSchema, type SignupInput } from '@/lib/actions/auth-schemas'

import { SocialLoginButtons } from './social-login-buttons'

interface SignupFormProps {
  next?: string
}

export function SignupForm({ next }: SignupFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: '', email: '', password: '' },
  })

  function onSubmit(values: SignupInput) {
    setFormError(null)
    startTransition(async () => {
      const result = await signupAction({ ...values, next })
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      if (result.data?.needsEmailConfirmation) {
        setSubmittedEmail(values.email)
      }
    })
  }

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  if (submittedEmail) {
    return (
      <Card>
        <CardContent className="py-4">
          <EmptyState
            icon={Mail}
            title="메일함을 확인하세요"
            description={`${submittedEmail}(으)로 인증 링크를 보냈습니다. 링크를 열면 가입이 완료됩니다.`}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">회원가입</CardTitle>
        <CardDescription>몇 분이면 우리 회사 홈페이지를 시작할 수 있습니다.</CardDescription>
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
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="홍길동" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormLabel>비밀번호 (8자 이상)</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-2 w-full" disabled={isPending}>
              {isPending ? '가입 중…' : '가입하기'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          이미 회원이신가요?{' '}
          <Link href={loginHref} className="font-medium text-primary hover:underline">
로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
