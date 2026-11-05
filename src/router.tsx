import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

/**
 * A tiny History-API router. GitHub Pages serves a copy of index.html at every
 * route (see the `pages` plugin in vite.config.ts), so deep links load with a
 * 200 and the app picks the page from the path.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export const ROUTES = ['/', '/sweldo', '/13th-month', '/mp2', '/banks', '/compare', '/inflation', '/gas', '/about'] as const
export type Route = (typeof ROUTES)[number]

export const PAGES: { path: Exclude<Route, '/'>; label: string; title: string; blurb: string }[] = [
  { path: '/sweldo', label: 'Sweldo', title: 'Saan napupunta ang sweldo ko?', blurb: 'Take-home pay after SSS, PhilHealth, Pag-IBIG and tax, then your bills.' },
  { path: '/13th-month', label: '13th Month Pay', title: 'Magkano Ang 13th Month Pay Mo?', blurb: 'Your 13th month pay under PD 851, prorated, with the ₱90,000 tax check.' },
  { path: '/mp2', label: 'MP2', title: 'Pag-IBIG MP2 calculator', blurb: 'Project MP2 dividends and see what they are worth after inflation.' },
  { path: '/banks', label: 'Digital banks', title: 'Saan mas sulit mag-ipon?', blurb: 'Digital bank savings with verified base rates, after the 20% tax.' },
  { path: '/compare', label: 'Compare', title: 'MP2 vs digital banks', blurb: 'The same savings plan side by side, in pesos or in today’s pesos.' },
  { path: '/inflation', label: 'Inflation', title: 'Philippine inflation', blurb: 'Headline, core, food and transport inflation from PSA since 2019.' },
  { path: '/gas', label: 'Gas', title: 'Magkano na ang gas?', blurb: 'Weekly DOE pump price adjustments for gasoline, diesel and kerosene.' },
  { path: '/about', label: 'About', title: 'About PinansyalPH', blurb: 'Why this open-source project exists, and how the numbers are made.' },
]

function currentPath(): Route {
  let p = window.location.pathname
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length)
  p = p.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/'
  return (ROUTES as readonly string[]).includes(p) ? (p as Route) : '/'
}

/** App path ("/mp2#faq") → URL under the deploy base ("/pinansyalph-v2/mp2#faq"). */
export function href(to: string): string {
  if (/^(https?:|mailto:)/.test(to) || to.startsWith('#')) return to
  const [pathname, hash] = to.split('#')
  const p = !pathname || pathname === '/' ? '/' : pathname
  return `${BASE}${p}${hash ? `#${hash}` : ''}`
}

type Nav = { path: Route; navigate: (to: string) => void }
const RouterContext = createContext<Nav>({ path: '/', navigate: () => {} })

function scrollToHash(hash: string) {
  const el = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
  if (el) el.scrollIntoView({ block: 'start' })
  else window.scrollTo({ top: 0, behavior: 'instant' })
}

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<Route>(currentPath)

  const navigate = useCallback((to: string) => {
    const hash = to.split('#')[1] ?? ''
    const target = href(to)
    const samePage = target.split('#')[0] === window.location.pathname
    if (target !== window.location.pathname + window.location.hash) window.history.pushState(null, '', target)
    if (samePage) {
      // Same page: just move to the anchor (or the top).
      const el = hash ? document.getElementById(hash) : null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setPath(currentPath())
  }, [])

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>
}

export const useRouter = () => useContext(RouterContext)

/** Called by the page after it has mounted, so hash targets exist. */
export function useScrollOnEnter() {
  useEffect(() => {
    // Wait a frame so lazy content and layout settle before jumping.
    const id = requestAnimationFrame(() => scrollToHash(window.location.hash))
    return () => cancelAnimationFrame(id)
  }, [])
}

export function Link({ to, onClick, children, ...rest }: { to: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const { navigate } = useRouter()
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={href(to)} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
