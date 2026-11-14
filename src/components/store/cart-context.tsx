'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** One cart line. Snapshotted at add-to-cart time (name/price/image) — never re-priced client
 * side; placeOrderAction always re-fetches authoritative prices/stock from the DB. */
export interface CartItem {
  productId: string
  variantId?: string | null
  name: string
  variantName?: string | null
  unitPrice: number // minor
  image?: string | null
  qty: number
}

interface CartContextValue {
  items: CartItem[]
  /** False until the localStorage cart has been read on the client — render 0/empty until true
   * to stay hydration-safe (server always renders an empty cart). */
  mounted: boolean
  add: (item: CartItem) => void
  remove: (productId: string, variantId?: string | null) => void
  setQty: (productId: string, variantId: string | null | undefined, qty: number) => void
  clear: () => void
  subtotal: number
  count: number
}

const CartContext = createContext<CartContextValue | null>(null)

function cartStorageKey(orgSlug: string): string {
  return `jadong-cart-${orgSlug}`
}

function sameLine(
  a: { productId: string; variantId?: string | null },
  b: { productId: string; variantId?: string | null },
): boolean {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null)
}

export function CartProvider({ orgSlug, children }: { orgSlug: string; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage once, client-side only.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartStorageKey(orgSlug))
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed as CartItem[])
      }
    } catch {
      // corrupt/unavailable localStorage — start from an empty cart
    }
    setMounted(true)
    // orgSlug is effectively static per storefront session (whole subtree keyed by it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  // Persist on every change, after the initial hydration above has run.
  useEffect(() => {
    if (!mounted) return
    try {
      window.localStorage.setItem(cartStorageKey(orgSlug), JSON.stringify(items))
    } catch {
      // storage full/unavailable — cart still works in-memory for this tab
    }
  }, [items, mounted, orgSlug])

  const value = useMemo<CartContextValue>(() => {
    const add: CartContextValue['add'] = (item) => {
      setItems((prev) => {
        const idx = prev.findIndex((line) => sameLine(line, item))
        if (idx === -1) return [...prev, item]
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + item.qty }
        return next
      })
    }

    const remove: CartContextValue['remove'] = (productId, variantId) => {
      setItems((prev) => prev.filter((line) => !sameLine(line, { productId, variantId })))
    }

    const setQty: CartContextValue['setQty'] = (productId, variantId, qty) => {
      setItems((prev) => {
        if (qty <= 0) return prev.filter((line) => !sameLine(line, { productId, variantId }))
        return prev.map((line) =>
          sameLine(line, { productId, variantId }) ? { ...line, qty } : line,
        )
      })
    }

    const clear: CartContextValue['clear'] = () => setItems([])

    const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
    const count = items.reduce((sum, line) => sum + line.qty, 0)

    return { items, mounted, add, remove, setQty, clear, subtotal, count }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mounted])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
