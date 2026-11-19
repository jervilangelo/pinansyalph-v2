/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

/**
 * Philippine internet plans for "Sulit Ba Internet Ko?".
 *
 * Every figure comes from the provider's own page or press release, read on
 * the date in `checked`. Rules:
 * - `current`: the plan and price appear on a live official page.
 * - `announced`: from an official announcement that could not be re-confirmed
 *   on a live page; shown with its date and never used to say a visitor is
 *   overpaying.
 * - Fields the provider does not publish are `null` ("not stated"), never
 *   guessed. A plan with no published price is not listed as a plan.
 * - Coverage is never assumed: availability is the provider's own wording.
 */

export type ConnectionType = 'fiber' | 'fixed-wireless' | 'satellite'
export type Billing = 'postpaid' | 'prepaid'

export interface InternetPlan {
  id: string
  providerId: string
  name: string
  connection: ConnectionType
  billing: Billing
  /** Regular price in pesos per period. Postpaid: a month. Prepaid: per load of `periodDays`. */
  price: number
  /** Prepaid load validity; postpaid plans are billed monthly. */
  periodDays?: number
  downMbps: number | null
  upMbps: number | null
  /** Shown when the advertised speed is a floor ("400+") or a range. */
  speedNote?: string
  dataCap: 'unlimited' | string
  /** One-time fees paid at the start (installation, kit, modem), in pesos. null = not stated. */
  upfront: number | null
  /** Installation charged in monthly instalments on top of the plan price. */
  installInstalments?: { total: number; months: number }
  /** Contract lock-in in months. 0 = none. null = not stated. */
  lockInMonths: number | null
  /** A first-period price or free months, kept apart from the regular price. */
  promo?: { months: number; price: number; note: string; until?: string }
  inclusions?: string
  availability: string
  status: 'current' | 'announced'
  source: { url: string; checked: string; published?: string }
  note?: string
}

export interface Provider {
  id: string
  name: string
  short: string
  /** Brand colour for the provider's initials tile. */
  color: string
  site: string
}

export const CHECKED = '2026-11-18'

export const PROVIDERS: Provider[] = [
  { id: 'pldt', name: 'PLDT Home', short: 'PLDT', color: '#c4161c', site: 'https://www.pldthome.com/' },
  { id: 'globe', name: 'Globe At Home (GFiber)', short: 'Globe', color: '#0056b8', site: 'https://www.globe.com.ph/broadband' },
  { id: 'converge', name: 'Converge ICT', short: 'Converge', color: '#e85e1c', site: 'https://www.convergeict.com/' },
  { id: 'starlink', name: 'Starlink', short: 'Starlink', color: '#151514', site: 'https://starlink.com/en-ph' },
  { id: 'smart', name: 'Smart Home WiFi', short: 'Smart', color: '#00a651', site: 'https://store.smart.com.ph/' },
  { id: 'dito', name: 'DITO Home', short: 'DITO', color: '#d0021b', site: 'https://dito.ph/' },
]

/** Providers looked for but without a published plan price we could verify. Visitors can add these as their own plan. */
export const NOT_VERIFIED: { name: string; reason: string; site: string }[] = [
  {
    name: 'PLDT Home Fiber (postpaid) and PLDT Home WiFi',
    reason: 'PLDT’s plan pages answered automated requests with a bot check, so their prices could not be read.',
    site: 'https://www.pldthome.com/',
  },
  { name: 'Globe GFiber Prepaid', reason: 'The page shows the kit (₱699, regularly ₱1,499) and speeds up to 300 Mbps, but not the load prices.', site: 'https://gfiberprepaid.globe.com.ph/' },
  { name: 'Surf2Sawa (Converge prepaid)', reason: 'The ₱1,699 kit includes 30 days of up to 100 Mbps; reload prices are not on its site.', site: 'https://surf2sawa.com/' },
  { name: 'Smart Bro and other Smart 5G loads', reason: 'Prices and eligible areas differ between Smart’s pages; only the Home WiFi Unli load is listed here.', site: 'https://smart.com.ph/' },
  { name: 'Sky Fiber (SKY TruFiber)', reason: 'Plans are not listed with prices on its site.', site: 'https://www.mysky.com.ph/' },
  { name: 'DITO Fiber', reason: 'No current fiber plan page found.', site: 'https://dito.ph/' },
  {
    name: 'Royal Cable, Streamtech, Eastern Communications and other regional providers',
    reason: 'No plan prices published on their sites, or their sites could not be reached.',
    site: 'https://www.streamtech.com.ph/',
  },
]

