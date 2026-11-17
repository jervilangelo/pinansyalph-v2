import { residentialBill, type BillResult } from '../../../calculators/electricity'
import { D, type Dec } from '../../../calculators/money'
import electricityJson from '../../../data/electricity.json'
import type { ElectricityDataset, Provider, ResidentialSchedule } from '../../../types/electricity'
import { monthLabel } from '../../../utils/format'

export const electricity = electricityJson as ElectricityDataset
export const MERALCO = electricity.providers.find((p) => p.id === 'meralco') as Provider
export const LATEST = MERALCO.schedules[0]

export type ProviderChoice = 'meralco' | 'manual'

/** What the visitor's bill is computed with: a published schedule, or a rate they typed in. */
export interface Tariff {
  provider: ProviderChoice
  month: string
  lifeline: boolean
  /** Local franchise tax, as a fraction. */
  lftRate: number
  /** ₱ per kWh, for providers without a published schedule here. */
  manualRate: number
}

export const defaultTariff: Tariff = { provider: 'meralco', month: LATEST.month, lifeline: false, lftRate: LATEST.lftRate, manualRate: 0 }

export const scheduleFor = (month: string): ResidentialSchedule | undefined => MERALCO.schedules.find((s) => s.month === month)

export interface Priced {
  total: Dec
  perKwh: Dec
  /** Full line-by-line bill when a published schedule was used. */
  bill?: BillResult
  /** True when the figure is kWh × a typed rate, not a utility schedule. */
  estimate: boolean
  label: string
}

/** The bill for a number of kWh under the tariff, or null when it cannot be priced yet. */
export function priceKwh(t: Tariff, kwh: number): Priced | null {
  if (!Number.isFinite(kwh) || kwh <= 0) return null
  const whole = Math.round(kwh)
  if (t.provider === 'manual') {
    if (!(t.manualRate > 0)) return null
    const total = new D(kwh).times(t.manualRate).toDecimalPlaces(2)
    return { total, perKwh: new D(t.manualRate), estimate: true, label: `your rate of ₱${t.manualRate}/kWh` }
  }
  const s = scheduleFor(t.month)
  if (!s || whole <= 0) return null
  const bill = residentialBill(s, whole, { lifeline: t.lifeline, lftRate: t.lftRate })
  return { total: bill.total, perKwh: bill.perKwh, bill, estimate: false, label: `Meralco ${monthLabel(s.month)} residential rates` }
}

/** "2026-11" for today, in Philippine time. */
export function currentMonth(now = new Date()): string {
  const ph = new Date(now.getTime() + 8 * 3600_000)
  return `${ph.getUTCFullYear()}-${String(ph.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Months newer than the latest published schedule; non-empty means the data may be behind. */
export const isBehind = (now = new Date()) => currentMonth(now) > LATEST.month
