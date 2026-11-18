import { applianceType, type PowerKind } from '../data/appliances'
import { D, ZERO, centavos, type Dec } from './money'

/**
 * Household appliance energy, "Magkano Konsumo Ko?".
 *
 *   kWh on a day it runs = watts × hours a day × units × full-power share ÷ 1,000
 *   kWh a month          = daily kWh × days a month
 *   kWh a year           = kWh a month × 12;   a week = a year ÷ 52
 *   cost                 = kWh × your rate per kWh
 *
 * When the visitor uses the kWh from an energy label instead, that figure
 * replaces the watts arithmetic: a yearly label figure is spread evenly
 * (÷ 365 a day, ÷ 12 a month).
 */

export type LabelUnit = 'year' | 'month' | 'day'

export interface ApplianceEntry {
  id: string
  typeId: string
  name: string
  /** watts: from the rating; label: from the energy label's kWh. */
  basis: 'watts' | 'label'
  watts: number
  /** 0.05–1: share of on-time at rated power. 1 for continuous appliances. */
  fullPowerShare: number
  hoursPerDay: number
  daysPerMonth: number
  units: number
  /** Energy label figure, used when basis is 'label'. Per unit. */
  labelKwh: number
  labelUnit: LabelUnit
}

export const LIMITS = { watts: 20_000, hours: 24, days: 31, units: 50, labelKwh: 50_000 }

/** Plain-language problem, or null when the entry can be counted. */
export function entryProblem(e: ApplianceEntry): string | null {
  if (!e.name.trim()) return 'Give the appliance a name.'
  if (!Number.isInteger(e.units) || e.units < 1 || e.units > LIMITS.units) return `Units should be a whole number from 1 to ${LIMITS.units}.`
  if (e.basis === 'label') {
    if (!Number.isFinite(e.labelKwh) || e.labelKwh <= 0 || e.labelKwh > LIMITS.labelKwh) return 'Enter the kWh from the energy label, more than 0.'
    return null
  }
  if (!Number.isFinite(e.watts) || e.watts <= 0 || e.watts > LIMITS.watts) return `Watts should be more than 0 and at most ${LIMITS.watts.toLocaleString('en-PH')}.`
  if (!Number.isFinite(e.hoursPerDay) || e.hoursPerDay < 0 || e.hoursPerDay > LIMITS.hours) return 'Hours a day should be from 0 to 24.'
  if (!Number.isInteger(e.daysPerMonth) || e.daysPerMonth < 0 || e.daysPerMonth > LIMITS.days) return 'Days a month should be a whole number from 0 to 31.'
  if (!Number.isFinite(e.fullPowerShare) || e.fullPowerShare <= 0 || e.fullPowerShare > 1) return 'Share of time at full power should be more than 0% and at most 100%.'
  return null
}

const LABEL_PER_YEAR: Record<LabelUnit, number> = { year: 1, month: 12, day: 365 }

/** Exact kWh a month for one entry. */
export function monthlyKwhExact(e: ApplianceEntry): Dec {
  if (e.basis === 'label') return new D(e.labelKwh).times(LABEL_PER_YEAR[e.labelUnit]).times(e.units).div(12)
  return new D(e.watts).times(e.hoursPerDay).times(e.units).times(e.fullPowerShare).div(1000).times(e.daysPerMonth)
}

export interface Usage {
  /** kWh on a day it runs (label basis: an average day). */
  dailyKwh: number
  weeklyKwh: number
  monthlyKwh: number
  annualKwh: number
  dailyCost: number
  weeklyCost: number
  monthlyCost: number
  annualCost: number
}

const r3 = (x: Dec) => x.toDecimalPlaces(3).toNumber()

export function usage(e: ApplianceEntry, rate: number): Usage {
  const month = monthlyKwhExact(e)
  const year = month.times(12)
  const day = e.basis === 'label' ? new D(e.labelKwh).times(LABEL_PER_YEAR[e.labelUnit]).times(e.units).div(365) : new D(e.watts).times(e.hoursPerDay).times(e.units).times(e.fullPowerShare).div(1000)
  const week = year.div(52)
  const r = new D(rate)
  return {
    dailyKwh: r3(day),
    weeklyKwh: r3(week),
    monthlyKwh: r3(month),
    annualKwh: r3(year),
    dailyCost: centavos(day.times(r)).toNumber(),
    weeklyCost: centavos(week.times(r)).toNumber(),
    monthlyCost: centavos(month.times(r)).toNumber(),
    annualCost: centavos(year.times(r)).toNumber(),
  }
}

export interface HouseholdItem {
  entry: ApplianceEntry
  monthlyKwh: number
  monthlyCost: number
  /** Share of the household's monthly kWh (and cost), 0–100. */
  percent: number
}

