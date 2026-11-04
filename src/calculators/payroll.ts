import type { PagIbigRule, PayrollRules, PeriodKey, PhilHealthRule, SssRule, TaxBracket, TaxRule } from '../types/payroll'
import { D, type Dec, InputError, ZERO, assertAmount, centavos } from './money'

/**
 * Philippine take-home pay estimate for a regular employee.
 *
 * All inputs are MONTHLY amounts. The pay frequency only decides which BIR
 * withholding table is used and how results are split per payday.
 * Rules (rates, ceilings, tax tables) come from versioned data
 * (src/data/payroll.json); this file holds no rates of its own.
 */

export type PayFrequency = 'monthly' | 'semiMonthly' | 'weekly' | 'biweekly'

export const PAYS_PER_MONTH: Record<PayFrequency, number> = {
  monthly: 1,
  semiMonthly: 2,
  weekly: 52 / 12,
  biweekly: 26 / 12,
}

export interface SalaryInput {
  /** Basic monthly salary. */
  basic: number
  /** Allowances that are taxable (e.g. a fixed transport allowance not under de minimis rules). */
  taxableAllowances: number
  /** Other taxable compensation per month: commissions, honoraria, taxable incentives. */
  otherTaxable: number
  /** De minimis and other tax-exempt allowances, within BIR limits. */
  nonTaxableAllowances: number
  /** Overtime, holiday and night differential pay per month. */
  overtime: number
  frequency: PayFrequency
  /** Paid the statutory minimum wage: SMW, overtime and holiday pay are tax-exempt. */
  minimumWageEarner: boolean
  /** Other payroll deductions after tax: salary loans, cooperative dues, etc. */
  otherDeductions: number
  /** 13th month pay plus other bonuses for the whole year. */
  annualBonus: number
  /** Payroll date used to pick the rule versions in force (ISO date). */
  date?: string
}

export interface PayrollResult {
  grossMonthly: Dec
  taxableCompensation: Dec
  sss: { employee: Dec; msc: Dec; regular: Dec; mpf: Dec }
  philhealth: Dec
  pagibig: Dec
  mandatoryTotal: Dec
  /** Taxable income after mandatory contributions (and MWE exemption). */
  taxableIncome: Dec
  withholdingPerPay: Dec
  withholdingMonthly: Dec
  governmentTotal: Dec
  otherDeductions: Dec
  totalDeductions: Dec
  takeHomeMonthly: Dec
  paysPerMonth: number
  bonus: { gross: Dec; exempt: Dec; taxable: Dec; estimatedTax: Dec }
  /** Annual income tax due on regular pay from the graduated table, for comparison with withholding. */
  annualTaxOnRegularPay: Dec
  rules: { sss: SssRule; philhealth: PhilHealthRule; pagibig: PagIbigRule; tax: TaxRule }
  assumptions: string[]
}

/** The rule version in force on `date`: the latest one whose effectiveFrom is on or before it. */
export function ruleFor<T extends { effectiveFrom: string }>(versions: T[], date: string): T {
  const eligible = versions.filter((v) => v.effectiveFrom <= date).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  const rule = eligible[eligible.length - 1]
  if (!rule) throw new InputError(`No payroll rules are in force on ${date}.`)
  return rule
}

/** SSS Monthly Salary Credit for a monthly compensation. */
export function sssMsc(compensation: number, r: SssRule): number {
  const half = r.mscStep / 2
  if (compensation < r.mscMin + half) return r.mscMin
  const msc = r.mscMin + r.mscStep * Math.floor((compensation - (r.mscMin - half)) / r.mscStep)
  return Math.min(msc, r.mscMax)
}

export function sssEmployee(compensation: number, r: SssRule) {
  if (compensation <= 0) return { msc: ZERO, regular: ZERO, mpf: ZERO, employee: ZERO }
  const msc = new D(sssMsc(compensation, r))
  const rate = new D(r.employeeRatePct).div(100)
  const regular = centavos(D.min(msc, r.regularSsCap).times(rate))
  const mpf = centavos(D.max(msc.minus(r.regularSsCap), 0).times(rate))
  return { msc, regular, mpf, employee: regular.plus(mpf) }
}

export function philhealthEmployee(basic: number, r: PhilHealthRule): Dec {
  if (basic <= 0) return ZERO
  const base = D.min(D.max(basic, r.incomeFloor), r.incomeCeiling)
  const premium = base.times(r.premiumRatePct).div(100)
  return centavos(premium.times(r.employeeSharePct).div(100))
}

export function pagibigEmployee(compensation: number, r: PagIbigRule): Dec {
  if (compensation <= 0) return ZERO
  const base = D.min(compensation, r.maxFundSalary)
  const rate = compensation <= r.lowBracketMax ? r.lowRatePct : r.ratePct
  return centavos(base.times(rate).div(100))
}

/** Tax from a bracket table: base + rate × (amount − over) for the highest bracket below the amount. */
export function taxFromTable(amount: Dec | number, table: TaxBracket[]): Dec {
  const a = new D(amount)
  if (a.lte(0)) return ZERO
  const sorted = [...table].sort((x, y) => x.over - y.over)
  let bracket = sorted[0]
  for (const b of sorted) if (a.gt(b.over)) bracket = b
  return centavos(new D(bracket.base).plus(a.minus(bracket.over).times(bracket.ratePct).div(100)))
}

