/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import type { ResidentialSchedule, Tier } from '../types/electricity'
import { D, type Dec, InputError, ZERO, centavos } from './money'

/**
 * "Magkano Kuryente Ko?" Residential electricity bill from a utility's
 * published monthly schedule, line by line, the way the utility itself bills.
 *
 * The method follows Meralco's own "Residential Bills at Typical Consumption
 * Levels", and reproduces every one of those worked bills to the centavo
 * (see the unit tests and scripts/update-electricity-rates.ts):
 *
 *   each per-kWh line      = rate × kWh, rounded to centavos
 *   distribution           = the whole month's kWh at the rate of its tier
 *   fixed lines            = supply and metering customer charges
 *   local franchise tax    = LFT rate × (generation … RPT adjustment)
 *   VAT                    = effective VAT rate × each VAT-able group
 *   energy tax             = by block, above 650 kWh
 *   lifeline discount      = share × bill, for registered lifeline households
 */

export type LineGroup = 'generation' | 'transmission' | 'systemLoss' | 'distribution' | 'adjustments' | 'subsidies' | 'taxes' | 'universal'

export interface BillLine {
  key: string
  label: string
  group: LineGroup
  amount: Dec
}

export interface BillResult {
  kwh: number
  lines: BillLine[]
  /** Group totals in bill order. */
  groups: { group: LineGroup; label: string; amount: Dec }[]
  total: Dec
  /** Total ÷ kWh, the "rate per kWh" a utility quotes for a typical bill. */
  perKwh: Dec
  distributionTier: Tier
}

export const GROUP_LABELS: Record<LineGroup, string> = {
  generation: 'Generation',
  transmission: 'Transmission',
  systemLoss: 'System loss',
  distribution: 'Distribution (distribution, supply, metering)',
  adjustments: 'Refunds and adjustments',
  subsidies: 'Subsidies and discounts',
  taxes: 'Government taxes',
  universal: 'Universal charges and FIT-All',
}
export const GROUP_ORDER: LineGroup[] = ['generation', 'transmission', 'systemLoss', 'distribution', 'adjustments', 'subsidies', 'taxes', 'universal']

export interface BillOptions {
  /** Registered lifeline household (qualified low-income; consumption up to the lifeline limit). */
  lifeline?: boolean
  /** Local franchise tax rate of your city or municipality; defaults to the utility's sample-bill assumption. */
  lftRate?: number
}

export function tierFor(tiers: Tier[], kwh: number): Tier {
  return tiers.find((t) => t.upTo === null || kwh <= t.upTo) ?? tiers[tiers.length - 1]
}

/** Energy tax by block: each block's kWh at its rate. */
function energyTax(blocks: Tier[], kwh: number): Dec {
  let tax = ZERO
  let from = 0
  for (const b of blocks) {
    const to = b.upTo ?? Infinity
    const inBlock = Math.max(0, Math.min(kwh, to) - from)
    tax = tax.plus(new D(inBlock).times(b.rate))
    from = to
    if (kwh <= to) break
  }
  return centavos(tax)
}

export function lifelineShare(s: ResidentialSchedule, kwh: number): number {
  return s.lifelineDiscounts.find((d) => kwh <= d.upTo)?.share ?? 0
}
export const lifelineLimit = (s: ResidentialSchedule) => Math.max(...s.lifelineDiscounts.map((d) => d.upTo))

export function validateKwh(kwh: number): void {
  if (!Number.isFinite(kwh)) throw new InputError('Enter your consumption in kWh.')
  if (kwh <= 0) throw new InputError('Consumption must be more than 0 kWh.')
  if (!Number.isInteger(kwh)) throw new InputError('Bills use whole kWh. Round your consumption to a whole number.')
  if (kwh > 100_000) throw new InputError('That is far above household use. Check the kWh on your bill.')
}

