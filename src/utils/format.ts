import type { Dec } from '../calculators/money'

const pesoWhole = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const pesoCents = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const plain = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })

type Num = number | Dec

const n = (x: Num) => (typeof x === 'number' ? x : x.toNumber())

/** ₱352,100 — for headline figures. */
export function peso(x: Num): string {
  const v = Math.round(n(x))
  return pesoWhole.format(Object.is(v, -0) ? 0 : v)
}

/** ₱352,100.12 — for tables and anything a statement would show. */
export function pesoExact(x: Num): string {
  return pesoCents.format(n(x))
}

/** Signed peso: +₱1,200 / −₱1,200 */
export function pesoSigned(x: Num, exact = false): string {
  const v = n(x)
  const s = exact ? pesoExact(Math.abs(v)) : peso(Math.abs(v))
  if (Math.abs(v) < (exact ? 0.005 : 0.5)) return s
  return `${v > 0 ? '+' : '−'}${s}`
}

export function pct(x: number, digits = 1): string {
  return `${x.toFixed(digits)}%`
}

export function pctSigned(x: number, digits = 1): string {
  if (Math.abs(x) < Math.pow(10, -digits) / 2) return pct(0, digits)
  return `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}%`
}

/** ₱/L change, e.g. +₱1.20/L, or a range "−₱0.50 to −₱0.24/L". */
export function perLiter(min: number, max: number): string {
  const f = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}₱${Math.abs(v).toFixed(2)}`
  return min === max ? `${f(min)}/L` : `${f(min)} to ${f(max)}/L`
}

export function number(x: Num): string {
  return plain.format(n(x))
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON = MONTHS.map((m) => m.slice(0, 3))

/** "2026-09" → "September 2026" */
export function monthLabel(period: string, short = false): string {
  const [y, m] = period.split('-').map(Number)
  return `${(short ? MON : MONTHS)[m - 1]} ${y}`
}

/** "2026-09" → "Sep ’26" for chart ticks */
export function monthTick(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return `${MON[m - 1]} ’${String(y).slice(2)}`
}

/** "2026-10-27" → "Oct 27, 2026" */
export function dateLabel(iso: string, withYear = true): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return withYear ? `${MON[m - 1]} ${d}, ${y}` : `${MON[m - 1]} ${d}`
}

export const MONTH_NAMES = MONTHS
