import { D, ZERO, InputError, assertAmount, centavos, type Dec } from './money'
import { ruleFor, taxFromTable } from './payroll'
import type { PayrollRules } from '../types/payroll'

/**
 * 13th month pay under Presidential Decree No. 851 and its Revised Guidelines,
 * as restated in DOLE Labor Advisory No. 16, Series of 2025:
 *
 *   13th month pay = total basic salary earned during the calendar year ÷ 12
 *
 * "Basic salary earned" is what the employee was actually paid as basic pay
 * for work done in the year (including pay for paid leave), net of deductions
 * for unpaid absences. It excludes allowances and monetary benefits not
 * integrated into basic salary: COLA, overtime, premium and holiday pay,
 * night differential, profit sharing and the cash conversion of unused
 * leave, unless a company policy, contract or CBA treats them as basic pay.
 * The employer-paid maternity salary differential under RA 11210 counts as
 * basic salary; the SSS maternity benefit itself does not.
 *
 * Tax: NIRC Sec. 32(B)(7)(e) as amended by RA 10963 (TRAIN) exempts 13th
 * month pay and other benefits combined up to the ceiling stored in
 * payroll.json (₱90,000 since 2018). The excess is ordinary taxable
 * compensation taxed at the graduated rates, not a flat tax.
 */

export interface MonthEntry {
  /**
   * Actual eligible basic salary earned this month. When set, it replaces the
   * computed salary (including any partial-month estimate).
   */
  actual?: number | null
  /** Pay deducted for unpaid absences (leave without pay, tardiness, suspension). */
  unpaidAbsences?: number
  /** Eligible basic-salary adjustments: retroactive increases, corrections (may be negative). */
  adjustment?: number
  /** Employer-paid maternity salary differential (RA 11210). Not the SSS benefit. */
  maternityDifferential?: number
}

export interface SalaryChange {
  /** Month (1–12) of the calculation year from which the new salary applies. */
  month: number
  monthly: number
}

export interface ThirteenthInput {
  year: number
  /** Monthly basic salary at the start of the year (or at hiring). */
  monthlyBasic: number
  /** ISO date the employee started. May be before the calculation year. */
  startDate: string
  /** ISO date employment ended (last day worked), if it has. */
  endDate?: string | null
  /** Today, ISO. Months ending on or before this date count as earned. */
  asOf: string
  salaryChanges?: SalaryChange[]
  /** Index 0 = January. */
  months?: (MonthEntry | undefined)[]
  /** 13th month pay already received for this year (advances, installments). */
  previouslyPaid?: number
  /** Other benefits that share the exemption ceiling: Christmas bonus, productivity incentives, de minimis in excess of limits. */
  otherBenefits?: number
  /**
   * Other taxable compensation for the year, after SSS, PhilHealth and Pag-IBIG
   * contributions. Optional: only when given is an additional tax estimated.
   */
  annualTaxableCompensation?: number | null
  minimumWageEarner?: boolean
}

export type MonthStatus = 'actual' | 'projected' | 'not-employed'

export interface MonthRow {
  month: number
  status: MonthStatus
  /** Basic salary for the days employed (or the actual figure entered). */
  basic: Dec
  /** Days employed / days in month when the month is partial and no actual figure was entered. */
  partial: { days: number; daysInMonth: number } | null
  usesActual: boolean
  unpaidAbsences: Dec
  adjustment: Dec
  maternityDifferential: Dec
  /** basic − unpaid absences + adjustments + maternity differential */
  total: Dec
}

export interface ThirteenthResult {
  months: MonthRow[]
  totalEligible: Dec
  totalEarnedToDate: Dec
  totalProjected: Dec
  /** Total eligible basic salary ÷ 12, for the whole year (earned + projected). */
  fullYear: Dec
  /** Earned-to-date eligible basic salary ÷ 12. */
  earnedToDate: Dec
  previouslyPaid: Dec
  /** Full-year amount minus what was already paid, never below zero. */
  remaining: Dec
  /** Paid in advance beyond the computed full-year amount. */
  overpaid: Dec
  monthsEmployed: number
  /** Worked less than one month in the year: PD 851 coverage requires at least one month. */
  belowOneMonth: boolean
  hasProjection: boolean
  hasPartialEstimate: boolean
  separated: boolean
  tax: {
    ceiling: number
    thirteenth: Dec
    otherBenefits: Dec
    combined: Dec
    exempt: Dec
    potentiallyTaxable: Dec
    /** Only when annual taxable compensation was given. */
    estimatedAdditionalTax: Dec | null
    minimumWageEarner: boolean
  }
}

