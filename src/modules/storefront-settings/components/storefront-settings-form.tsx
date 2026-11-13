'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

import { updateOrgSettingsAction } from '@/modules/storefront-settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MediaPicker } from '@/components/admin/media-picker'

const formSchema = z.object({
  announcement: z.string().trim().max(300),
  whatsapp_number: z.string().trim().max(20),
  primary_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #059669'),
  name: z.string().trim().min(1, 'Business name is required'),
  phone: z.string().trim().max(32),
  email: z.union([z.string().trim().email('이메일 형식이 올바르지 않습니다'), z.literal('')]),
  address: z.string().trim().max(500),
  logo_path: z.string().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface StorefrontSettingsFormProps {
  defaultValues: FormValues
}

function StorefrontSettingsForm({ defaultValues }: StorefrontSettingsFormProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues })

  async function onSubmit(values: FormValues) {
    const result = await updateOrgSettingsAction({
      announcement: values.announcement,
      whatsapp_number: values.whatsapp_number,
      primary_color: values.primary_color,
      org: {
        name: values.name,
        phone: values.phone,
        email: values.email,
        address: values.address,
        logo_path: values.logo_path,
      },
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('쇼핑몰 설정이 저장되었습니다.')
    form.reset(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">쇼핑몰</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="announcement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상단 공지 문구</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: 이번 주 신제품 입고 — 전화 상담 환영" />
                  </FormControl>
                  <FormDescription>비워 두면 공지줄이 숨겨집니다.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp 상담 버튼 번호 (국가번호 포함)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="821012345678" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>포인트 색상</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : '#059669'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                      />
                      <Input {...field} className="max-w-32" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">회사 정보</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="logo_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>로고</FormLabel>
                  <FormControl>
                    <MediaPicker
                      value={field.value ? { id: '', path: field.value } : null}
                      onChange={(m) => field.onChange(m?.path ?? null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>회사명</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 전화</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '저장 중...' : '변경사항 저장'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export { StorefrontSettingsForm }
