'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

const THEME_KEY = 'scarpar-theme'

/**
 * No-flash inline theme script. Runs before hydration (rendered by the
 * server, executed synchronously as the browser parses <body>) so the
 * `dark` class lands on <html> before first paint — pairs with
 * suppressHydrationWarning on <html> in src/app/layout.tsx.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`

export function ThemeScript() {
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
}

export function ThemeToggle() {
  // null until mounted — avoids guessing the icon before we can read the
  // class ThemeScript already applied.
  const [isDark, setIsDark] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    } catch {
      // localStorage unavailable (private mode) — theme just won't persist.
    }
    setIsDark(next)
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="화면 테마 변경">
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
