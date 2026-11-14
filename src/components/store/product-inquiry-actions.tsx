'use client'

// 상품 상세 문의·홍보 버튼 (전자동 기준서 6장)
// - 전화·문자: 휴대폰 화면에서만 보임(md 미만). PC에서는 번호만 글자로 보여줌.
// - 문자: 안내 창에서 문의 문구를 보여준 뒤 휴대폰 문자 앱을 엶. 발송은 고객이 직접 함.
// - 공유: 휴대폰은 기본 공유 창, PC는 링크 복사.
// - QR: 상품 주소 QR 코드 보기·저장.

import { useState } from 'react'
import { Copy, MessageSquare, Phone, QrCode, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { formatKrPhone, isMobilePhone, phoneDigits } from '@/lib/phone'

import { trackProductEvent } from './product-detail/track'

interface ProductInquiryActionsProps {
  /** 통계 기록용 */
  productId: string
  productName: string
  modelName?: string | null
  supplierName: string
  supplierPhone: string | null
  productUrl: string
  qrDataUrl: string
}

export function ProductInquiryActions({
  productId,
  productName,
  modelName,
  supplierName,
  supplierPhone,
  productUrl,
  qrDataUrl,
}: ProductInquiryActionsProps) {
  const [smsOpen, setSmsOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [message, setMessage] = useState(
    `[${supplierName}] 제품 문의드립니다.\n제품: ${productName}${modelName ? ` (${modelName})` : ''}\n${productUrl}\n\n가격과 상세 사양 안내 부탁드립니다.`,
  )

  const digits = supplierPhone ? phoneDigits(supplierPhone) : ''
  const canCall = digits.length >= 8
  const canSms = canCall && isMobilePhone(digits)

  function openSmsApp() {
    trackProductEvent(productId, 'sms_click')
    // "sms:번호?&body=" 형식은 안드로이드·아이폰 모두에서 동작함
    window.location.href = `sms:${digits}?&body=${encodeURIComponent(message)}`
    setSmsOpen(false)
  }

  async function handleShare() {
    trackProductEvent(productId, 'share_click')
    const shareData = {
      title: productName,
      text: `${supplierName} · ${productName}`,
      url: productUrl,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(productUrl)
      toast.success('상품 링크를 복사했습니다')
    } catch {
      toast.error('링크를 복사하지 못했습니다')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canCall ? (
        <>
          {/* 휴대폰 화면 전용 */}
          <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
            <Button asChild size="lg" className={canSms ? '' : 'col-span-2'}>
              <a href={`tel:${digits}`} onClick={() => trackProductEvent(productId, 'call_click')}>
                <Phone className="size-4" />
                전화 문의
              </a>
            </Button>
            {canSms ? (
              <Button type="button" size="lg" variant="outline" onClick={() => setSmsOpen(true)}>
                <MessageSquare className="size-4" />
                문자 문의
              </Button>
            ) : null}
          </div>
          {/* PC 화면: 번호만 표시 */}
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm md:flex">
            <Phone className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">문의 전화</span>
            <span className="font-semibold tabular-nums">{formatKrPhone(digits)}</span>
          </div>
        </>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="size-4" />
          공유하기
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => {
            trackProductEvent(productId, 'qr_open')
            setQrOpen(true)
          }}>
          <QrCode className="size-4" />
          QR 코드
        </Button>
      </div>

      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문자 문의</DialogTitle>
            <DialogDescription>
              아래 문구가 담긴 채로 휴대폰 문자 앱이 열립니다. 내용을 확인하고 직접 보내 주세요. (받는 번호:{' '}
              {formatKrPhone(digits)})
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSmsOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={openSmsApp}>
              <MessageSquare className="size-4" />
              문자 앱 열기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>상품 QR 코드</DialogTitle>
            <DialogDescription>
              휴대폰 카메라로 찍으면 이 상품 페이지가 열립니다. 전단지·카탈로그에 활용하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`${productName} QR 코드`} className="size-56 rounded-md border border-border" />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(productUrl)
                  toast.success('상품 링크를 복사했습니다')
                } catch {
                  toast.error('링크를 복사하지 못했습니다')
                }
              }}
            >
              <Copy className="size-4" />
              링크 복사
            </Button>
            <Button asChild>
              <a href={qrDataUrl} download={`QR-${productName}.png`}>
                QR 이미지 저장
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
