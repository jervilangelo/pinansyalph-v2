import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { ROUTES, normalizePath, type Route } from './routes'

export * from './routes'

/**
 * A tiny History-API router. The build writes a static HTML file for every
 * route (see the `pages-routes` plugin in vite.config.ts), so clean URLs such
 * as /mp2 load directly with a 200 and the app picks the page from the path.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** The app path for the current URL, with the deploy base removed. */
function appPathname(): string {
  const p = window.location.pathname
  return BASE && p.startsWith(BASE) ? p.slice(BASE.length) || '/' : p
}

function currentPath(): Route {
  const p = normalizePath(appPathname())
  return (ROUTES as readonly string[]).includes(p) ? (p as Route) : '/'
}

/**
 * One URL per page: /mp2/, /mp2.html, /mp2/index.html and the old
 * /pinansyalph-v2/mp2 all show the MP2 page, and the address bar is rewritten
 * to /mp2 so bookmarks and shared links stay canonical.
 */
function canonicalizeUrl() {
  const raw = appPathname()
  const clean = normalizePath(raw)
  if (clean === raw || !(ROUTES as readonly string[]).includes(clean)) return
  window.history.replaceState(window.history.state, '', href(clean) + window.location.search + window.location.hash)
}

/** App path ("/mp2#faq") → URL under the deploy base (BASE + "/mp2#faq"). */
export function href(to: string): string {
  if (/^(https?:|mailto:)/.test(to) || to.startsWith('#')) return to
  const [pathAndQuery, hash] = to.split('#')
  const [pathname, query] = pathAndQuery.split('?')
  const p = !pathname || pathname === '/' ? '/' : pathname
  return `${BASE}${p}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

type Nav = { path: Route; navigate: (to: string) => void }
const RouterContext = createContext<Nav>({ path: '/', navigate: () => {} })

function scrollToHash(hash: string) {
  const el = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
  if (el) el.scrollIntoView({ block: 'start' })
  else window.scrollTo({ top: 0, behavior: 'instant' })
}

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<Route>(() => {
    canonicalizeUrl()
    return currentPath()
  })

  const navigate = useCallback((to: string) => {
    const hash = to.split('#')[1] ?? ''
    const target = href(to)
    const samePage = target.split('#')[0] === window.location.pathname + window.location.search
    if (target !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, '', target)
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