const PLDT_PREPAID = { url: 'https://www.pldthome.com/fiberprepaid', checked: CHECKED }
const PLDT_PREPAID_AVAIL = 'Where PLDT fiber reaches. Check your address with PLDT.'
const pldtPrepaid = (mbps: number, price30: number, price365: number): InternetPlan[] => [
  {
    id: `pldt-prepaid-${mbps}`,
    providerId: 'pldt',
    name: `Fiber Prepaid ${mbps} Mbps, 30-day load`,
    connection: 'fiber',
    billing: 'prepaid',
    price: price30,
    periodDays: 30,
    downMbps: mbps,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: 1699,
    lockInMonths: 0,
    ...(mbps === 100 ? { promo: { months: 1, price: 0, note: 'The ₱1,699 one-time fee includes 30 days of unlimited fiber', until: '2027-03-31' } } : {}),
    availability: PLDT_PREPAID_AVAIL,
    status: 'current',
    source: PLDT_PREPAID,
    note: 'One-time fee of ₱1,699 as advertised on the Fiber Prepaid page.',
  },
  {
    id: `pldt-prepaid-${mbps}-365`,
    providerId: 'pldt',
    name: `Fiber Prepaid ${mbps} Mbps, 365-day load`,
    connection: 'fiber',
    billing: 'prepaid',
    price: price365,
    periodDays: 365,
    downMbps: mbps,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: 1699,
    lockInMonths: 0,
    availability: PLDT_PREPAID_AVAIL,
    status: 'current',
    source: PLDT_PREPAID,
  },
]

const CONVERGE = { url: 'https://www.convergeict.com/fastestspeedtest', checked: CHECKED, published: '2026-06-22' }
const CONVERGE_AVAIL = 'Where Converge fiber reaches. Check your address with Converge.'
const CONVERGE_NOTE = 'Converge said in May 2025 that it removed its ₱2,500 installation fee. Lock-in is not stated on the plan list.'
const converge = (id: string, name: string, mbps: number, price: number, inclusions: string): InternetPlan => ({
  id: `converge-${id}`,
  providerId: 'converge',
  name,
  connection: 'fiber',
  billing: 'postpaid',
  price,
  downMbps: mbps,
  upMbps: null,
  dataCap: 'unlimited',
  upfront: 0,
  lockInMonths: null,
  inclusions,
  availability: CONVERGE_AVAIL,
  status: 'current',
  source: CONVERGE,
  note: CONVERGE_NOTE,
})

