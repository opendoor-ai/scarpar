// [상품상세] 미니 배너 — 배너 관리에서 등록한 작은 띠 (모든 상품 상세페이지 공통)
// PC이미지=아이콘, 텍스트1=문구(<b> 가능), 색상1=글자색, 색상2=배경색, 링크

import { ChevronRight } from 'lucide-react'

import { AdLink } from '@/components/platform/ad-link'
import { BannerHtml } from '@/components/platform/banner-html'
import { inlineHtml } from '@/lib/inline-html'
import { getLiveBanners, renderGroupHtml } from '@/modules/ads/live'

export async function DetailMiniBanners() {
  const banners = await getLiveBanners('detail_mini')
  if (banners.length === 0) return null
  const html = await renderGroupHtml('detail_mini', banners)
  if (html) return <BannerHtml html={html} />

  return (
    <div className="flex flex-col gap-2">
      {banners.slice(0, 5).map((b) => (
        <AdLink
          key={b.id}
          bannerId={b.id}
          href={b.link_url}
          title={b.title}
          className="block overflow-hidden rounded-lg border border-border text-sm transition-opacity hover:opacity-90"
        >
          <span
            className="flex items-center gap-3 px-4 py-3"
            style={{ color: b.colors[0] || undefined, background: b.colors[1] || undefined }}
          >
            {b.image_pc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.image_pc} alt="" className="size-7 shrink-0 rounded-full object-cover" />
            ) : null}
            <span className="flex-1" dangerouslySetInnerHTML={{ __html: inlineHtml(b.texts[0]?.text || b.title) }} />
            <ChevronRight className="size-4" />
          </span>
        </AdLink>
      ))}
    </div>
  )
}
