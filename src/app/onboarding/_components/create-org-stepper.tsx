'use client'

// 공급사 생성 (플랫폼 관리자 전용) — 공급사명 · 공급사 아이디(미니샵 주소) · 대표 전화번호
// 일반 회원은 "공급사 입점 신청"을 쓰고, 승인되면 자동으로 만들어져요.

import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createOrgAction } from '@/lib/actions/onboarding'
import { createOrgSchema, type CreateOrgInput } from '@/lib/actions/onboarding-schemas'

/** 공급사 아이디: 영문 소문자·숫자·하이픈만 (한글은 빼고, 공백은 하이픈으로) */
function toSupplierId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
}

interface CreateOrgStepperProps {
  heading: string
}

export function CreateOrgStepper({ heading }: CreateOrgStepperProps) {
  const [idTouched, setIdTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // 화면 준비(하이드레이션)가 끝나기 전에 입력하면 값이 사라질 수 있어서, 준비될 때까지 잠깐 잠가 둬요
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  const form = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    mode: 'onTouched',
    defaultValues: { name: '', slug: '', phone: '', vertical: 'ecommerce', seedDemo: false, ownerEmail: '', ownerPassword: '' },
  })
  const slug = form.watch('slug')

  function onSubmit(values: CreateOrgInput) {
    setFormError(null)
    startTransition(async () => {
      const result = await createOrgAction(values)
      if (!result.ok) setFormError(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{heading}</CardTitle>
        <CardDescription>공급사 기본 정보를 입력하세요. 만든 뒤 공급사 관리에서 등급·운영 상태를 바꿀 수 있어요.</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <fieldset disabled={!ready || isPending} className="flex flex-col gap-5">
              {formError ? (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>공급사명</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: 한일기계"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          // 이름이 영문이면 아이디를 자동으로 채워 줌 (한글 이름이면 직접 입력)
                          if (!idTouched) {
                            const auto = toSupplierId(e.target.value).replace(/^-+|-+$/g, '')
                            form.setValue('slug', auto, { shouldValidate: form.formState.isSubmitted })
                          }
                        }}
                      />
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
                    <FormLabel>공급사 아이디 (영문)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: hanil-machine"
                        autoComplete="off"
                        {...field}
                        onChange={(e) => {
                          setIdTouched(true)
                          field.onChange(toSupplierId(e.target.value))
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      미니샵 주소가 돼요: <b className="text-foreground">/minishop/{slug || '아이디'}</b> · 영문 소문자·숫자·하이픈(-)만 쓸 수
                      있고, 나중에 바꾸기 어려워요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 전화번호</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="010-1234-5678" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormDescription>숫자만 입력해도 하이픈(-)이 자동으로 들어가요.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <div>
                  <p className="text-sm font-semibold">공급사 로그인 계정 (선택)</p>
                  <p className="text-xs text-muted-foreground">
                    적으면 공급사가 이 이메일로 직접 로그인해서 자기 관리자 화면을 써요. 비워 두면 지금 계정이 대표가 되고, 나중에 공급사 관리 → 로그인 계정에서 추가할 수 있어요.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>로그인 이메일</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="supplier@example.com" autoComplete="off" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>초기 비밀번호 (새 계정일 때, 8자 이상)</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" className="bg-background" {...field} />
                      </FormControl>
                      <FormDescription>이미 가입한 이메일이면 비워 두세요. 그 계정을 공급사 대표로 연결해요.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="mt-1 w-full" disabled={!ready || isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isPending ? '만드는 중…' : '공급사 생성'}
              </Button>
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
