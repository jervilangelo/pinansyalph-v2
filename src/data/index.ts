/**
 * Typed access to the versioned datasets. The JSON files are written by the
 * scripts in /scripts and validated against the zod schemas by
 * `npm run validate:data` and the unit tests, both of which gate every
 * deploy. The browser does not ship the schema library.
 */
import type { BankDataset, FuelDataset, FuelKey, InflationDataset, Mp2Dataset } from '../types/data'
import inflationJson from './inflation.json'
import fuelJson from './fuel.json'
import mp2Json from './mp2.json'
import banksJson from './banks.json'
import payrollJson from './payroll.json'
import type { PayrollRules } from '../types/payroll'

export const inflation = inflationJson as InflationDataset
export const fuel = fuelJson as FuelDataset
export const mp2 = mp2Json as Mp2Dataset
export const banks = banksJson as BankDataset
export const payrollRules = payrollJson as PayrollRules

/* ---------------- derived figures (never hardcoded) ---------------- */

export const latestHeadline = inflation.series.headline[inflation.series.headline.length - 1]

export function latestOf(key: keyof typeof inflation.series) {
  const s = inflation.series[key]
  return { ...s[s.length - 1], previous: s[s.length - 2] }
}

/** Average of the last five full calendar years of PSA annual headline inflation. */
export const recentAverageInflation = (() => {
  const last5 = inflation.annualHeadline.slice(-5)
  const avg = last5.reduce((s, y) => s + y.value, 0) / last5.length
  return { value: Math.round(avg * 10) / 10, from: last5[0].year, to: last5[last5.length - 1].year }
})()

/**
 * Plain-language context for the latest headline reading, e.g.
 * "the highest since March 2023". Derived from the data, never written by hand.
 */
export function headlineContext(): { since: string | null; tiedWith: string | null } | null {
  const s = inflation.series.headline
  const latest = s[s.length - 1]
  if (s[s.length - 2].value >= latest.value) return null // not a new high
  let tiedWith: string | null = null
  for (let i = s.length - 2; i >= 0; i--) {
    if (s[i].value > latest.value) return { since: s[i].period, tiedWith }
    if (s[i].value === latest.value && !tiedWith) tiedWith = s[i].period
  }
  return { since: null, tiedWith }
}

export const latestPurchasingPower = inflation.purchasingPower[inflation.purchasingPower.length - 1]
export const basePurchasingPowerYear = inflation.baseYear

export const sortedMp2Rates = [...mp2.rates].sort((a, b) => a.year - b.year)
export const latestMp2 = sortedMp2Rates[sortedMp2Rates.length - 1]

export const latestFuel = fuel.adjustments[fuel.adjustments.length - 1]
export const FUELS: { key: FuelKey; label: string }[] = [
  { key: 'gasoline', label: 'Gasoline' },
  { key: 'diesel', label: 'Diesel' },
  { key: 'kerosene', label: 'Kerosene' },
]

/** Savings products, excluding time deposits, sorted by base rate (ascending is NOT a ranking). */
export const savingsBaseRange = (() => {
  const rates = banks.products.filter((p) => p.kind !== 'time-deposit').map((p) => p.baseTiers[0].rate)
  return { min: Math.min(...rates), max: Math.max(...rates) }
})()

export function productById(id: string) {
  return banks.products.find((p) => p.id === id)
}

/** A product is "potentially outdated" if a check says so or it is past its freshness window. */
export function isPotentiallyOutdated(p: (typeof banks.products)[number], today = new Date()): boolean {
  if (p.status === 'stale' || p.status === 'needs-review') return true
  return (today.getTime() - Date.parse(p.verifiedOn)) / 86_400_000 > banks.freshnessDays
}

export function promoState(p: (typeof banks.products)[number], today = new Date()): 'none' | 'active' | 'upcoming' | 'ended' {
  if (!p.promo) return 'none'
  const t = today.getTime()
  if (p.promo.endsOn && Date.parse(`${p.promo.endsOn}T23:59:59+08:00`) < t) return 'ended'
  if (p.promo.startsOn && Date.parse(`${p.promo.startsOn}T00:00:00+08:00`) > t) return 'upcoming'
  return 'active'
}
