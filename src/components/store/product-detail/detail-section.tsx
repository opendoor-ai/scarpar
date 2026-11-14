// "제품상세" 탭 내용 — 문의 안내 배너, 제품 요약, 규격·사양표, 안내사항, 상세 내용, 해시태그

import { Info, PhoneCall, Search } from 'lucide-react'

import { sanitizeDetailHtml } from '@/lib/detail-html'
import { formatKrPhone } from '@/lib/phone'
import type { Product } from '@/types/db'

import { CONDITION_BADGE_CLASS, CONDITION_LABEL } from './labels'

export function DetailSection({
  product,
  supplierName,
  supplierPhone,
  platformName,
}: {
  product: Product
  supplierName: string
  supplierPhone: string | null
  platformName: string
}) {
  const phone = supplierPhone ? formatKrPhone(supplierPhone) : null
  const html = sanitizeDetailHtml(product.detail_html)
  const tags = product.tags ?? []
  const keywords = [product.name, product.model_name, product.brand, supplierName].filter(
    (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i,
  )

  const specRows = [
    { label: '제품명', value: product.name, strong: true },
    { label: '모델명', value: product.model_name },
    { label: '제조사', value: product.brand },
    { label: '간략설명', value: product.short_description },
    { label: '제품사양', value: product.spec_summary },
    { label: '공급사', value: supplierName, strong: true },
    { label: '직통 문의처', value: phone, strong: true },
  ].filter((r) => r.value)

  return (
    <div className="flex flex-col gap-6">
      {/* 문의 안내 배너 */}
      <div className="flex items-center gap-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
        <PhoneCall className="size-10 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed sm:text-base">
          문의하실 때 <strong className="text-primary">&ldquo;{platformName} 보고 연락드렸습니다&rdquo;</strong>라고
          말씀해 주시면, 더 자세하고 친절하게 안내받으실 수 있습니다.
        </p>
      </div>

      {/* 제품 요약 카드 */}
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
        {product.condition ? (
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${CONDITION_BADGE_CLASS[product.condition]}`}>
            {CONDITION_LABEL[product.condition]}
          </span>
        ) : null}
        <p className="text-lg font-bold sm:text-xl">{product.name}</p>
        {product.short_description ? <p className="text-sm text-primary">{product.short_description}</p> : null}
        {product.spec_summary ? <p className="text-xs text-muted-foreground">{product.spec_summary}</p> : null}
      </div>

      {/* 규격·사양표 */}
      {specRows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <p className="bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background">
            제품 규격 및 사양 안내
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {specRows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="w-28 bg-muted/40 px-4 py-3 text-left font-normal text-muted-foreground">
                    {r.label}
                  </th>
                  <td className={`px-4 py-3 ${r.strong ? 'font-semibold' : ''}`}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* 안내사항 */}
      <div className="rounded-xl border border-border p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Info className="size-4 text-primary" />
          안내사항
        </p>
        <p className="border-l-4 border-primary/50 pl-3 text-sm leading-relaxed text-muted-foreground">
          본 제품은 <strong className="text-foreground">{supplierName}</strong>에서 안내하는 제품입니다. 세부 사양 상담,
          실물 확인, 시운전 협의는{' '}
          {phone ? (
            <>
              문의처(<strong className="text-foreground">{phone}</strong>)로{' '}
            </>
          ) : null}
          연락 주시면 신속하게 안내해 드립니다.
        </p>
      </div>

      {/* 상세 내용 */}
      {html || product.description ? (
        <div className="rounded-xl border border-border p-4 sm:p-6">
          <p className="mb-4 border-b-2 border-primary pb-2 text-center text-sm font-semibold">상세정보</p>
          {product.description ? (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          ) : null}
          {html ? <div className="detail-html" dangerouslySetInnerHTML={{ __html: html }} /> : null}
        </div>
      ) : null}

      {/* 해시태그 · 주요 검색어 */}
      {tags.length > 0 || keywords.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 text-sm">
          {tags.length > 0 ? (
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-primary">
              {tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </p>
          ) : null}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Search className="mt-0.5 size-3.5 shrink-0" />
            주요 검색어: {keywords.join(', ')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
