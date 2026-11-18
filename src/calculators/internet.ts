import type { Billing, InternetPlan } from '../data/internetPlans'
import { D, ZERO, centavos, type Dec } from './money'

/**
 * Internet plan costs, "Sulit Ba Internet Ko?".
 *
 *   monthly equivalent  = postpaid: the monthly price
 *                         prepaid:  load price × (365 ÷ load days) ÷ 12
 *   ₱ per Mbps          = monthly equivalent ÷ advertised download Mbps
 *   month m's charge    = promo price in promo months, else the regular price,
 *                         + installation instalment while it lasts
 *   first-year cost     = one-time fees + Σ charges for months 1–12
 *   contract cost       = one-time fees + Σ charges over the lock-in
 *                         (24 months when there is no lock-in)
 *   effective monthly   = contract cost ÷ its months
 */

/** What every comparison needs; directory plans and the visitor's own plan both fit it. */
export interface PlanCosting {
  price: number
  billing: Billing
  periodDays?: number
  downMbps: number | null
  /** One-time fees. null = not stated by the provider (counted as ₱0, flagged). */
  upfront: number | null
  installInstalments?: { total: number; months: number }
  lockInMonths: number | null
  promo?: { months: number; price: number }
}

export const DEFAULT_HORIZON = 24

const monthlyEqDec = (p: PlanCosting): Dec => (p.billing === 'prepaid' && p.periodDays ? new D(p.price).times(365).div(p.periodDays).div(12) : new D(p.price))

/** Recurring charge for month m (1-based), promo-aware, with any installation instalment. */
function chargeFor(p: PlanCosting, m: number): Dec {
  const base = p.promo && m <= p.promo.months ? (p.billing === 'prepaid' && p.periodDays ? new D(p.promo.price).times(365).div(p.periodDays).div(12) : new D(p.promo.price)) : monthlyEqDec(p)
  const inst = p.installInstalments && m <= p.installInstalments.months ? new D(p.installInstalments.total).div(p.installInstalments.months) : ZERO
  return base.plus(inst)
}

const sumMonths = (p: PlanCosting, months: number) => Array.from({ length: months }, (_, i) => chargeFor(p, i + 1)).reduce((s, x) => s.plus(x), ZERO)

export interface PlanCosts {
  /** Regular monthly price (prepaid: monthly equivalent), without installation. */
  monthly: number
  /** ₱ per advertised Mbps, or null when no speed is advertised. */
  perMbps: number | null
  /** Regular price × 12, the recurring cost of a year without promos or fees. */
  annual: number
  upfront: number
  /** True when the provider does not state its one-time fees. */
  upfrontUnknown: boolean
  /** Installation instalments over the whole schedule. */
  installTotal: number
  firstYear: number
  /** Months used for the contract total: the lock-in, or 24 without one. */
  horizon: number
  /** True when there is no lock-in (or it is not stated) and 24 months is a reference period. */
  horizonAssumed: boolean
  contractTotal: number
  /** Contract total ÷ its months: the monthly cost with fees spread in. */
  effectiveMonthly: number
}

export function planCosts(p: PlanCosting): PlanCosts {
  const monthly = monthlyEqDec(p)
  const upfront = new D(p.upfront ?? 0)
  const horizon = p.lockInMonths && p.lockInMonths > 0 ? p.lockInMonths : DEFAULT_HORIZON
  const contract = upfront.plus(sumMonths(p, horizon))
  return {
    monthly: centavos(monthly).toNumber(),
    perMbps: p.downMbps && p.downMbps > 0 ? centavos(monthly.div(p.downMbps)).toNumber() : null,
    annual: centavos(monthly.times(12)).toNumber(),
    upfront: upfront.toNumber(),
    upfrontUnknown: p.upfront == null,
    installTotal: p.installInstalments?.total ?? 0,
    firstYear: centavos(upfront.plus(sumMonths(p, 12))).toNumber(),
    horizon,
    horizonAssumed: !(p.lockInMonths && p.lockInMonths > 0),
    contractTotal: centavos(contract).toNumber(),
    effectiveMonthly: centavos(contract.div(horizon)).toNumber(),
  }
}

/* ------------------------------------------------------------------ */
/* Your plan                                                            */
/* ------------------------------------------------------------------ */

export interface YourPlan {
  /** What you actually pay a month. */
  bill: number
  /** Advertised download speed. */
  advertisedMbps: number
  /** Measured speed, if you have one. */
  actualMbps?: number | null
}