const TABLE_FOR: Record<PayFrequency, PeriodKey> = {
  monthly: 'monthly',
  semiMonthly: 'semiMonthly',
  weekly: 'weekly',
  biweekly: 'weekly',
}

/** Withholding for one payday under the BIR table for the pay frequency. */
export function withholdingPerPay(taxablePerPay: Dec, frequency: PayFrequency, rule: TaxRule): Dec {
  const table = rule.withholding[TABLE_FOR[frequency]]
  if (!table) throw new InputError(`No withholding table for ${frequency}.`)
  if (frequency === 'biweekly') return taxFromTable(taxablePerPay.div(2), table).times(2)
  return taxFromTable(taxablePerPay, table)
}

export function validateSalary(input: SalaryInput): void {
  assertAmount(input.basic, 'Basic salary')
  assertAmount(input.taxableAllowances, 'Taxable allowances')
  assertAmount(input.otherTaxable, 'Other taxable income')
  assertAmount(input.nonTaxableAllowances, 'Non-taxable allowances')
  assertAmount(input.overtime, 'Overtime pay')
  assertAmount(input.otherDeductions, 'Other deductions')
  assertAmount(input.annualBonus, 'Bonuses')
  if (!(input.frequency in PAYS_PER_MONTH)) throw new InputError('Choose a pay frequency.')
}

export function calculatePayroll(input: SalaryInput, rules: PayrollRules): PayrollResult {
  validateSalary(input)
  const date = input.date ?? new Date().toISOString().slice(0, 10)
  const r = {
    sss: ruleFor(rules.sss, date),
    philhealth: ruleFor(rules.philhealth, date),
    pagibig: ruleFor(rules.pagibig, date),
    tax: ruleFor(rules.tax, date),
  }
  const assumptions: string[] = []

  const taxableCompensation = new D(input.basic).plus(input.taxableAllowances).plus(input.otherTaxable).plus(input.overtime)
  const grossMonthly = taxableCompensation.plus(input.nonTaxableAllowances)

  // Contribution bases
  const sss = sssEmployee(taxableCompensation.toNumber(), r.sss)
  const philhealth = philhealthEmployee(input.basic, r.philhealth)
  const pagibig = pagibigEmployee(input.basic, r.pagibig)
  const mandatoryTotal = sss.employee.plus(philhealth).plus(pagibig)

  // Taxable income
  let taxableIncome: Dec
  if (input.minimumWageEarner) {
    taxableIncome = D.max(new D(input.taxableAllowances).plus(input.otherTaxable), 0)
    assumptions.push('As a minimum wage earner, your basic pay and overtime are tax-exempt; other taxable income is still taxed.')
  } else {
    taxableIncome = D.max(taxableCompensation.minus(mandatoryTotal), 0)
  }

  const pays = PAYS_PER_MONTH[input.frequency]
  const perPayTaxable = taxableIncome.div(pays)
  const wPerPay = withholdingPerPay(perPayTaxable, input.frequency, r.tax)
  const withholdingMonthly = centavos(wPerPay.times(pays))

  // Bonuses: exempt up to the annual ceiling, excess taxed at the marginal rate of the year
  const bonusGross = new D(input.annualBonus)
  const bonusExempt = D.min(bonusGross, r.tax.otherBenefitsExemption)
  const bonusTaxable = bonusGross.minus(bonusExempt)
  const annualRegular = taxableIncome.times(12)
  const annualTaxOnRegularPay = taxFromTable(annualRegular, r.tax.annual)
  const bonusTax = input.minimumWageEarner && bonusTaxable.isZero()
    ? ZERO
    : taxFromTable(annualRegular.plus(bonusTaxable), r.tax.annual).minus(annualTaxOnRegularPay)

  const governmentTotal = mandatoryTotal.plus(withholdingMonthly)
  const otherDeductions = new D(input.otherDeductions)
  const totalDeductions = governmentTotal.plus(otherDeductions)
  const takeHomeMonthly = grossMonthly.minus(totalDeductions)

  if (input.frequency === 'biweekly') assumptions.push('Biweekly pay uses the BIR weekly table applied to each week.')
  if (input.frequency !== 'monthly') assumptions.push('Contributions are monthly; per-payday figures split them evenly across paydays. Your employer may deduct them on one payday instead.')
  if (input.nonTaxableAllowances > 0) assumptions.push('Non-taxable allowances are treated as de minimis benefits within BIR limits. Amounts above those limits are taxable.')
  if (input.basic > 0 && input.basic < r.philhealth.incomeFloor) assumptions.push(`PhilHealth uses its ₱${r.philhealth.incomeFloor.toLocaleString('en-PH')} income floor.`)
  if (takeHomeMonthly.lt(0)) assumptions.push('Deductions exceed pay. Check the amounts entered.')

  return {
    grossMonthly,
    taxableCompensation,
    sss,
    philhealth,
    pagibig,
    mandatoryTotal,
    taxableIncome,
    withholdingPerPay: wPerPay,
    withholdingMonthly,
    governmentTotal,
    otherDeductions,
    totalDeductions,
    takeHomeMonthly,
    paysPerMonth: pays,
    bonus: { gross: bonusGross, exempt: bonusExempt, taxable: bonusTaxable, estimatedTax: bonusTax },
    annualTaxOnRegularPay,
    rules: r,
    assumptions,
  }
}

/** Convert a monthly amount to one payday. */
export function perPay(monthly: Dec | number, frequency: PayFrequency): Dec {
  return new D(monthly).div(PAYS_PER_MONTH[frequency])
}
