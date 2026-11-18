import { BILLING, CATEGORIES, type Billing, type SubCategory } from '../data/subscriptions'
import { D, ZERO, centavos, type Dec } from './money'

/**
 * Subscription totals. Every entry is normalised to what it costs the visitor
 * per month: the period price, divided by the months it covers, divided by the
 * number of people who split it. Totals are summed exactly and rounded to
 * centavos only for display.
 */

export const CUSTOM_ICONS = ['tv', 'music', 'cloud', 'sparkles', 'gamepad', 'dumbbell', 'book', 'newspaper', 'bag', 'heart'] as const
export type CustomIcon = (typeof CUSTOM_ICONS)[number]

export interface SubEntry {
  id: string
  /** Directory service and plan, when picked from the list. */
  serviceId?: string
  planId?: string
  name: string
  planName?: string
  category: SubCategory
  billing: Billing
  /** What the plan costs per billing period, in pesos. */
  price: number
  /** People splitting the cost, you included. 1 = you pay it all. */
  people: number
  /** A known renewal date (YYYY-MM-DD). */
  renewal?: string
  /** Custom entries only. */
  icon?: CustomIcon
}

export const MAX_PRICE = 1_000_000
export const MAX_PEOPLE = 20
const MONTHS: Record<Billing, number> = Object.fromEntries(BILLING.map((b) => [b.id, b.months])) as Record<Billing, number>

/** Plain-language problem with an entry, or null when it can be added. */
export function entryProblem(e: Pick<SubEntry, 'name' | 'price' | 'people' | 'billing'>): string | null {
  if (!e.name.trim()) return 'Give the subscription a name.'
  if (!Number.isFinite(e.price) || e.price <= 0) return 'Enter what you pay, more than ₱0.'
  if (e.price > MAX_PRICE) return 'That is more than ₱1,000,000 per billing period.'
  if (!Number.isInteger(e.people) || e.people < 1 || e.people > MAX_PEOPLE) return `Split between 1 and ${MAX_PEOPLE} people.`
  if (!(e.billing in MONTHS)) return 'Choose how often you are billed.'
  return null
}

/** Your share per billing period. */
const periodShare = (e: SubEntry): Dec => new D(e.price).div(e.people)
const monthlyDec = (e: SubEntry): Dec => periodShare(e).div(MONTHS[e.billing])

export const yourShare = (e: SubEntry) => centavos(periodShare(e)).toNumber()
export const monthlyCost = (e: SubEntry) => centavos(monthlyDec(e)).toNumber()
export const annualCost = (e: SubEntry) => centavos(monthlyDec(e).times(12)).toNumber()

export interface CategoryTotal {
  category: SubCategory
  label: string
  monthly: number
  count: number
  /** Share of the monthly total, 0–100. */
  percent: number
}

export interface Summary {
  count: number
  monthly: number
  annual: number
  /** Annual ÷ 52. */
  weekly: number
  /** Monthly total ÷ count. */
  average: number
  top: { entry: SubEntry; monthly: number }[]
  byCategory: CategoryTotal[]
  /** Monthly-equivalent spending, split by how it is billed. */
  byBilling: {
    billing: Billing
    label: string
    monthly: number
    count: number
  }[]
}