export function planProblem(y: YourPlan): string | null {
  if (!Number.isFinite(y.bill) || y.bill <= 0 || y.bill > 1_000_000) return 'Enter your monthly bill, more than ₱0.'
  if (!Number.isFinite(y.advertisedMbps) || y.advertisedMbps <= 0 || y.advertisedMbps > 100_000) return 'Enter your plan’s advertised speed in Mbps, more than 0.'
  if (y.actualMbps != null && (!Number.isFinite(y.actualMbps) || y.actualMbps <= 0 || y.actualMbps > 100_000)) return 'Measured speed should be more than 0 Mbps.'
  return null
}

export interface Alternative {
  plan: InternetPlan
  costs: PlanCosts
  /** Your bill − its monthly price, × 12, less its one-time fees: positive means you would save in year one. */
  firstYearSavings: number
}

export interface OverpayResult {
  perMbps: number
  /** ₱ per Mbps at your measured speed, if given. */
  actualPerMbps: number | null
  annual: number
  /** Verified current plans with a known speed. */
  compared: number
  /** Of those, how many cost less per Mbps than you pay. */
  cheaperPerMbps: number
  /** Plans at least as fast as yours that cost less a month, best first-year savings first. */
  fasterForLess: Alternative[]
  /** Your rank among the compared plans by ₱ per Mbps, 1 = best value. */
  rank: number
}

/** Compare your plan with verified current plans. Announced-only plans are never used. */
export function overpayCheck(y: YourPlan, plans: InternetPlan[]): OverpayResult {
  const bill = new D(y.bill)
  const perMbps = bill.div(y.advertisedMbps)
  const verified = plans.filter((p) => p.status === 'current' && p.downMbps)
  const priced = verified.map((plan) => ({ plan, costs: planCosts(plan) }))
  const cheaper = priced.filter((x) => x.costs.perMbps! < centavos(perMbps).toNumber())
  const fasterForLess = priced
    .filter((x) => x.plan.downMbps! >= y.advertisedMbps && x.costs.monthly < y.bill)
    .map((x) => ({ ...x, firstYearSavings: centavos(bill.times(12).minus(x.costs.firstYear)).toNumber() }))
    .sort((a, b) => b.firstYearSavings - a.firstYearSavings || a.costs.perMbps! - b.costs.perMbps!)
  return {
    perMbps: centavos(perMbps).toNumber(),
    actualPerMbps: y.actualMbps ? centavos(bill.div(y.actualMbps)).toNumber() : null,
    annual: centavos(bill.times(12)).toNumber(),
    compared: priced.length,
    cheaperPerMbps: cheaper.length,
    fasterForLess,
    rank: cheaper.length + 1,
  }
}

/* ------------------------------------------------------------------ */
/* Sorting                                                              */
/* ------------------------------------------------------------------ */

export type SortKey = 'price' | 'speed' | 'perMbps' | 'firstYear' | 'contract'

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'perMbps', label: 'Lowest ₱ per Mbps' },
  { id: 'price', label: 'Lowest monthly price' },
  { id: 'speed', label: 'Highest speed' },
  { id: 'firstYear', label: 'Lowest first-year cost' },
  { id: 'contract', label: 'Lowest contract cost' },
]

/** Sort plans; unknown values (no speed) always go last. Ties keep their original order. */
export function sortPlans<T extends { plan: InternetPlan; costs: PlanCosts }>(rows: T[], key: SortKey): T[] {
  const val = (r: T): number | null => {
    switch (key) {
      case 'price':
        return r.costs.monthly
      case 'speed':
        return r.plan.downMbps == null ? null : -r.plan.downMbps
      case 'perMbps':
        return r.costs.perMbps
      case 'firstYear':
        return r.costs.firstYear
      case 'contract':
        return r.costs.contractTotal
    }
  }
  return rows
    .map((r, i) => ({ r, i, v: val(r) }))
    .sort((a, b) => (a.v == null ? 1 : 0) - (b.v == null ? 1 : 0) || (a.v ?? 0) - (b.v ?? 0) || a.i - b.i)
    .map((x) => x.r)
}

/** The lowest ₱ per Mbps among rows with a known speed: "best value", not "best plan". */
export function bestValueId(rows: { plan: InternetPlan; costs: PlanCosts }[]): string | null {
  let best: { id: string; v: number } | null = null
  for (const r of rows) if (r.costs.perMbps != null && (!best || r.costs.perMbps < best.v)) best = { id: r.plan.id, v: r.costs.perMbps }
  return best?.id ?? null
}
