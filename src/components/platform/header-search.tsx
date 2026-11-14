'use client'

// 위쪽 검색창 — 홍보 문구(돌아가며 표시, 비운 채 검색하면 그 문구의 주소로) + 인기검색어

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function HeaderSearch({
  promos,
  mode,
  popular,
}: {
  promos: { text: string; url: string }[]
  mode: 'random' | 'order'
  popular: string[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const list = useMemo(() => promos.filter((p) => p.text.trim()), [promos])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (list.length === 0) return
    setIdx(mode === 'random' ? Math.floor(Math.random() * list.length) : 0)
    if (list.length < 2) return
    const t = setInterval(() => {
      setIdx((i) => (mode === 'random' ? Math.floor(Math.random() * list.length) : (i + 1) % list.length))
    }, 4000)
    return () => clearInterval(t)
  }, [list, mode])

  const promo = list[idx]

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (term) return router.push(`/products?q=${encodeURIComponent(term)}`)
    if (promo?.url) return router.push(promo.url)
    router.push('/products')
  }

  return (
    <div className="relative ml-auto hidden w-full max-w-md flex-col md:flex">
      <form onSubmit={submit} className="relative" role="search">
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={promo?.text || '제품명·모델명·제조사·상품코드 검색'}
          aria-label="제품 검색"
          className="h-10 w-full rounded-full border-2 border-primary/70 bg-background px-5 pr-11 text-sm outline-none focus:border-primary"
        />
        <button type="submit" className="absolute top-1/2 right-3 -translate-y-1/2 text-primary" aria-label="검색">
          <Search className="size-5" />
        </button>
      </form>
      {popular.length > 0 ? (
        <div className="absolute top-full left-4 mt-0.5 flex max-w-full gap-2 overflow-hidden text-[11px] whitespace-nowrap text-muted-foreground">
          <span className="font-semibold text-primary">인기</span>
          {popular.slice(0, 10).map((k) => (
            <Link key={k} href={`/products?q=${encodeURIComponent(k)}`} className="hover:text-foreground hover:underline">
              {k}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
