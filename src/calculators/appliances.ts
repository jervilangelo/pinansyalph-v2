import { D, type Dec, InputError, ZERO, centavos } from './money'

/**
 * Appliance energy: an estimate, not a measurement.
 *
 *   kWh per month = watts × quantity × hours a day × days a month × running share ÷ 1,000
 *
 * "Running share" is the part of the time the appliance draws its rated
 * power. A fan or a light runs at its rating (100%). A refrigerator or an
 * aircon compressor cycles on and off, and an inverter unit runs below its
 * rating most of the time, so nameplate watts × hours overstates their use.
 * The defaults below are starting points to edit, not measured figures.
 */

export interface Appliance {
  id: string
  name: string
  watts: number
  quantity: number
  hoursPerDay: number
  daysPerMonth: number
  /** 0–1: share of the running time spent at rated power. */
  runningShare: number
}

export interface AppliancePreset {
  key: string
  name: string
  watts: number
  hoursPerDay: number
  daysPerMonth: number
  runningShare: number
  note?: string
}

/** Typical ratings to start from. Check the label (watts, or volts × amps) on your own unit. */
export const APPLIANCE_PRESETS: AppliancePreset[] = [
  { key: 'aircon-inverter', name: 'Aircon, inverter (1 HP)', watts: 900, hoursPerDay: 8, daysPerMonth: 30, runningShare: 0.5, note: 'Inverter units run below their rating once the room is cool.' },
  { key: 'aircon', name: 'Aircon, non-inverter (1 HP)', watts: 900, hoursPerDay: 8, daysPerMonth: 30, runningShare: 0.85, note: 'The compressor cycles off when the room reaches the set temperature.' },
  { key: 'fridge-inverter', name: 'Refrigerator, inverter', watts: 100, hoursPerDay: 24, daysPerMonth: 30, runningShare: 0.35, note: 'Plugged in all day; the compressor runs part of the time.' },
  { key: 'fridge', name: 'Refrigerator, non-inverter', watts: 150, hoursPerDay: 24, daysPerMonth: 30, runningShare: 0.45, note: 'Plugged in all day; the compressor runs part of the time.' },
  { key: 'fan', name: 'Electric fan', watts: 50, hoursPerDay: 8, daysPerMonth: 30, runningShare: 1 },
  { key: 'tv', name: 'Television (LED, 43")', watts: 80, hoursPerDay: 5, daysPerMonth: 30, runningShare: 1 },
  { key: 'washer', name: 'Washing machine', watts: 400, hoursPerDay: 1, daysPerMonth: 8, runningShare: 1 },
  { key: 'rice-cooker', name: 'Rice cooker', watts: 650, hoursPerDay: 0.5, daysPerMonth: 30, runningShare: 1, note: 'Keep-warm uses less; add it as hours at a lower wattage if you leave it on.' },
  { key: 'laptop', name: 'Laptop', watts: 60, hoursPerDay: 8, daysPerMonth: 22, runningShare: 1 },
  { key: 'desktop', name: 'Desktop computer', watts: 250, hoursPerDay: 6, daysPerMonth: 30, runningShare: 1 },
  { key: 'water-heater', name: 'Water heater (shower)', watts: 3500, hoursPerDay: 0.25, daysPerMonth: 30, runningShare: 1 },
  { key: 'induction', name: 'Induction cooker', watts: 1500, hoursPerDay: 1, daysPerMonth: 30, runningShare: 0.7, note: 'Most cooking is below full power.' },
  { key: 'lights', name: 'LED bulbs', watts: 9, hoursPerDay: 6, daysPerMonth: 30, runningShare: 1 },
  { key: 'router', name: 'Wi-Fi router', watts: 12, hoursPerDay: 24, daysPerMonth: 30, runningShare: 1 },
  { key: 'flat-iron', name: 'Flat iron', watts: 1000, hoursPerDay: 0.5, daysPerMonth: 8, runningShare: 1 },
]

