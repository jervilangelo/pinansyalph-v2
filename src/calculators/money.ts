import Decimal from 'decimal.js'

/**
 * All money math uses decimal.js so centavo rounding is exact and
 * repeatable. Amounts are rounded to centavos only where a real institution
 * would round: when interest or dividends are credited and tax is withheld.
 */
export const D = Decimal.clone({ precision: 34, rounding: Decimal.ROUND_HALF_UP })
export type Dec = InstanceType<typeof D>

export const ZERO = new D(0)

/** Round to centavos (half-up, as banks and Pag-IBIG statements do). */
export function centavos(x: Dec): Dec {
  return x.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

/** Largest amount the calculators accept, to keep results meaningful. */
export const MAX_AMOUNT = 1_000_000_000_000 // ₱1 trillion

export class InputError extends Error {}

/** Parse a user amount. Accepts commas and the peso sign; rejects negatives and nonsense. */
export function parseAmount(value: string | number, field = 'Amount'): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[₱,\s]/g, ''))
  if (!Number.isFinite(n)) throw new InputError(`${field} must be a number.`)
  if (n < 0) throw new InputError(`${field} cannot be negative.`)
  if (n > MAX_AMOUNT) throw new InputError(`${field} is larger than ₱1 trillion.`)
  return n
}

export function assertAmount(n: number, field: string): void {
  parseAmount(n, field)
}

export function assertRate(n: number, field: string, max = 100): void {
  if (!Number.isFinite(n)) throw new InputError(`${field} must be a number.`)
  if (n <= -100) throw new InputError(`${field} must be greater than -100%.`)
  if (n > max) throw new InputError(`${field} must be ${max}% or less.`)
}

export function assertYears(n: number, max = 30): void {
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new InputError(`Duration must be a whole number of years from 1 to ${max}.`)
  }
}