export const FIRST_YEAR = 2023

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse YYYY-MM-DD strictly (rejects 2026-02-30). Returns a UTC day number and its parts. */
export function parseDate(s: string, field: string): { y: number; m: number; d: number; day: number } {
  const match = ISO.exec(s ?? '')
  if (!match) throw new InputError(`${field} must be a valid date.`)
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const t = Date.UTC(y, m - 1, d)
  const back = new Date(t)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) throw new InputError(`${field} is not a real calendar date.`)
  return { y, m, d, day: t / 86_400_000 }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const dayNum = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86_400_000

export function validateThirteenth(input: ThirteenthInput, maxYear: number): void {
  if (!Number.isInteger(input.year) || input.year < FIRST_YEAR || input.year > maxYear) {
    throw new InputError(`Choose a year from ${FIRST_YEAR} to ${maxYear}.`)
  }
  assertAmount(input.monthlyBasic, 'Monthly basic salary')
  const start = parseDate(input.startDate, 'Start date')
  const end = input.endDate ? parseDate(input.endDate, 'End date') : null
  parseDate(input.asOf, 'Today')
  if (end && end.day < start.day) throw new InputError('End date cannot be before the start date.')
  if (start.day > dayNum(input.year, 12, 31)) throw new InputError(`The start date is after ${input.year}. Choose a later calculation year.`)
  if (end && end.day < dayNum(input.year, 1, 1)) throw new InputError(`Employment ended before ${input.year}. Choose an earlier calculation year.`)
  for (const c of input.salaryChanges ?? []) {
    if (!Number.isInteger(c.month) || c.month < 1 || c.month > 12) throw new InputError('Salary changes need a month from January to December.')
    assertAmount(c.monthly, 'New monthly salary')
  }
  ;(input.months ?? []).forEach((e, i) => {
    if (!e) return
    const name = MONTH_SHORT[i]
    if (e.actual != null) assertAmount(e.actual, `${name} actual salary`)
    assertAmount(e.unpaidAbsences ?? 0, `${name} unpaid absences`)
    assertAmount(e.maternityDifferential ?? 0, `${name} maternity differential`)
    if (!Number.isFinite(e.adjustment ?? 0)) throw new InputError(`${name} adjustment must be a number.`)
  })
  assertAmount(input.previouslyPaid ?? 0, 'Amount already paid')
  assertAmount(input.otherBenefits ?? 0, 'Other benefits')
  if (input.annualTaxableCompensation != null) assertAmount(input.annualTaxableCompensation, 'Annual taxable compensation')
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Monthly basic salary in force for a month, applying salary changes in order. */
function salaryFor(month: number, input: ThirteenthInput): number {
  const changes = [...(input.salaryChanges ?? [])].sort((a, b) => a.month - b.month)
  let s = input.monthlyBasic
  for (const c of changes) if (c.month <= month) s = c.monthly
  return s
}

export function calculateThirteenth(input: ThirteenthInput, rules: PayrollRules): ThirteenthResult {
  const maxYear = Number(input.asOf.slice(0, 4)) + 1
  validateThirteenth(input, maxYear)
  const { year } = input
  const start = parseDate(input.startDate, 'Start date')
  const end = input.endDate ? parseDate(input.endDate, 'End date') : null
  const asOf = parseDate(input.asOf, 'Today')

  const months: MonthRow[] = []
  let employedDays = 0
  let hasFullMonth = false
  for (let m = 1; m <= 12; m++) {
    const dim = daysInMonth(year, m)
    const first = dayNum(year, m, 1)
    const last = dayNum(year, m, dim)
    const from = Math.max(first, start.day)
    const to = Math.min(last, end ? end.day : last)
    const entry = input.months?.[m - 1] ?? {}
    if (to < from) {
      months.push({ month: m, status: 'not-employed', basic: ZERO, partial: null, usesActual: false, unpaidAbsences: ZERO, adjustment: ZERO, maternityDifferential: ZERO, total: ZERO })
      continue
    }
    const days = to - from + 1
    employedDays += days
    if (days === dim) hasFullMonth = true
    const usesActual = entry.actual != null
    const partial = !usesActual && days < dim ? { days, daysInMonth: dim } : null
    // Partial months without payroll data: a calendar-day estimate, flagged in the result so the user can replace it.
    const basic = usesActual ? new D(entry.actual!) : new D(salaryFor(m, input)).times(days).div(dim)
    const unpaid = new D(entry.unpaidAbsences ?? 0)
    const adjustment = new D(entry.adjustment ?? 0)
    const maternity = new D(entry.maternityDifferential ?? 0)
    const total = basic.minus(unpaid).plus(adjustment).plus(maternity)
    if (total.lt(0)) throw new InputError(`${MONTH_SHORT[m - 1]}: deductions are larger than the salary for the month.`)
    // A month counts as earned once it has ended (or employment ended within it) on or before today.
    const status: MonthStatus = to <= asOf.day ? 'actual' : 'projected'
    months.push({ month: m, status, basic, partial, usesActual, unpaidAbsences: unpaid, adjustment, maternityDifferential: maternity, total })
  }

  const sum = (rows: MonthRow[]) => rows.reduce((a, r) => a.plus(r.total), ZERO)
  const employed = months.filter((r) => r.status !== 'not-employed')
  const totalEligible = sum(employed)
  const totalEarnedToDate = sum(employed.filter((r) => r.status === 'actual'))
  const totalProjected = totalEligible.minus(totalEarnedToDate)

  const fullYear = centavos(totalEligible.div(12))
  const earnedToDate = centavos(totalEarnedToDate.div(12))
  const previouslyPaid = centavos(new D(input.previouslyPaid ?? 0))
  const remaining = D.max(fullYear.minus(previouslyPaid), 0)
  const overpaid = D.max(previouslyPaid.minus(fullYear), 0)

  // At least one month of service in the calendar year (Revised Guidelines on PD 851).
  const belowOneMonth = employedDays > 0 && employedDays < 30 && !hasFullMonth

  const taxRule = ruleFor(rules.tax, `${year}-12-31`)
  const ceiling = taxRule.otherBenefitsExemption
  const otherBenefits = centavos(new D(input.otherBenefits ?? 0))
  const combined = fullYear.plus(otherBenefits)
  const exempt = D.min(combined, ceiling)
  const potentiallyTaxable = combined.minus(exempt)
  let estimatedAdditionalTax: Dec | null = null
  if (input.annualTaxableCompensation != null) {
    if (input.minimumWageEarner && potentiallyTaxable.isZero()) estimatedAdditionalTax = ZERO
    else {
      // Minimum wage earners are exempt on their statutory pay, so only the excess benefits are taxed for them.
      const regular = input.minimumWageEarner ? ZERO : new D(input.annualTaxableCompensation)
      estimatedAdditionalTax = centavos(taxFromTable(regular.plus(potentiallyTaxable), taxRule.annual).minus(taxFromTable(regular, taxRule.annual)))
    }
  }

  return {
    months,
    totalEligible: centavos(totalEligible),
    totalEarnedToDate: centavos(totalEarnedToDate),
    totalProjected: centavos(totalProjected),
    fullYear,
    earnedToDate,
    previouslyPaid,
    remaining,
    overpaid,
    monthsEmployed: employed.length,
    belowOneMonth,
    hasProjection: employed.some((r) => r.status === 'projected'),
    hasPartialEstimate: employed.some((r) => r.partial !== null),
    separated: !!end && end.day <= dayNum(year, 12, 31),
    tax: {
      ceiling,
      thirteenth: fullYear,
      otherBenefits,
      combined,
      exempt,
      potentiallyTaxable,
      estimatedAdditionalTax,
      minimumWageEarner: !!input.minimumWageEarner,
    },
  }
}
