// Shared print template component — renders inside print.css's `.qr-block`
// (sized 22mm on .print-a4 / .print-label, 18mm centered on .print-thermal).
// No 'use client': plain markup, safe to render straight from a print page RSC.

interface QrBlockProps {
  /** PNG data URL from src/lib/receipt.ts's qrDataUrl(). */
  dataUrl: string
  alt?: string
  className?: string
}

export function QrBlock({ dataUrl, alt = '스캔하여 주문 조회', className }: QrBlockProps) {
  return (
    <div className={className ? `qr-block ${className}` : 'qr-block'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it */}
      <img src={dataUrl} alt={alt} />
    </div>
  )
}