export function validateAppliance(a: Appliance): void {
  const label = a.name || 'Appliance'
  if (!Number.isFinite(a.watts) || a.watts <= 0 || a.watts > 20_000) throw new InputError(`${label}: watts should be more than 0 and at most 20,000.`)
  if (!Number.isInteger(a.quantity) || a.quantity < 1 || a.quantity > 100) throw new InputError(`${label}: quantity should be a whole number from 1 to 100.`)
  if (!Number.isFinite(a.hoursPerDay) || a.hoursPerDay < 0 || a.hoursPerDay > 24) throw new InputError(`${label}: hours a day should be from 0 to 24.`)
  if (!Number.isInteger(a.daysPerMonth) || a.daysPerMonth < 0 || a.daysPerMonth > 31) throw new InputError(`${label}: days a month should be a whole number from 0 to 31.`)
  if (!Number.isFinite(a.runningShare) || a.runningShare <= 0 || a.runningShare > 1) throw new InputError(`${label}: running share should be more than 0% and at most 100%.`)
}

/** Estimated kWh a month, to two decimals. */
export function applianceKwh(a: Appliance): Dec {
  validateAppliance(a)
  return new D(a.watts).times(a.quantity).times(a.hoursPerDay).times(a.daysPerMonth).times(a.runningShare).div(1000).toDecimalPlaces(2)
}

export interface ApplianceEstimate {
  appliance: Appliance
  kwh: Dec
  cost: Dec
  share: number
}

/**
 * Each appliance's kWh and its share of the cost, at an average rate per kWh
 * (the household's bill ÷ its kWh). A share of a bill, not a separate meter.
 */
export function estimateAppliances(list: Appliance[], ratePerKwh: Dec): { items: ApplianceEstimate[]; totalKwh: Dec; totalCost: Dec } {
  if (ratePerKwh.lte(0)) throw new InputError('The rate per kWh must be more than ₱0.')
  const kwhs = list.map(applianceKwh)
  const totalKwh = kwhs.reduce((s, k) => s.plus(k), ZERO)
  const items = list.map((appliance, i) => ({
    appliance,
    kwh: kwhs[i],
    cost: centavos(kwhs[i].times(ratePerKwh)),
    share: totalKwh.isZero() ? 0 : kwhs[i].div(totalKwh).toNumber(),
  }))
  return { items, totalKwh, totalCost: centavos(totalKwh.times(ratePerKwh)) }
}

// ── Savings ─────────────────────────────────────────────────────────────

export type Change =
  | { kind: 'hours'; applianceId: string; hoursPerDay: number }
  | { kind: 'replace'; applianceId: string; watts: number; runningShare: number }
  | { kind: 'remove'; applianceId: string }
  | { kind: 'daily'; kwhPerDay: number; days: number }

/** kWh a month saved by a change to an appliance list. Never more than the appliance used. */
export function kwhSaved(list: Appliance[], change: Change): Dec {
  if (change.kind === 'daily') {
    if (!Number.isFinite(change.kwhPerDay) || change.kwhPerDay <= 0 || change.kwhPerDay > 500) throw new InputError('Daily reduction should be more than 0 and at most 500 kWh.')
    if (!Number.isInteger(change.days) || change.days < 1 || change.days > 31) throw new InputError('Days should be a whole number from 1 to 31.')
    return new D(change.kwhPerDay).times(change.days).toDecimalPlaces(2)
  }
  const a = list.find((x) => x.id === change.applianceId)
  if (!a) throw new InputError('Choose an appliance from your list.')
  const before = applianceKwh(a)
  if (change.kind === 'remove') return before
  const after = applianceKwh(change.kind === 'hours' ? { ...a, hoursPerDay: change.hoursPerDay } : { ...a, watts: change.watts, runningShare: change.runningShare })
  return before.minus(after)
}
