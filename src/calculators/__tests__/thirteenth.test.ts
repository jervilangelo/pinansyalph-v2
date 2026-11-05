import { describe, expect, it } from 'vitest'
import rulesJson from '../../data/payroll.json'
import { PayrollRules } from '../../types/payroll'
import { InputError } from '../money'
import { taxFromTable, ruleFor } from '../payroll'
import { calculateThirteenth, daysInMonth, parseDate, type ThirteenthInput } from '../thirteenth'

const rules = PayrollRules.parse(rulesJson)
// A fixed "today" after the year closes, so every month is earned unless a test says otherwise.
const base: ThirteenthInput = { year: 2026, monthlyBasic: 25_000, startDate: '2020-03-01', asOf: '2027-01-10' }
const run = (patch: Partial<ThirteenthInput>) => calculateThirteenth({ ...base, ...patch }, rules)
const n = (d: { toNumber(): number }) => d.toNumber()

describe('13th month pay = total basic salary earned in the calendar year ÷ 12', () => {
  it('1. full-year employee gets one month of basic salary', () => {
    const r = run({})
    expect(n(r.totalEligible)).toBe(300_000)
    expect(n(r.fullYear)).toBe(25_000)
    expect(r.monthsEmployed).toBe(12)
  })

  it('2 / Example A. six fully paid months at ₱25,000 → ₱12,500', () => {
    const r = run({ startDate: '2026-07-01' })
    expect(r.monthsEmployed).toBe(6)
    expect(n(r.totalEligible)).toBe(150_000)
    expect(n(r.fullYear)).toBe(12_500)
  })

  it('3. midyear hire on the 1st counts only months from hiring', () => {
    const r = run({ startDate: '2026-04-01', monthlyBasic: 18_000 })
    expect(r.months.slice(0, 3).every((m) => m.status === 'not-employed')).toBe(true)
    expect(n(r.fullYear)).toBe(13_500) // 9 × 18,000 ÷ 12
  })

  it('4. midyear resignation: proportionate pay up to the last day, payable on separation', () => {
    const r = run({ endDate: '2026-05-31' })
    expect(r.separated).toBe(true)
    expect(r.months.slice(5).every((m) => m.status === 'not-employed')).toBe(true)
    expect(n(r.fullYear)).toBeCloseTo(10_416.67, 2) // 5 × 25,000 ÷ 12
  })

  it('5 / Example B. ₱20,000 Jan–Jun then ₱25,000 Jul–Dec → ₱22,500', () => {
    const r = run({ monthlyBasic: 20_000, salaryChanges: [{ month: 7, monthly: 25_000 }] })
    expect(n(r.totalEligible)).toBe(270_000)
    expect(n(r.fullYear)).toBe(22_500)
  })

  it('6. salary decrease is applied from its month', () => {
    const r = run({ monthlyBasic: 30_000, salaryChanges: [{ month: 10, monthly: 24_000 }] })
    expect(n(r.totalEligible)).toBe(9 * 30_000 + 3 * 24_000)
    expect(n(r.fullYear)).toBe(28_500)
  })

  it('7. partial first month is estimated by calendar days and flagged; an actual figure replaces it', () => {
    const r = run({ startDate: '2026-09-16', monthlyBasic: 30_000 })
    const sep = r.months[8]
    expect(sep.partial).toEqual({ days: 15, daysInMonth: 30 })
    expect(n(sep.basic)).toBe(15_000)
    expect(r.hasPartialEstimate).toBe(true)
    expect(n(r.fullYear)).toBe(8_750) // (15,000 + 3 × 30,000) ÷ 12

    const withActual = run({ startDate: '2026-09-16', monthlyBasic: 30_000, months: Object.assign([], { 8: { actual: 16_363.64 } }) })
    expect(withActual.months[8].partial).toBeNull()
    expect(withActual.hasPartialEstimate).toBe(false)
    expect(n(withActual.totalEligible)).toBe(106_363.64)
  })

  it('8. unpaid absences reduce the basic salary earned', () => {
    const r = run({ months: Object.assign([], { 2: { unpaidAbsences: 2_272.73 }, 7: { unpaidAbsences: 1_136.36 } }) })
    expect(n(r.totalEligible)).toBeCloseTo(300_000 - 3_409.09, 2)
    expect(n(r.fullYear)).toBeCloseTo(24_715.91, 2)
  })

  it('9. paid leave does not reduce it: the salary was still paid', () => {
    // Paid vacation or sick leave is simply a normal month; nothing is deducted.
    expect(n(run({}).fullYear)).toBe(25_000)
  })

  it('10. employer-paid maternity salary differential counts as basic salary', () => {
    // 105 days of maternity leave over Mar–Jun. Salary for those months is replaced by the SSS benefit
    // (excluded) plus the employer's differential (included). Example: the differential is entered as
    // the eligible amount and the month's own salary as 0 via an actual figure.
    const months = Object.assign([], {
      2: { actual: 12_000, maternityDifferential: 3_200 },
      3: { actual: 0, maternityDifferential: 4_100 },
      4: { actual: 0, maternityDifferential: 4_100 },
      5: { actual: 8_000, maternityDifferential: 2_000 },
    })
    const r = run({ months })
    expect(n(r.totalEligible)).toBe(8 * 25_000 + 12_000 + 8_000 + 3_200 + 4_100 + 4_100 + 2_000)
    expect(n(r.months[3].total)).toBe(4_100)
  })

  it('11. an earlier installment is subtracted from what remains', () => {
    const r = run({ previouslyPaid: 12_500 })
    expect(n(r.remaining)).toBe(12_500)
    expect(n(r.overpaid)).toBe(0)
    const over = run({ previouslyPaid: 26_000 })
    expect(n(over.remaining)).toBe(0)
    expect(n(over.overpaid)).toBe(1_000)
  })

  it('12. 13th month pay up to the ₱90,000 ceiling is fully exempt; only the excess is potentially taxable', () => {
    const r = run({ monthlyBasic: 100_000 })
    expect(r.tax.ceiling).toBe(90_000)
    expect(n(r.tax.exempt)).toBe(90_000)
    expect(n(r.tax.potentiallyTaxable)).toBe(10_000)
    expect(r.tax.estimatedAdditionalTax).toBeNull() // no flat tax without the annual picture
    expect(n(run({}).tax.potentiallyTaxable)).toBe(0)
  })

  it('13. other benefits share the same ceiling, and tax on the excess uses the graduated annual table', () => {
    const r = run({ otherBenefits: 70_000, annualTaxableCompensation: 600_000 })
    expect(n(r.tax.combined)).toBe(95_000)
    expect(n(r.tax.potentiallyTaxable)).toBe(5_000)
    const table = ruleFor(rules.tax, '2026-12-31').annual
    const expected = taxFromTable(605_000, table).minus(taxFromTable(600_000, table)).toNumber()
    expect(n(r.tax.estimatedAdditionalTax!)).toBeCloseTo(expected, 2)
    expect(expected).toBe(1_000) // 20% bracket
  })

  it('14. zero salary gives zero, without errors', () => {
    const r = run({ monthlyBasic: 0 })
    expect(n(r.fullYear)).toBe(0)
    expect(n(r.tax.potentiallyTaxable)).toBe(0)
  })

  it('15. invalid or impossible dates are rejected in words', () => {
    expect(() => run({ startDate: '2026-02-30' })).toThrow(/not a real calendar date/)
    expect(() => run({ startDate: 'yesterday' })).toThrow(InputError)
    expect(() => run({ startDate: '2026-06-01', endDate: '2026-05-01' })).toThrow(/before the start date/)
    expect(() => run({ startDate: '2027-02-01' })).toThrow(/after 2026/)
    expect(() => run({ startDate: '2020-01-01', endDate: '2025-12-31' })).toThrow(/before 2026/)
    expect(() => run({ year: 2019 })).toThrow(/Choose a year/)
    expect(() => run({ monthlyBasic: -1 })).toThrow(/cannot be negative/)
    expect(() => run({ months: Object.assign([], { 0: { unpaidAbsences: 30_000 } }) })).toThrow(/larger than the salary/)
  })

  it('16. rounds to centavos only at the end (half-up)', () => {
    const r = run({ monthlyBasic: 10_000.01 })
    // 120,000.12 ÷ 12 = 10,000.01
    expect(n(r.fullYear)).toBe(10_000.01)
    const odd = run({ monthlyBasic: 0, months: Object.assign([], { 0: { actual: 1_000.06 } }) })
    expect(n(odd.fullYear)).toBe(83.34) // 83.3383… rounds half-up to 83.34
  })

  it('17. leap years: February 2024 has 29 days for partial-month estimates', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(() => parseDate('2024-02-29', 'Start date')).not.toThrow()
    expect(() => parseDate('2026-02-29', 'Start date')).toThrow()
    const r = calculateThirteenth({ year: 2024, monthlyBasic: 29_000, startDate: '2024-02-15', endDate: '2024-02-29', asOf: '2025-01-05' }, rules)
    expect(r.months[1].partial).toEqual({ days: 15, daysInMonth: 29 })
    expect(n(r.totalEligible)).toBe(15_000)
    expect(r.belowOneMonth).toBe(true)
  })

  it('18. earned to date counts finished months; the rest is projected, never earned', () => {
    const r = run({ asOf: '2026-08-15' })
    expect(r.months.slice(0, 7).every((m) => m.status === 'actual')).toBe(true)
    expect(r.months.slice(7).every((m) => m.status === 'projected')).toBe(true)
    expect(n(r.totalEarnedToDate)).toBe(175_000)
    expect(n(r.totalProjected)).toBe(125_000)
    expect(n(r.earnedToDate)).toBeCloseTo(14_583.33, 2)
    expect(n(r.fullYear)).toBe(25_000)
    expect(r.hasProjection).toBe(true)
  })

  it('a resignation date in the past makes every remaining month not employed, nothing projected', () => {
    const r = run({ asOf: '2026-08-15', endDate: '2026-06-30' })
    expect(r.hasProjection).toBe(false)
    expect(n(r.earnedToDate)).toBe(12_500)
  })

  it('one month of service in the year meets the coverage minimum', () => {
    expect(run({ startDate: '2026-12-01' }).belowOneMonth).toBe(false)
    expect(run({ startDate: '2026-12-10' }).belowOneMonth).toBe(true)
  })
})
