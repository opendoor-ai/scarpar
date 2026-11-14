// 회사 소개 블록 — 소개글 + 숫자로 보는 회사 + (선택) 연락처

import { Mail, MapPin, Phone, User } from 'lucide-react'

import { mediaUrl } from '@/lib/media-url'
import { formatKrPhone, phoneDigits } from '@/lib/phone'
import type { CompanyIntroBlock } from '@/types/db'

import type { BlockRenderContext } from './render-blocks'

export function CompanyIntroBlockView({ block, ctx }: { block: CompanyIntroBlock; ctx: BlockRenderContext }) {
  const { org } = ctx
  const stats = (block.stats ?? []).filter((s) => s.label.trim() && s.value.trim())
  const hasImage = Boolean(block.image)

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className={hasImage ? 'grid items-center gap-8 md:grid-cols-2' : 'mx-auto max-w-3xl'}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(block.image as string)}
            alt={org.name}
            className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
          />
        ) : null}
        <div className="flex flex-col gap-4">
          {block.heading ? <h2 className="text-xl font-bold sm:text-2xl">{block.heading}</h2> : null}
          {block.body ? (
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground sm:text-base">{block.body}</p>
          ) : null}

          {stats.length > 0 ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((s, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3 text-center">
                  <dd className="text-lg font-bold text-primary sm:text-xl">{s.value}</dd>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>
          ) : null}

          {block.showContact ? (
            <ul className="flex flex-col gap-1.5 text-sm">
              {org.contact_name ? (
                <li className="inline-flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  담당 {org.contact_name}
                </li>
              ) : null}
              {org.phone ? (
                <li>
                  <a href={`tel:${phoneDigits(org.phone)}`} className="inline-flex items-center gap-2 hover:underline">
                    <Phone className="size-4 text-muted-foreground" />
                    {formatKrPhone(org.phone)}
                  </a>
                </li>
              ) : null}
              {org.email ? (
                <li>
                  <a href={`mailto:${org.email}`} className="inline-flex items-center gap-2 hover:underline">
                    <Mail className="size-4 text-muted-foreground" />
                    {org.email}
                  </a>
                </li>
              ) : null}
              {org.address ? (
                <li className="inline-flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  {org.address}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}