export const PLANS: InternetPlan[] = [
  ...pldtPrepaid(50, 699, 6999),
  ...pldtPrepaid(100, 999, 9999),
  ...pldtPrepaid(300, 1499, 14999),
  {
    id: 'globe-1499',
    providerId: 'globe',
    name: 'GFiber 1499 Unli',
    connection: 'fiber',
    billing: 'postpaid',
    price: 1499,
    downMbps: 300,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: 1,
    installInstalments: { total: 2400, months: 24 },
    lockInMonths: 0,
    inclusions: 'Wi-Fi 6 modem, Blast TV access, a freebie worth up to ₱2,000',
    availability: 'Where Globe fiber reaches. Check your address with Globe.',
    status: 'current',
    source: { url: 'https://www.globe.com.ph/about-us/newsroom/consumer/globe-at-home-expands-gfiber-lineup', checked: CHECKED, published: '2026-09-14' },
    note: '₱2,400 installation is charged over 24 months (₱100 a month), with ₱1 upfront.',
  },
  {
    id: 'globe-2499',
    providerId: 'globe',
    name: 'GFiber Plan 2499',
    connection: 'fiber',
    billing: 'postpaid',
    price: 2499,
    downMbps: 1000,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: null,
    lockInMonths: null,
    inclusions: 'VIP hotline, Care Squad in-home support, 12-month device warranty',
    availability: 'Where Globe fiber reaches. Check your address with Globe.',
    status: 'current',
    source: { url: 'https://www.globe.com.ph/about-us/newsroom/consumer/globe-at-home-expands-gfiber-lineup', checked: CHECKED, published: '2026-09-14' },
    note: 'Installation fee and lock-in are not stated in Globe’s announcement.',
  },
  converge('play', 'Super FiberX Play', 200, 1349, 'Wi-Fi 6 modem, Xperience Hub, SkyTV Standard'),
  converge('max', 'Super FiberX Max', 400, 1599, 'Wi-Fi 6 modem, Xperience Hub, SkyTV Standard'),
  converge('prime', 'Super FiberX Prime', 800, 2099, 'Wi-Fi 6 modem, Xperience Hub, SkyTV Standard'),
  converge('ultra', 'Super FiberX Ultra', 1000, 2599, 'Wi-Fi 6 modem, Xperience Hub, SkyTV Premium'),
  converge('1558', 'Plan 1558 with Netflix', 200, 1558, 'Wi-Fi 6 modem, Netflix HD (1 stream)'),
  converge('1798', 'Plan 1798 with Netflix', 400, 1798, 'Wi-Fi 6 modem, Netflix HD (1 stream)'),
  converge('1998', 'Plan 1998 with Netflix', 600, 1998, 'Wi-Fi 6 modem, Netflix Full HD (2 streams)'),
  converge('1500', 'FiberX 1500', 300, 1500, 'Wi-Fi 6 modem, Blast TV access'),
  converge('2000', 'FiberX 2000', 500, 2000, 'Wi-Fi 6 modem, Blast TV access'),
  converge('2500', 'FiberX 2500', 700, 2500, 'Wi-Fi 6 modem, Blast TV access'),
  converge('3500', 'FiberX 3500', 1000, 3500, 'Wi-Fi 6 modem, Blast TV access'),
  converge('gc-ez', 'GameChanger EZ', 400, 1800, 'Wi-Fi 6 modem, network prioritisation'),
  converge('gc-elite', 'GameChanger Elite', 1000, 5000, 'Wi-Fi 6 modem, network prioritisation, ASUS ROG gaming router'),
  {
    id: 'starlink-100',
    providerId: 'starlink',
    name: 'Residential 100 Mbps',
    connection: 'satellite',
    billing: 'postpaid',
    price: 2800,
    downMbps: 100,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: null,
    lockInMonths: null,
    availability: 'Select areas only, per Starlink.',
    status: 'current',
    source: { url: 'https://starlink.com/en-ph/residential', checked: CHECKED },
    note: 'Hardware is sold separately; its price was not shown for our address.',
  },
  {
    id: 'starlink-max',
    providerId: 'starlink',
    name: 'Residential Max',
    connection: 'satellite',
    billing: 'postpaid',
    price: 4099,
    downMbps: 400,
    upMbps: null,
    speedNote: 'Advertised as “up to 400+ Mbps”; 400 is used for ₱ per Mbps.',
    dataCap: 'unlimited',
    upfront: null,
    lockInMonths: null,
    availability: 'Wherever Starlink serves, per Starlink.',
    status: 'current',
    source: { url: 'https://starlink.com/en-ph/residential', checked: CHECKED },
    note: 'Hardware is sold separately; its price was not shown for our address.',
  },
  {
    id: 'smart-unli-1299',
    providerId: 'smart',
    name: 'Home WiFi Unli 1299 (30 days)',
    connection: 'fixed-wireless',
    billing: 'prepaid',
    price: 1299,
    periodDays: 30,
    downMbps: null,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: null,
    lockInMonths: 0,
    availability: 'Where Smart 4G or 5G reaches. Speed depends on the signal at your home.',
    status: 'current',
    source: { url: 'https://store.smart.com.ph/promos-and-add-ons/smart-home-wifi/unli', checked: CHECKED },
    note: 'Smart does not advertise a speed for this load, so ₱ per Mbps cannot be computed. The Home WiFi device is bought separately.',
  },
  {
    id: 'dito-wowfi-790',
    providerId: 'dito',
    name: 'Home WOWFi 5G, 30-day load',
    connection: 'fixed-wireless',
    billing: 'prepaid',
    price: 790,
    periodDays: 30,
    downMbps: 100,
    upMbps: null,
    dataCap: 'Unlimited 5G, plus 50 GB of 4G',
    upfront: 1990,
    lockInMonths: 0,
    promo: { months: 1, price: 0, note: 'The starter kit included the first 30 days of unlimited 5G' },
    availability: 'Where DITO 5G reaches; the 4G data applies only in 4G areas.',
    status: 'announced',
    source: { url: 'https://dito.ph/news/dito-launches-new-dito-home-wowfi-the-worlds-first-5g-redcap-wifi-for-home', checked: CHECKED, published: '2024-10-14' },
    note: 'From DITO’s October 2024 launch announcement. The ₱1,990 starter kit included the first 30 days.',
  },
]

export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id)
export const planById = (id: string) => PLANS.find((p) => p.id === id)
