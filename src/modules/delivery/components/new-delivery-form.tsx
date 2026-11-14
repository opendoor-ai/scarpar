"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { fromMinor, toMinor } from "@/lib/money"
import type { DeliveryCourier, DeliveryZone, Order, Rider } from "@/types/db"
import { createDeliveryAction } from "../actions"
import type { CreateDeliveryInput } from "../schemas"

const METHODS = [
  { value: "rider", label: "배송기사" },
  { value: "courier", label: "택배" },
  { value: "pickup", label: "방문 수령" },
] as const

const COURIERS: { value: DeliveryCourier; label: string }[] = [
  { value: "manual", label: "직접 배송" },
  { value: "cj", label: "CJ대한통운" },
  { value: "hanjin", label: "한진택배" },
  { value: "lotte", label: "롯데택배" },
]

const formSchema = z.object({
  method: z.enum(["rider", "courier", "pickup"]),
  zone_id: z.string(),
  rider_id: z.string(),
  courier: z.enum(["cj", "hanjin", "lotte", "manual"]),
  manual_tracking_code: z.string(),
  recipient_name: z.string().trim().min(1, "Recipient name is required"),
  recipient_phone: z.string().trim().min(6, "Recipient phone is required"),
  line1: z.string().trim().min(1, "Address line is required"),
  area: z.string(),
  district: z.string().trim().min(1, "District is required"),
  postcode: z.string(),
  cod_amount: z.string().min(1, "Required"),
  fee: z.string().min(1, "Required"),
  otp_enabled: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface NewDeliveryFormProps {
  order: Pick<Order, "id" | "order_no" | "customer_name" | "customer_phone" | "address" | "total" | "advance_paid">
  zones: DeliveryZone[]
  riders: Rider[]
  defaultZoneId: string | null
}

function NewDeliveryForm({ order, zones, riders, defaultZoneId }: NewDeliveryFormProps) {
  const router = useRouter()
  const orderAddress = (order.address ?? {}) as {
    line1?: string
    area?: string
    district?: string
    postcode?: string
  }
  const defaultZone = zones.find((zone) => zone.id === defaultZoneId)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      method: "rider",
      zone_id: defaultZoneId ?? "",
      rider_id: "",
      courier: "manual",
      manual_tracking_code: "",
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      line1: orderAddress.line1 ?? "",
      area: orderAddress.area ?? "",
      district: orderAddress.district ?? "",
      postcode: orderAddress.postcode ?? "",
      cod_amount: String(fromMinor(Math.max(0, order.total - order.advance_paid))),
      fee: String(fromMinor(defaultZone?.charge ?? 0)),
      otp_enabled: false,
    },
  })

  const method = form.watch("method")
  const courier = form.watch("courier")

  function handleZoneChange(zoneId: string) {
    const zone = zones.find((z) => z.id === zoneId)
    if (zone) form.setValue("fee", String(fromMinor(zone.charge)))
  }

  async function onSubmit(values: FormValues) {
    const payload: CreateDeliveryInput = {
      order_id: order.id,
      method: values.method,
      zone_id: values.zone_id || null,
      rider_id: values.method === "rider" ? values.rider_id || null : null,
      courier: values.method === "courier" ? values.courier : null,
      manual_tracking_code: values.manual_tracking_code || undefined,
      recipient_name: values.recipient_name,
      recipient_phone: values.recipient_phone,
      address: {
        line1: values.line1,
        area: values.area || undefined,
        district: values.district,
        postcode: values.postcode || undefined,
      },
      cod_amount: toMinor(values.cod_amount),
      fee: toMinor(values.fee),
      otp_enabled: values.otp_enabled,
    }

    const result = await createDeliveryAction(payload)
    if (!result.ok) {
      if (values.method === "courier" && values.courier !== "manual") {
        toast.error(result.error, {
          description: '택배사를 "직접 배송"으로 바꾸고 송장 번호를 직접 입력하세요.',
        })
      } else {
        toast.error(result.error)
      }
      return
    }

    toast.success(`배송 ${result.data?.delivery_no}이(가) 등록되었습니다`)
    router.push(`/admin/deliveries/${result.data?.id}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <FormLabel>배송 방법</FormLabel>
              <div className="mt-2 flex gap-2">
                {METHODS.map((m) => (
                  <Button
                    key={m.value}
                    type="button"
                    variant={method === m.value ? "default" : "outline"}
                    onClick={() => form.setValue("method", m.value)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            {method === "rider" ? (
              <FormField
                control={form.control}
                name="rider_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>배송기사</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="배송기사 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riders.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {rider.name} — {rider.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {method === "courier" ? (
              <>
                <FormField
                  control={form.control}
                  name="courier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>택배사</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="택배사 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COURIERS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {courier === "manual" ? (
                  <FormField
                    control={form.control}
                    name="manual_tracking_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>송장 번호 (선택)</FormLabel>
                        <FormControl>
                          <Input placeholder="비우면 자동 생성" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </>
            ) : null}

            <FormField
              control={form.control}
              name="zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>배송 지역</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleZoneChange(value)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="배송 지역 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="recipient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>받는 분 이름</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipient_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>받는 분 전화번호</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="line1"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>동/읍/면</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>지역</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>우편번호</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="cod_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>착불 금액 (원)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>배송비 (원)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="otp_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3 sm:col-span-2">
                  <FormLabel className="text-[13px]">배송 시 인증 번호(4자리) 확인</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "등록 중..." : "배송 등록"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export { NewDeliveryForm }
