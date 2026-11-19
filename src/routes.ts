/**
 * Every public route and its page metadata. Plain data with no React, so the
 * build (vite.config.ts) can use it to write a static HTML file per route,
 * the sitemap and the canonical URLs.
 */

/** The production origin. Canonical, Open Graph and sitemap URLs use it. */
export const SITE_ORIGIN = 'https://pinansyalph.site'

/** The repository path the site was served under on github.io before the custom domain. */
export const LEGACY_BASE = '/pinansyalph-v2'

/**
 * Reduce any spelling of a page's URL to its canonical app path:
 * "/mp2/", "/mp2.html", "/mp2/index.html" and "/pinansyalph-v2/mp2" → "/mp2".
 */
export function normalizePath(pathname: string): string {
  let p = pathname
  if (p === LEGACY_BASE || p.startsWith(`${LEGACY_BASE}/`)) p = p.slice(LEGACY_BASE.length)
  p = p
    .replace(/\/index\.html$/, '')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '')
  return p || '/'
}

/** Absolute canonical URL for an app path: "/" → "https://pinansyalph.site/", "/mp2" → ".../mp2". */
export const canonicalUrl = (path: string) => (path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`)

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
  { path: '/about', label: 'About', name: 'About', title: 'About PinansyalPH', blurb: 'Why this free project exists, and how the numbers are made.' },
]

export const TOOLS = PAGES.filter((p) => p.group)
export const pageInfo = (path: Route) => PAGES.find((p) => p.path === path)
