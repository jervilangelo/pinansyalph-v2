import type { PayrollRules } from '../types/payroll'
import { D, type Dec, InputError, centavos } from './money'
import { calculatePayroll, type PayFrequency } from './payroll'

/**
 * "Sulit ba ang job offer?" Compare a current job with an offer on what is
 * left each month after statutory deductions and the cost of going to work.
 *
 * Take-home pay comes from the site's own payroll engine (SSS, PhilHealth,
 * Pag-IBIG, BIR withholding), so this file holds no rates. Work costs are the
 * visitor's own estimates. It never recommends a choice.
 */

export type Arrangement = 'onsite' | 'hybrid' | 'remote'

export const WEEKS_PER_MONTH = 52 / 12

export interface JobPackage {
  /** Basic monthly pay. */
  basic: number
  /** Regular allowances that are taxed. */
  taxableAllowances: number
  /** De minimis or other tax-exempt allowances (rice, laundry, within BIR limits). */
  nonTaxableAllowances: number
  arrangement: Arrangement
  /** Days a week at the workplace. Remote is 0; on-site defaults to 5. */
  officeDays: number
  /** Round-trip commute cost per office day: fares, fuel, parking, toll. */
  commutePerDay: number
  /** Other monthly costs because of this job: meals out, internet for remote work, uniforms. */
  otherMonthlyCosts: number
}

export interface JobResult {
  gross: Dec
  taxableGross: Dec
  nonTaxable: Dec
  deductions: Dec
  takeHome: Dec
  workCosts: Dec
  commuteMonthly: Dec
  /** Take-home pay minus work costs: what is left to spend or save. */
  disposable: Dec
  /** 13th month pay for a full year: one month of basic pay (PD 851). */
  thirteenth: Dec
}

export interface OfferComparison {
  current: JobResult
  offer: JobResult
  diff: {
    gross: Dec
    takeHome: Dec
    workCosts: Dec
    disposable: Dec
    /** 12 × monthly disposable difference + the 13th month pay difference. */
    annual: Dec
    /** Percent change in disposable income; null when the current figure is zero or negative. */
    disposablePct: number | null
  }
  assumptions: string[]
}

export function validatePackage(p: JobPackage, label: string): void {
  const amounts: [number, string][] = [
    [p.basic, 'basic pay'],
    [p.taxableAllowances, 'taxable allowances'],
    [p.nonTaxableAllowances, 'non-taxable allowances'],
    [p.commutePerDay, 'commute cost per day'],
    [p.otherMonthlyCosts, 'other monthly costs'],
  ]
  for (const [v, name] of amounts) {
    if (!Number.isFinite(v) || v < 0) throw new InputError(`${label}: ${name} cannot be negative.`)
    if (v > 1_000_000) throw new InputError(`${label}: ${name} looks too large. Check the amount.`)
  }
  if (p.basic <= 0) throw new InputError(`${label}: enter the basic monthly pay.`)
  if (!Number.isInteger(p.officeDays) || p.officeDays < 0 || p.officeDays > 7) throw new InputError(`${label}: office days must be a whole number from 0 to 7.`)
  if (p.arrangement === 'remote' && p.officeDays > 0) throw new InputError(`${label}: a remote job has 0 office days.`)
}

export function evaluateJob(p: JobPackage, rules: PayrollRules, label: string, date?: string, frequency: PayFrequency = 'semiMonthly'): JobResult {
  validatePackage(p, label)
  const pay = calculatePayroll(
    {
      basic: p.basic,
      taxableAllowances: p.taxableAllowances,
      otherTaxable: 0,
      nonTaxableAllowances: p.nonTaxableAllowances,
      overtime: 0,
      frequency,
      minimumWageEarner: false,
      otherDeductions: 0,
      annualBonus: 0,
      date,
    },
    rules,
  )
  const commuteMonthly = centavos(new D(p.commutePerDay).times(p.officeDays).times(WEEKS_PER_MONTH))
  const workCosts = commuteMonthly.plus(p.otherMonthlyCosts)
  return {
    gross: pay.grossMonthly,
    taxableGross: new D(p.basic).plus(p.taxableAllowances),
    nonTaxable: new D(p.nonTaxableAllowances),
    deductions: pay.governmentTotal,
    takeHome: pay.takeHomeMonthly,
    workCosts,
    commuteMonthly,
    disposable: pay.takeHomeMonthly.minus(workCosts),
    thirteenth: new D(p.basic),
  }
}

export function compareOffer(current: JobPackage, offer: JobPackage, rules: PayrollRules, date?: string): OfferComparison {
  const a = evaluateJob(current, rules, 'Current job', date)
  const b = evaluateJob(offer, rules, 'Job offer', date)
  const disposable = b.disposable.minus(a.disposable)
  return {
    current: a,
    offer: b,
    diff: {
      gross: b.gross.minus(a.gross),
      takeHome: b.takeHome.minus(a.takeHome),
      workCosts: b.workCosts.minus(a.workCosts),
      disposable,
      annual: disposable.times(12).plus(b.thirteenth.minus(a.thirteenth)),
      disposablePct: a.disposable.gt(0) ? disposable.div(a.disposable).times(100).toDecimalPlaces(1).toNumber() : null,
    },
    assumptions: [
      'Take-home pay uses the same SSS, PhilHealth, Pag-IBIG and BIR withholding rules as the Sweldo calculator, for a rank-and-file employee paid twice a month.',
      'Commute cost is per office day × office days a week × 52 weeks ÷ 12 months.',
      '13th month pay is one month of basic pay for a full year (PD 851) and is treated as tax-free, within the ₱90,000 ceiling for 13th month pay and other benefits.',
      'Overtime, bonuses beyond the 13th month, commissions, HMO, leave credits and career growth are not counted.',
    ],
  }
}
