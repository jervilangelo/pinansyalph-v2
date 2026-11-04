import { z } from 'zod'
import { VerificationStatus } from './data'

/**
 * Versioned payroll deduction rules. Each component keeps a list of rule
 * versions with the date they take effect; the calculator picks the version
 * in force on the payroll date. Updating a rate = adding a version, not
 * editing calculator code.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const Meta = z.object({
  effectiveFrom: isoDate,
  issuance: z.string().min(3),
  sourceUrl: z.string().url(),
  status: VerificationStatus,
  notes: z.array(z.string()),
})

export const SssRule = Meta.extend({
  employeeRatePct: z.number().min(0).max(30),
  employerRatePct: z.number().min(0).max(30),
  /** Monthly Salary Credit bounds and bracket width. */
  mscMin: z.number().positive(),
  mscMax: z.number().positive(),
  mscStep: z.number().positive(),
  /** MSC above this goes to the Mandatory Provident Fund (WISP), still an employee deduction. */
  regularSsCap: z.number().positive(),
})
export type SssRule = z.infer<typeof SssRule>

export const PhilHealthRule = Meta.extend({
  premiumRatePct: z.number().min(0).max(20),
  employeeSharePct: z.number().min(0).max(100),
  incomeFloor: z.number().positive(),
  incomeCeiling: z.number().positive(),
})
export type PhilHealthRule = z.infer<typeof PhilHealthRule>

export const PagIbigRule = Meta.extend({
  lowBracketMax: z.number().nonnegative(),
  lowRatePct: z.number().min(0).max(10),
  ratePct: z.number().min(0).max(10),
  maxFundSalary: z.number().positive(),
})
export type PagIbigRule = z.infer<typeof PagIbigRule>

export const TaxBracket = z.object({
  /** Lower bound of the bracket (inclusive of amounts above `over`). */
  over: z.number().nonnegative(),
  /** Fixed tax at the start of the bracket. */
  base: z.number().nonnegative(),
  ratePct: z.number().min(0).max(100),
})
export type TaxBracket = z.infer<typeof TaxBracket>

export const PeriodKey = z.enum(['monthly', 'semiMonthly', 'weekly', 'daily'])
export type PeriodKey = z.infer<typeof PeriodKey>

export const TaxRule = Meta.extend({
  /** Annual graduated rates (Sec. 24(A), NIRC as amended by TRAIN). */
  annual: z.array(TaxBracket).min(2),
  /** BIR withholding tables per payroll period (RR 11-2018, Annex E). */
  withholding: z.record(PeriodKey, z.array(TaxBracket).min(2)),
  /** 13th month pay and other benefits exempt up to this amount per year. */
  otherBenefitsExemption: z.number().nonnegative(),
})
export type TaxRule = z.infer<typeof TaxRule>

export const PayrollRules = z.object({
  retrievedAt: z.string().datetime({ offset: true }),
  sss: z.array(SssRule).min(1),
  philhealth: z.array(PhilHealthRule).min(1),
  pagibig: z.array(PagIbigRule).min(1),
  tax: z.array(TaxRule).min(1),
})
export type PayrollRules = z.infer<typeof PayrollRules>
