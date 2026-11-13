'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { MODULE_LIST } from '@/modules/registry'
import type { ModuleKey } from '@/modules/types'
import type { Org } from '@/types/db'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { updateOrgProfileAction } from '@/modules/settings/actions'
import { orgProfileSchema, type OrgProfileInput } from '@/modules/settings/schemas'

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Seoul', label: '서울 (UTC+9)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (UTC+6)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
  { value: 'UTC', label: 'UTC' },
]

function OrgProfileSection({ org }: { org: Org }) {
  const form = useForm<OrgProfileInput>({
    resolver: zodResolver(orgProfileSchema),
    defaultValues: {
      name: org.name,
      phone: org.phone ?? '',
      email: org.email ?? '',
      address: org.address ?? '',
      bin_number: org.bin_number ?? '',
      timezone: org.timezone,
      enabled_modules: org.enabled_modules as ModuleKey[],
    },
  })

  async function onSubmit(values: OrgProfileInput) {
    const result = await updateOrgProfileAction(values)
    if (result.ok) {
      toast.success('회사 정보가 저장되었습니다')
      form.reset(values)
    } else {
      toast.error(result.error)
    }
  }

  const enabledModules = form.watch('enabled_modules')

  return (
    <Card id="section-organization" className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="text-base">회사(조직) 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 전화</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
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
                      <Input type="email" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bin_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사업자등록번호</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="1234567890123" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      13-digit e-BIN for Mushak invoices
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <Label>통화</Label>
                <Input value={org.currency} disabled />
                <p className="text-xs text-muted-foreground">원화(KRW)로 고정되어 있습니다</p>
              </div>

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시간대</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <Label>사업 유형</Label>
                <div>
                  <Badge variant="outline" className="capitalize">
                    {org.vertical}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-sm">사용할 기능</Label>
                <p className="text-xs text-muted-foreground">
이 회사에서 사용할 기능을 고르세요.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODULE_LIST.map((mod) => {
                  const checked = enabledModules?.includes(mod.key) ?? false
                  return (
                    <label
                      key={mod.key}
                      htmlFor={`module-${mod.key}`}
                      className="flex items-start gap-2 rounded-md border p-3 cursor-pointer"
                    >
                      <Checkbox
                        id={`module-${mod.key}`}
                        checked={checked}
                        onCheckedChange={(next) => {
                          const set = new Set(form.getValues('enabled_modules'))
                          if (next) set.add(mod.key)
                          else set.delete(mod.key)
                          form.setValue('enabled_modules', Array.from(set), { shouldDirty: true })
                        }}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{mod.name}</span>
                        <span className="text-xs text-muted-foreground">{mod.description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>

              <Alert variant="warning">
                <AlertTitle>기능을 끄면 해당 메뉴가 숨겨집니다</AlertTitle>
                <AlertDescription>
데이터는 그대로 남아 있고, 다시 켜면 다시 볼 수 있습니다.
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '저장 중…' : '변경사항 저장'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export { OrgProfileSection }
