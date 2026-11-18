import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

/**
 * A tiny History-API router. GitHub Pages serves a copy of index.html at every
 * route (see the `pages` plugin in vite.config.ts), so deep links load with a
 * 200 and the app picks the page from the path.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export const ROUTES = ['/', '/sweldo', '/underpaid-ba-ko', '/13th-month', '/mp2', '/banks', '/compare', '/inflation', '/gas', '/magkano-ang-toll', '/magkano-kuryente', '/magkano-bahay', '/magkano-subscription', '/magkano-konsumo', '/sulit-internet', '/mga-dapat-iwasan', '/about'] as const
export type Route = (typeof ROUTES)[number]

export type GroupId = 'sahod' | 'ipon' | 'presyo' | 'gastos'

/** Tools are grouped by the question a visitor brings, in plain Filipino-English. */
export const GROUPS: { id: GroupId; label: string; gloss: string; question: string }[] = [
  { id: 'sahod', label: 'Sahod', gloss: 'Pay', question: 'Your pay, and what is left of it' },
  { id: 'ipon', label: 'Ipon', gloss: 'Savings', question: 'Where your savings grow' },
  { id: 'presyo', label: 'Presyo', gloss: 'Prices', question: 'What things cost now' },
  { id: 'gastos', label: 'Gastos', gloss: 'Spending', question: 'Your monthly bills and subscriptions' },
]

export type PageInfo = { path: Exclude<Route, '/'>; label: string; name: string; title: string; blurb: string; /** One short line for the Tools menu. */ hint?: string; group?: GroupId }

export const PAGES: PageInfo[] = [
  { path: '/sweldo', label: 'Sweldo', name: 'Sweldo calculator', title: 'Saan napupunta ang sweldo ko?', blurb: 'Take-home pay after SSS, PhilHealth, Pag-IBIG and tax, then your monthly budget.', hint: 'Take-home pay and budget', group: 'sahod' },
  { path: '/underpaid-ba-ko', label: 'Underpaid ba ko?', name: 'Underpaid ba ko?', title: 'Underpaid ba ko?', blurb: 'Compare your pay with official PSA wage data for your job, region and industry.', hint: 'Your pay against PSA wage data', group: 'sahod' },
  { path: '/13th-month', label: '13th Month Pay', name: '13th month pay', title: 'Magkano Ang 13th Month Pay Mo?', blurb: 'Your 13th month pay under PD 851, prorated, with the ₱90,000 tax check.', hint: 'Your 13th month pay, prorated', group: 'sahod' },
  { path: '/mp2', label: 'MP2', name: 'Pag-IBIG MP2', title: 'Pag-IBIG MP2 calculator', blurb: 'Project MP2 dividends and see what they are worth after inflation.', hint: 'MP2 dividends, after inflation', group: 'ipon' },
  { path: '/banks', label: 'Digital banks', name: 'Digital bank savings', title: 'Saan mas sulit mag-ipon?', blurb: 'Digital bank savings with verified base rates, after the 20% tax.', hint: 'Digital bank savings, after tax', group: 'ipon' },
  { path: '/compare', label: 'Compare', name: 'MP2 vs digital banks', title: 'MP2 vs digital banks', blurb: 'The same savings plan side by side, in pesos or in today’s pesos.', hint: 'MP2 and banks, side by side', group: 'ipon' },
  { path: '/inflation', label: 'Inflation', name: 'Inflation tracker', title: 'Philippine inflation', blurb: 'Headline, core, food and transport inflation from PSA since 2019.', hint: 'PSA inflation since 2019', group: 'presyo' },
  { path: '/gas', label: 'Gas', name: 'Fuel prices', title: 'Magkano na ang gas?', blurb: 'Weekly DOE pump price adjustments for gasoline, diesel and kerosene.', hint: 'Weekly DOE pump price changes', group: 'presyo' },
  { path: '/magkano-ang-toll', label: 'Toll', name: 'Magkano ang Toll Ko?', title: 'Magkano ang Toll Ko?', blurb: 'Expressway toll by entry, exit and vehicle class, with your RFID load.', hint: 'Expressway tolls and RFID load', group: 'presyo' },
  { path: '/magkano-kuryente', label: 'Kuryente', name: 'Magkano Kuryente Ko?', title: 'Magkano Kuryente Ko?', blurb: 'Check your Meralco bill against the month’s published rates, appliance by appliance.', hint: 'Check your Meralco bill', group: 'gastos' },
  { path: '/magkano-bahay', label: 'Bahay', name: 'Magkano Bahay Ngayon?', title: 'Magkano Bahay Ngayon?', blurb: 'House and condo prices by area from the BSP, price trends, and what a home loan would cost.', hint: 'House and condo prices, home loans', group: 'presyo' },
  { path: '/magkano-konsumo', label: 'Konsumo', name: 'Magkano Konsumo Ko?', title: 'Magkano Konsumo Ko?', blurb: 'What each appliance costs in electricity a day, a month and a year, and what using it less would save.', hint: 'Appliance electricity costs', group: 'gastos' },
  { path: '/sulit-internet', label: 'Internet', name: 'Sulit Ba Internet Ko?', title: 'Sulit Ba Internet Ko?', blurb: 'Your internet plan’s cost per Mbps against verified plans from PLDT, Globe, Converge, Starlink and more.', hint: 'Compare internet plans by ₱ per Mbps', group: 'gastos' },
  { path: '/magkano-subscription', label: 'Subscriptions', name: 'Magkano ba Subscription Ko?', title: 'Magkano ba Subscription Ko?', blurb: 'Add your streaming, cloud, AI and gaming subscriptions and see what they cost you a month and a year.', hint: 'Your subscriptions, monthly and yearly', group: 'gastos' },
  { path: '/mga-dapat-iwasan', label: 'Mga Dapat Iwasan', name: 'Mga Dapat Iwasan', title: 'Mga Dapat Iwasan', blurb: 'The arithmetic behind gambling, loan apps, credit card minimums and installment spending, with simulators and ways to protect your money.', hint: 'Financial traps to avoid' },
  { path: '/about', label: 'About', name: 'About', title: 'About PinansyalPH', blurb: 'Why this open-source project exists, and how the numbers are made.' },
]

export const TOOLS = PAGES.filter((p) => p.group)
export const pageInfo = (path: Route) => PAGES.find((p) => p.path === path)

function currentPath(): Route {
  let p = window.location.pathname
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length)
  p = p.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/'
  return (ROUTES as readonly string[]).includes(p) ? (p as Route) : '/'
}

/** App path ("/mp2#faq") → URL under the deploy base ("/pinansyalph-v2/mp2#faq"). */
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
  const [path, setPath] = useState<Route>(currentPath)

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
