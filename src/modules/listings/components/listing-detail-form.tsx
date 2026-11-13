'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BD_DISTRICTS } from '@/lib/bd'
import { fromPaisa } from '@/lib/money'

import { updateListing } from '../actions'
import {
  listingFormSchema,
  type ListingAddress,
  type ListingDetailRow,
  type ListingFormValues,
  type ListingMedia,
} from '../schemas'
import { FeaturesInput } from './features-input'
import { MediaGallery } from './media-gallery'

interface ListingDetailFormProps {
  listing: ListingDetailRow
}

function ListingDetailForm({ listing }: ListingDetailFormProps) {
  const address = listing.address as ListingAddress | null
  const [features, setFeatures] = useState<string[]>(listing.features)
  const [media, setMedia] = useState<ListingMedia[]>(listing.mediaItems)

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: listing.title,
      purpose: listing.purpose,
      property_type: listing.property_type,
      price: String(fromPaisa(listing.price)),
      area_sqft: listing.area_sqft !== null ? String(listing.area_sqft) : '',
      beds: listing.beds !== null ? String(listing.beds) : '',
      baths: listing.baths !== null ? String(listing.baths) : '',
      address: {
        line1: address?.line1 ?? '',
        area: address?.area ?? '',
        district: address?.district ?? '',
      },
      description: listing.description ?? '',
      features: listing.features,
      media_ids: listing.mediaItems.map((item) => item.id),
      status: listing.status,
    },
  })

  async function onSubmit(values: ListingFormValues) {
    const result = await updateListing(listing.id, {
      ...values,
      features,
      media_ids: media.map((item) => item.id),
    })
    if (result.ok) {
      toast.success('매물이 저장되었습니다')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>매물 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가격 (원)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>거래 유형</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sale">매매</SelectItem>
                        <SelectItem value="rent">임대</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>매물 종류</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="apartment">아파트</SelectItem>
                        <SelectItem value="house">주택</SelectItem>
                        <SelectItem value="land">토지</SelectItem>
                        <SelectItem value="commercial">상가/사무실</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="area_sqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>면적 (sqft)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>방</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>욕실</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_200px]">
              <FormField
                control={form.control}
                name="address.line1"
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
              <FormField
                control={form.control}
                name="address.area"
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
                name="address.district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지역</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="지역 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BD_DISTRICTS.map((district) => (
                          <SelectItem key={district.name} value={district.name}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-1.5">
              <Label>특징</Label>
              <FeaturesInput
                value={features}
                onChange={(next) => {
                  setFeatures(next)
                  form.setValue('features', next)
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>사진</Label>
              <MediaGallery
                value={media}
                onChange={(next) => {
                  setMedia(next)
                  form.setValue(
                    'media_ids',
                    next.map((item) => item.id),
                  )
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="sm:w-[200px]">
                  <FormLabel>상태</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">임시저장</SelectItem>
                      <SelectItem value="active">공개</SelectItem>
                      <SelectItem value="under_offer">협의 중</SelectItem>
                      <SelectItem value="sold">매매 완료</SelectItem>
                      <SelectItem value="rented">임대 완료</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '저장 중...' : '변경사항 저장'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export { ListingDetailForm }