export interface Household {
  count: number
  dailyKwh: number
  monthlyKwh: number
  annualKwh: number
  dailyCost: number
  monthlyCost: number
  annualCost: number
  /** Highest monthly kWh first. */
  items: HouseholdItem[]
}

export function household(entries: ApplianceEntry[], rate: number): Household {
  const kwh = entries.map(monthlyKwhExact)
  const total = kwh.reduce((s, k) => s.plus(k), ZERO)
  const r = new D(rate)
  const items = entries
    .map((entry, i) => ({ entry, exact: kwh[i] }))
    .sort((a, b) => b.exact.comparedTo(a.exact))
    .map(({ entry, exact }) => ({
      entry,
      monthlyKwh: r3(exact),
      monthlyCost: centavos(exact.times(r)).toNumber(),
      percent: total.isZero() ? 0 : exact.div(total).times(100).toDecimalPlaces(1).toNumber(),
    }))
  const day = total.times(12).div(365)
  return {
    count: entries.length,
    dailyKwh: r3(day),
    monthlyKwh: r3(total),
    annualKwh: r3(total.times(12)),
    dailyCost: centavos(day.times(r)).toNumber(),
    monthlyCost: centavos(total.times(r)).toNumber(),
    annualCost: centavos(total.times(12).times(r)).toNumber(),
    items,
  }
}

export interface Reduction {
  beforeKwh: number
  afterKwh: number
  savedKwh: number
  beforeCost: number
  afterCost: number
  monthlySavings: number
  annualSavings: number
  /** Percent less than before, 0–100. */
  percent: number
}

/**
 * New hours a day per appliance id. Entries on the label basis, or not in the
 * map, are unchanged. Hours can only go down: this simulates using less.
 */
export function simulateReduction(entries: ApplianceEntry[], newHours: Readonly<Record<string, number>>, rate: number): Reduction {
  const before = entries.reduce((s, e) => s.plus(monthlyKwhExact(e)), ZERO)
  const after = entries.reduce((s, e) => {
    const h = newHours[e.id]
    if (e.basis !== 'watts' || h == null || !Number.isFinite(h)) return s.plus(monthlyKwhExact(e))
    return s.plus(monthlyKwhExact({ ...e, hoursPerDay: Math.min(Math.max(h, 0), e.hoursPerDay) }))
  }, ZERO)
  const saved = before.minus(after)
  const r = new D(rate)
  return {
    beforeKwh: r3(before),
    afterKwh: r3(after),
    savedKwh: r3(saved),
    beforeCost: centavos(before.times(r)).toNumber(),
    afterCost: centavos(after.times(r)).toNumber(),
    monthlySavings: centavos(saved.times(r)).toNumber(),
    annualSavings: centavos(saved.times(12).times(r)).toNumber(),
    percent: before.isZero() ? 0 : saved.div(before).times(100).toDecimalPlaces(1).toNumber(),
  }
}

/** A new entry from a directory type and one of its options. */
export function entryFor(typeId: string, optionId?: string): Omit<ApplianceEntry, 'id'> | null {
  const t = applianceType(typeId)
  if (!t) return null
  const o = t.options.find((x) => x.id === optionId) ?? t.options[0]
  return {
    typeId: t.id,
    name: t.options.length > 1 ? `${t.name} (${o.label})` : t.name,
    basis: 'watts',
    watts: o.watts,
    fullPowerShare: t.fullPowerShare,
    hoursPerDay: t.hoursPerDay,
    daysPerMonth: t.daysPerMonth,
    units: 1,
    labelKwh: 0,
    labelUnit: 'year',
  }
}

export const kindOf = (e: ApplianceEntry): PowerKind => applianceType(e.typeId)?.kind ?? 'continuous'

/** Rebuild entries read from storage, dropping anything malformed. */
export function sanitizeEntries(raw: unknown): ApplianceEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ApplianceEntry[] = []
  for (const r of raw.slice(0, 200)) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    const num = (k: string, d = NaN) => (typeof x[k] === 'number' ? (x[k] as number) : d)
    const e: ApplianceEntry = {
      id: typeof x.id === 'string' ? x.id.slice(0, 64) : '',
      typeId: typeof x.typeId === 'string' ? x.typeId.slice(0, 64) : 'custom',
      name: typeof x.name === 'string' ? x.name.slice(0, 80) : '',
      basis: x.basis === 'label' ? 'label' : 'watts',
      watts: num('watts'),
      fullPowerShare: num('fullPowerShare', 1),
      hoursPerDay: num('hoursPerDay'),
      daysPerMonth: num('daysPerMonth'),
      units: num('units', 1),
      labelKwh: num('labelKwh', 0),
      labelUnit: x.labelUnit === 'month' || x.labelUnit === 'day' ? x.labelUnit : 'year',
    }
    if (e.id && !entryProblem(e)) out.push(e)
  }
  return out
}