export function residentialBill(s: ResidentialSchedule, kwh: number, opts: BillOptions = {}): BillResult {
  validateKwh(kwh)
  const lftRate = opts.lftRate ?? s.lftRate
  if (!Number.isFinite(lftRate) || lftRate < 0 || lftRate > 0.05) throw new InputError('Local franchise tax should be between 0% and 5%.')
  const lifeline = !!opts.lifeline && kwh <= lifelineLimit(s)
  const k = new D(kwh)
  const per = (r: number) => centavos(k.times(r))
  const tier = tierFor(s.distribution, kwh)
  const p = s.perKwh
  const lines: BillLine[] = []
  const add = (key: string, label: string, group: LineGroup, amount: Dec) => lines.push({ key, label, group, amount })

  add('generation', 'Generation charge', 'generation', per(p.generation))
  add('transmission', 'Transmission charge', 'transmission', per(p.transmission))
  add('ancillary', 'Ancillary service charge', 'transmission', per(p.ancillary))
  add('systemLoss', 'System loss charge', 'systemLoss', per(p.systemLoss))
  add('distribution', `Distribution charge (${tier.upTo === null ? `over ${s.distribution[s.distribution.length - 2]?.upTo ?? 0}` : `up to ${tier.upTo}`} kWh tier)`, 'distribution', per(tier.rate))
  add('supply', 'Supply charge', 'distribution', per(p.supply))
  add('supplyCustomer', 'Supply charge, fixed', 'distribution', new D(s.fixed.supplyCustomer))
  add('metering', 'Metering charge', 'distribution', per(p.metering))
  add('meteringCustomer', 'Metering charge, fixed', 'distribution', new D(s.fixed.meteringCustomer))
  s.refunds.forEach((r, i) => add(`refund${i + 1}`, r.label, 'adjustments', per(r.rate)))
  add('regResetAdj', 'Regulatory reset fees adjustment', 'adjustments', per(p.regResetAdj))
  add('lifelineRateAdj', 'Lifeline rate adjustment', 'adjustments', per(p.lifelineRateAdj))
  add('seniorSubsidy', 'Senior citizen subsidy', 'subsidies', lifeline ? ZERO : per(p.seniorSubsidy))
  add('rpt', 'Real property tax', 'taxes', per(p.rpt))
  add('rptAdj', 'Real property tax adjustment', 'taxes', per(p.rptAdj))

  // Local franchise tax on everything above.
  const lftBase = lines.reduce((sum, l) => sum.plus(l.amount), ZERO)
  add('lft', 'Local franchise tax', 'taxes', centavos(lftBase.times(lftRate)))
  add('lftAdj', 'Local franchise tax adjustment', 'taxes', per(p.lftAdj))

  // VAT: effective rates by component; system loss and pass-through charges have their own rates (often zero).
  const amt = (key: string) => lines.find((l) => l.key === key)!.amount
  const others = ['distribution', 'supply', 'supplyCustomer', 'metering', 'meteringCustomer', ...s.refunds.map((_, i) => `refund${i + 1}`), 'regResetAdj'].reduce((sum, key) => sum.plus(amt(key)), ZERO)
  const vat = centavos(amt('generation').times(s.vat.generation))
    .plus(centavos(amt('transmission').times(s.vat.transmission)))
    .plus(centavos(amt('ancillary').times(s.vat.ancillary)))
    .plus(centavos(amt('systemLoss').times(s.vat.systemLoss)))
    .plus(centavos(others.times(s.vat.others)))
  add('vat', 'Value-added tax', 'taxes', vat)
  add('energyTax', 'Energy tax', 'taxes', energyTax(s.energyTax, kwh))
  add('universalCharge', 'Universal charges', 'universal', s.universalCharges.reduce((sum, u) => sum.plus(per(u.rate)), ZERO))
  add('fitAll', 'FIT-All (renewable)', 'universal', per(p.fitAll))
  add('geaAll', 'GEA-All (renewable)', 'universal', per(p.geaAll))

  if (lifeline) {
    const share = lifelineShare(s, kwh)
    const before = lines.reduce((sum, l) => sum.plus(l.amount), ZERO)
    add('lifelineDiscount', `Lifeline discount (${Math.round(share * 100)}%)`, 'subsidies', centavos(before.times(share)).negated())
  } else {
    add('lifelineSubsidy', 'Lifeline subsidy', 'subsidies', per(p.lifelineSubsidy))
  }

  const shown = lines.filter((l) => !l.amount.isZero() || ['generation', 'distribution'].includes(l.key))
  const total = shown.reduce((sum, l) => sum.plus(l.amount), ZERO)
  const groups = GROUP_ORDER.map((g) => ({ group: g, label: GROUP_LABELS[g], amount: shown.filter((l) => l.group === g).reduce((sum, l) => sum.plus(l.amount), ZERO) })).filter((g) => !g.amount.isZero())
  return { kwh, lines: shown, groups, total, perKwh: total.div(kwh).toDecimalPlaces(4), distributionTier: tier }
}

// ── Meter readings ──────────────────────────────────────────────────────

/** kWh from two meter readings: (current − previous) × multiplier. */
export function kwhFromReadings(previous: number, current: number, multiplier = 1): number {
  for (const [v, name] of [
    [previous, 'Previous reading'],
    [current, 'Present reading'],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) throw new InputError(`${name} must be a number of 0 or more.`)
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 10_000) throw new InputError('Multiplier should be more than 0. Most homes have 1.')
  if (current < previous) throw new InputError('The present reading is lower than the previous one. The meter may have been replaced or gone past its last digit; use the kWh printed on your bill instead.')
  const kwh = new D(current).minus(previous).times(multiplier)
  if (kwh.isZero()) throw new InputError('The two readings are the same, so no kWh was used.')
  return kwh.toDecimalPlaces(0).toNumber()
}

// ── Bill check ──────────────────────────────────────────────────────────

export type CheckBand = 'match' | 'close' | 'higher' | 'lower'

/** Within this many pesos, a difference is rounding or local franchise tax. */
export const MATCH_PESOS = 5
/** Within this share, a difference has an ordinary explanation more often than not. */
export const CLOSE_SHARE = 0.03