export function summarize(entries: SubEntry[]): Summary {
  const total = entries.reduce((s, e) => s.plus(monthlyDec(e)), ZERO)
  const pctOf = (x: Dec) => (total.isZero() ? 0 : x.div(total).times(100).toDecimalPlaces(1).toNumber())
  const byCategory = CATEGORIES.map((c) => {
    const list = entries.filter((e) => e.category === c.id)
    const sum = list.reduce((s, e) => s.plus(monthlyDec(e)), ZERO)
    return {
      category: c.id,
      label: c.label,
      monthly: centavos(sum).toNumber(),
      count: list.length,
      percent: pctOf(sum),
    }
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.monthly - a.monthly)
  const byBilling = BILLING.map((b) => {
    const list = entries.filter((e) => e.billing === b.id)
    return {
      billing: b.id,
      label: b.label,
      monthly: centavos(list.reduce((s, e) => s.plus(monthlyDec(e)), ZERO)).toNumber(),
      count: list.length,
    }
  }).filter((b) => b.count > 0)
  const top = entries
    .map((entry) => ({
      entry,
      monthly: monthlyCost(entry),
      exact: monthlyDec(entry),
    }))
    .sort((a, b) => b.exact.comparedTo(a.exact))
    .map(({ entry, monthly }) => ({ entry, monthly }))
  return {
    count: entries.length,
    monthly: centavos(total).toNumber(),
    annual: centavos(total.times(12)).toNumber(),
    weekly: centavos(total.times(12).div(52)).toNumber(),
    average: entries.length ? centavos(total.div(entries.length)).toNumber() : 0,
    top,
    byCategory,
    byBilling,
  }
}

export interface CancelResult {
  savedMonthly: number
  savedAnnual: number
  newMonthly: number
  newAnnual: number
  /** Percent less than now, 0–100. */
  reduction: number
}

/** What cancelling the chosen subscriptions would save. */
export function simulateCancel(entries: SubEntry[], cancelIds: ReadonlySet<string>): CancelResult {
  const total = entries.reduce((s, e) => s.plus(monthlyDec(e)), ZERO)
  const saved = entries.filter((e) => cancelIds.has(e.id)).reduce((s, e) => s.plus(monthlyDec(e)), ZERO)
  const left = total.minus(saved)
  return {
    savedMonthly: centavos(saved).toNumber(),
    savedAnnual: centavos(saved.times(12)).toNumber(),
    newMonthly: centavos(left).toNumber(),
    newAnnual: centavos(left.times(12)).toNumber(),
    reduction: total.isZero() ? 0 : saved.div(total).times(100).toDecimalPlaces(1).toNumber(),
  }
}

export interface BudgetResult {
  budget: number
  spent: number
  /** Budget left; negative when over. */
  left: number
  /** Spent ÷ budget × 100, uncapped. */
  used: number
  over: boolean
}

export function budgetCheck(monthlyTotal: number, budget: number): BudgetResult {
  const b = new D(Math.max(0, budget))
  const s = new D(monthlyTotal)
  return {
    budget: b.toNumber(),
    spent: s.toNumber(),
    left: centavos(b.minus(s)).toNumber(),
    used: b.isZero() ? (s.isZero() ? 0 : 100) : s.div(b).times(100).toDecimalPlaces(1).toNumber(),
    over: s.greaterThan(b),
  }
}

/* ------------------------------------------------------------------ */
/* Renewals                                                             */
/* ------------------------------------------------------------------ */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function parseIso(s: string): Date | null {
  const m = ISO.exec(s)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCMonth() === Number(m[2]) - 1 ? d : null
}
const toIso = (d: Date) => d.toISOString().slice(0, 10)

/** Add whole months, keeping the day where it exists (31 Jan + 1 month = 28/29 Feb). */
function addMonths(d: Date, n: number, day: number): Date {
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + n
  const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, mo, Math.min(day, last)))
}

/** The first renewal on or after `today`, rolling the known date forward by the billing period. */
export function nextRenewal(renewal: string, billing: Billing, today: string): string | null {
  const start = parseIso(renewal)
  const now = parseIso(today)
  if (!start || !now) return null
  const day = start.getUTCDate()
  let d = start
  for (let k = 1; d < now && k < 1200; k++) d = addMonths(start, MONTHS[billing] * k, day)
  return toIso(d)
}

export interface Renewal {
  entry: SubEntry
  date: string
  /** Days from today. */
  inDays: number
  /** Your share charged on that date. */
  amount: number
}

/** Renewals in the next `days` days, soonest first. */
export function upcomingRenewals(entries: SubEntry[], today: string, days = 31): Renewal[] {
  const now = parseIso(today)
  if (!now) return []
  const out: Renewal[] = []
  for (const e of entries) {
    if (!e.renewal) continue
    const next = nextRenewal(e.renewal, e.billing, today)
    if (!next) continue
    const inDays = Math.round((parseIso(next)!.getTime() - now.getTime()) / 86_400_000)
    if (inDays <= days) out.push({ entry: e, date: next, inDays, amount: yourShare(e) })
  }
  return out.sort((a, b) => a.inDays - b.inDays || a.entry.name.localeCompare(b.entry.name))
}

/* ------------------------------------------------------------------ */
/* Storage                                                              */
/* ------------------------------------------------------------------ */

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id))

/** Rebuild entries read from storage, dropping anything malformed. */
export function sanitizeEntries(raw: unknown): SubEntry[] {
  if (!Array.isArray(raw)) return []
  const out: SubEntry[] = []
  for (const r of raw.slice(0, 200)) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    const e: SubEntry = {
      id: typeof x.id === 'string' && x.id ? x.id.slice(0, 64) : '',
      name: typeof x.name === 'string' ? x.name.slice(0, 80) : '',
      category: CATEGORY_IDS.has(x.category as SubCategory) ? (x.category as SubCategory) : 'other',
      billing: (x.billing as Billing) in MONTHS ? (x.billing as Billing) : 'monthly',
      price: typeof x.price === 'number' ? x.price : NaN,
      people: typeof x.people === 'number' ? x.people : 1,
    }
    if (typeof x.serviceId === 'string') e.serviceId = x.serviceId.slice(0, 64)
    if (typeof x.planId === 'string') e.planId = x.planId.slice(0, 64)
    if (typeof x.planName === 'string') e.planName = x.planName.slice(0, 80)
    if (typeof x.renewal === 'string' && parseIso(x.renewal)) e.renewal = x.renewal
    if (CUSTOM_ICONS.includes(x.icon as CustomIcon)) e.icon = x.icon as CustomIcon
    if (e.id && !entryProblem(e)) out.push(e)
  }
  return out
}
