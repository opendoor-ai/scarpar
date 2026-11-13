'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createOrgAction } from '@/lib/actions/onboarding'
import { createOrgSchema, type CreateOrgInput } from '@/lib/actions/onboarding-schemas'
import { getIcon } from '@/lib/icon-map'
import { cn, slugify } from '@/lib/utils'
import { VERTICAL_PRESETS } from '@/modules/verticals'
import type { Vertical } from '@/types/db'

const VERTICALS = Object.entries(VERTICAL_PRESETS) as [Vertical, (typeof VERTICAL_PRESETS)[Vertical]][]

interface CreateOrgStepperProps {
  heading: string
}

/**
 * Single RHF instance spanning both steps, fields CSS-hidden (not unmounted)
 * between steps so nothing gets deregistered when stepping back and forth.
 */
export function CreateOrgStepper({ heading }: CreateOrgStepperProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [slugTouched, setSlugTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: '',
      slug: '',
      phone: '',
      vertical: 'ecommerce',
      seedDemo: true,
    },
  })

  async function goToStep2(): Promise<void> {
    const valid = await form.trigger(['name', 'slug', 'phone'])
    if (valid) setStep(2)
  }

  function onSubmit(values: CreateOrgInput) {
    // The only <button type="submit"> lives in step 2, but both steps stay
    // mounted (CSS-hidden) in the same <form>, so pressing Enter on step 1
    // can still trigger this handler after step-1 fields validate. Treat
    // that as "advance to step 2", not "create the org".
    if (step !== 2) {
      void goToStep2()
      return
    }

    setFormError(null)
    startTransition(async () => {
      const result = await createOrgAction(values)
      if (!result.ok) {
        setFormError(result.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{heading}</CardTitle>
        <CardDescription>
          {step === 1 ? '회사 기본 정보를 입력하세요.' : '사업 유형을 고르면 맞는 기능을 켜 드립니다.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className={cn('flex flex-col gap-4', step !== 1 && 'hidden')}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>회사(조직) 이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: 전자동"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          if (!slugTouched) {
                            form.setValue('slug', slugify(e.target.value), { shouldValidate: true })
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
                    <FormLabel>사이트 주소 (영문)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="jadong"
                        {...field}
                        onChange={(e) => {
                          setSlugTouched(true)
                          field.onChange(slugify(e.target.value))
                        }}
                      />
                    </FormControl>
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
                      <Input placeholder="010-1234-5678" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="button" className="mt-2 w-full" onClick={() => void goToStep2()}>
다음
              </Button>
            </div>

            <div className={cn('flex flex-col gap-4', step !== 2 && 'hidden')}>
              <FormField
                control={form.control}
                name="vertical"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-3">
                      {VERTICALS.map(([key, preset]) => {
                        const Icon = getIcon(preset.icon)
                        const selected = field.value === key

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => field.onChange(key)}
                            className={cn(
                              'flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors',
                              selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <Icon className="size-5 text-muted-foreground" />
                              {selected ? <CheckIcon className="size-4 text-primary" /> : null}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground">{preset.name}</span>
                              <span className="text-xs text-muted-foreground">{preset.description}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seedDemo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">
                      둘러볼 수 있게 예시 데이터 넣기
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>
이전
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? '만드는 중…' : '조직 만들기'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