export interface BillCheck {
  expected: BillResult
  /** Expected total if the LGU's franchise tax were 0% and 0.75%: the usual range. */
  range: { low: Dec; high: Dec }
  billed: Dec
  difference: Dec
  percent: number
  band: CheckBand
}

export function checkBill(s: ResidentialSchedule, kwh: number, billed: number, opts: BillOptions = {}): BillCheck {
  if (!Number.isFinite(billed) || billed < 0) throw new InputError('Enter the current charges on your bill.')
  if (billed > 10_000_000) throw new InputError('That amount looks too large. Check the bill.')
  const expected = residentialBill(s, kwh, opts)
  const low = residentialBill(s, kwh, { ...opts, lftRate: 0 }).total
  const high = residentialBill(s, kwh, { ...opts, lftRate: 0.0075 }).total
  const b = new D(billed)
  const difference = b.minus(expected.total)
  const percent = expected.total.isZero() ? 0 : difference.div(expected.total).times(100).toDecimalPlaces(2).toNumber()
  const inRange = b.gte(low.minus(MATCH_PESOS)) && b.lte(high.plus(MATCH_PESOS))
  const band: CheckBand = difference.abs().lte(MATCH_PESOS) || inRange ? 'match' : Math.abs(percent) <= CLOSE_SHARE * 100 ? 'close' : difference.gt(0) ? 'higher' : 'lower'
  return { expected, range: { low, high }, billed: b, difference, percent, band }
}

/** Plain reasons a bill can differ from the schedule, most common first. Never a verdict. */
export function explanations(c: BillCheck, ctx: { days?: number; lifelineAsked?: boolean } = {}): string[] {
  const out: string[] = []
  if (c.band === 'match') return ['Your bill matches Meralco’s published rates for this month. Small differences come from your city’s local franchise tax.']
  if (c.difference.gt(0)) {
    out.push('Amounts other than this month’s current charges: unpaid balance, late payment charge, bill deposit, or an installment of an earlier bill. Compare against “Current charges”, not “Total amount due”.')
    out.push('A differential billing or adjustment for an earlier estimated reading, shown as a separate line.')
  } else {
    out.push('A credit: interest on your bill deposit, an advance payment, or a refund shown on your bill.')
    out.push('A senior citizen discount or lifeline discount you are entitled to.')
  }
  out.push('The bill is for a different billing month than the one selected, so different rates apply.')
  if (ctx.days && (ctx.days < 27 || ctx.days > 33))
    out.push(`Your billing period is ${ctx.days} days, ${ctx.days > 33 ? 'longer' : 'shorter'} than the usual month, so the kWh covers ${ctx.days > 33 ? 'more' : 'fewer'} days. The rates still apply per kWh.`)
  out.push('The kWh used here is not the billed kWh, for example a meter multiplier or an estimated reading.')
  out.push('If none of these explain it, ask Meralco for a bill explanation (hotline 16211) before paying under protest. You can bring an unresolved complaint to the ERC.')
  return out
}

// ── Compare two bills ───────────────────────────────────────────────────

export interface BillPeriod {
  kwh: number
  amount: number
}

export interface BillComparison {
  kwhChange: number
  kwhPercent: number | null
  amountChange: Dec
  amountPercent: number | null
  rateBefore: Dec
  rateAfter: Dec
  /** Change explained by using more or fewer kWh, at the earlier rate. */
  fromUsage: Dec
  /** Change explained by the rate per kWh moving, on the later kWh. */
  fromRate: Dec
}

/**
 * Split a change in the bill into usage and rate:
 *   from usage = (kWh after − kWh before) × rate before
 *   from rate  = (rate after − rate before) × kWh after
 * The two add up exactly to the change in the bill.
 */
export function compareBills(before: BillPeriod, after: BillPeriod): BillComparison {
  for (const [p, name] of [
    [before, 'Earlier bill'],
    [after, 'Later bill'],
  ] as const) {
    if (!Number.isFinite(p.kwh) || p.kwh <= 0) throw new InputError(`${name}: enter the kWh used.`)
    if (!Number.isFinite(p.amount) || p.amount <= 0) throw new InputError(`${name}: enter the amount.`)
  }
  const rateBefore = new D(before.amount).div(before.kwh)
  const rateAfter = new D(after.amount).div(after.kwh)
  const amountChange = new D(after.amount).minus(before.amount)
  const fromUsage = centavos(new D(after.kwh - before.kwh).times(rateBefore))
  return {
    kwhChange: after.kwh - before.kwh,
    kwhPercent: before.kwh ? ((after.kwh - before.kwh) / before.kwh) * 100 : null,
    amountChange,
    amountPercent: amountChange.div(before.amount).times(100).toDecimalPlaces(2).toNumber(),
    rateBefore: rateBefore.toDecimalPlaces(4),
    rateAfter: rateAfter.toDecimalPlaces(4),
    fromUsage,
    fromRate: amountChange.minus(fromUsage),
  }
}
