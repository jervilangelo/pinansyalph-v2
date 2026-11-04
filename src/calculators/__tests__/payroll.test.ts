import { describe, expect, it } from 'vitest'
import rulesJson from '../../data/payroll.json'
import { PayrollRules, type TaxBracket } from '../../types/payroll'
import { calculatePayroll, pagibigEmployee, philhealthEmployee, ruleFor, sssEmployee, taxFromTable, type SalaryInput } from '../payroll'
import { InputError } from '../money'

const rules = PayrollRules.parse(rulesJson)
const DATE = '2026-11-05'
const sss = ruleFor(rules.sss, DATE)
const ph = ruleFor(rules.philhealth, DATE)
const pi = ruleFor(rules.pagibig, DATE)
const tax = ruleFor(rules.tax, DATE)

const base: SalaryInput = {
  basic: 0,
  taxableAllowances: 0,
  otherTaxable: 0,
  nonTaxableAllowances: 0,
  overtime: 0,
  frequency: 'monthly',
  minimumWageEarner: false,
  otherDeductions: 0,
  annualBonus: 0,
  date: DATE,
}
const run = (patch: Partial<SalaryInput>) => calculatePayroll({ ...base, ...patch }, rules)

describe('SSS employee share (Circular 2024-006 rows)', () => {
  const cases: [number, number, number][] = [
    // compensation, MSC, employee total — read from the official table
    [3000, 5000, 250],
    [5249.99, 5000, 250],
    [5250, 5500, 275],
    [14749.99, 14500, 725],
    [20249.99, 20000, 1000],
    [20250, 20500, 1025],
    [30000, 30000, 1500],
    [34749.99, 34500, 1725],
    [34750, 35000, 1750],
    [1_000_000, 35000, 1750],
  ]
  for (const [comp, msc, ee] of cases) {
    it(`₱${comp} → MSC ₱${msc}, employee ₱${ee}`, () => {
      const r = sssEmployee(comp, sss)
      expect(r.msc.toNumber()).toBe(msc)
      expect(r.employee.toFixed(2)).toBe(ee.toFixed(2))
    })
  }
  it('splits Regular SS and MPF at ₱20,000 as the circular does', () => {
    const r = sssEmployee(30000, sss)
    expect(r.regular.toFixed(2)).toBe('1000.00')
    expect(r.mpf.toFixed(2)).toBe('500.00')
  })
})

describe('PhilHealth and Pag-IBIG employee shares', () => {
  it('applies the PhilHealth floor and ceiling', () => {
    expect(philhealthEmployee(0, ph).toFixed(2)).toBe('0.00')
    expect(philhealthEmployee(8000, ph).toFixed(2)).toBe('250.00')
    expect(philhealthEmployee(30000, ph).toFixed(2)).toBe('750.00')
    expect(philhealthEmployee(100000, ph).toFixed(2)).toBe('2500.00')
    expect(philhealthEmployee(250000, ph).toFixed(2)).toBe('2500.00')
  })
  it('applies the Pag-IBIG rates and the ₱10,000 cap', () => {
    expect(pagibigEmployee(1500, pi).toFixed(2)).toBe('15.00')
    expect(pagibigEmployee(1501, pi).toFixed(2)).toBe('30.02')
    expect(pagibigEmployee(10000, pi).toFixed(2)).toBe('200.00')
    expect(pagibigEmployee(50000, pi).toFixed(2)).toBe('200.00')
  })
})

describe('BIR tables', () => {
  const consistent = (table: TaxBracket[]) => {
    const t = [...table].sort((a, b) => a.over - b.over)
    for (let i = 1; i < t.length; i++) {
      const expected = t[i - 1].base + ((t[i].over - t[i - 1].over) * t[i - 1].ratePct) / 100
      expect(Math.abs(expected - t[i].base)).toBeLessThan(0.06)
    }
  }
  it('every withholding table is internally consistent', () => {
    consistent(tax.annual)
    for (const t of Object.values(tax.withholding)) consistent(t)
  })
  it('monthly withholding × 12 matches the annual graduated tax', () => {
    for (const monthly of [15000, 20833, 25000, 40000, 70000, 150000, 400000, 900000]) {
      const viaTable = taxFromTable(monthly, tax.withholding.monthly).times(12).toNumber()
      const annual = taxFromTable(monthly * 12, tax.annual).toNumber()
      expect(Math.abs(viaTable - annual)).toBeLessThan(Math.max(30, annual * 0.0005))
    }
  })
  it('reproduces the RR 11-2018 brackets for 2023 onwards', () => {
    expect(taxFromTable(250000, tax.annual).toFixed(2)).toBe('0.00')
    expect(taxFromTable(400000, tax.annual).toFixed(2)).toBe('22500.00')
    expect(taxFromTable(800000, tax.annual).toFixed(2)).toBe('102500.00')
    expect(taxFromTable(10_000_000, tax.annual).toFixed(2)).toBe('2902500.00')
  })
})

describe('take-home pay', () => {
  it('₱30,000 monthly basic', () => {
    const r = run({ basic: 30000 })
    expect(r.sss.employee.toFixed(2)).toBe('1500.00')
    expect(r.philhealth.toFixed(2)).toBe('750.00')
    expect(r.pagibig.toFixed(2)).toBe('200.00')
    expect(r.taxableIncome.toFixed(2)).toBe('27550.00')
    expect(r.withholdingMonthly.toFixed(2)).toBe('1007.55') // (27,550 − 20,833) × 15%
    expect(r.takeHomeMonthly.toFixed(2)).toBe('26542.45')
  })

  it('semi-monthly payroll uses the semi-monthly table', () => {
    const r = run({ basic: 30000, frequency: 'semiMonthly' })
    expect(r.withholdingPerPay.toFixed(2)).toBe('503.70') // (13,775 − 10,417) × 15%
    expect(r.withholdingMonthly.toFixed(2)).toBe('1007.40')
  })

  it('weekly and biweekly payroll', () => {
    expect(run({ basic: 30000, frequency: 'weekly' }).withholdingPerPay.toFixed(2)).toBe('232.45')
    expect(run({ basic: 30000, frequency: 'biweekly' }).withholdingPerPay.toFixed(2)).toBe('464.90')
  })

  it('no withholding below the threshold', () => {
    const r = run({ basic: 20000 })
    expect(r.taxableIncome.toFixed(2)).toBe('18300.00')
    expect(r.withholdingMonthly.toFixed(2)).toBe('0.00')
    expect(r.takeHomeMonthly.toFixed(2)).toBe('18300.00')
  })

  it('minimum wage earners pay contributions but no tax on minimum wage and overtime', () => {
    const r = run({ basic: 18000, overtime: 2000, minimumWageEarner: true })
    expect(r.withholdingMonthly.toFixed(2)).toBe('0.00')
    expect(r.sss.employee.toFixed(2)).toBe('1000.00') // MSC on ₱20,000 compensation
    const withCommission = run({ basic: 18000, otherTaxable: 30000, minimumWageEarner: true })
    expect(withCommission.taxableIncome.toFixed(2)).toBe('30000.00')
    expect(withCommission.withholdingMonthly.gt(0)).toBe(true)
  })

  it('higher bracket hits every ceiling', () => {
    const r = run({ basic: 200000 })
    expect(r.sss.employee.toFixed(2)).toBe('1750.00')
    expect(r.philhealth.toFixed(2)).toBe('2500.00')
    expect(r.pagibig.toFixed(2)).toBe('200.00')
    expect(r.withholdingMonthly.toFixed(2)).toBe('42206.70') // 33,541.80 + (195,550 − 166,667) × 30%
  })

  it('treats taxable and non-taxable allowances differently', () => {
    const exempt = run({ basic: 30000, nonTaxableAllowances: 3000 })
    expect(exempt.withholdingMonthly.toFixed(2)).toBe('1007.55')
    expect(exempt.grossMonthly.toFixed(2)).toBe('33000.00')
    expect(exempt.takeHomeMonthly.toFixed(2)).toBe('29542.45')
    const taxable = run({ basic: 30000, taxableAllowances: 3000 })
    expect(taxable.sss.employee.toFixed(2)).toBe('1650.00')
    expect(taxable.withholdingMonthly.toFixed(2)).toBe('1435.05') // (30,400 − 20,833) × 15%
  })

  it('taxes bonuses only above the ₱90,000 exemption', () => {
    const r = run({ basic: 30000, annualBonus: 120000 })
    expect(r.bonus.exempt.toFixed(2)).toBe('90000.00')
    expect(r.bonus.taxable.toFixed(2)).toBe('30000.00')
    expect(r.bonus.estimatedTax.toFixed(2)).toBe('4500.00')
    expect(run({ basic: 30000, annualBonus: 30000 }).bonus.estimatedTax.toFixed(2)).toBe('0.00')
  })

  it('subtracts custom payroll deductions after tax', () => {
    const r = run({ basic: 30000, otherDeductions: 1234.56 })
    expect(r.withholdingMonthly.toFixed(2)).toBe('1007.55')
    expect(r.takeHomeMonthly.toFixed(2)).toBe('25307.89')
  })

  it('handles zero salary and decimal amounts', () => {
    const zero = run({})
    expect(zero.takeHomeMonthly.toFixed(2)).toBe('0.00')
    expect(zero.governmentTotal.toFixed(2)).toBe('0.00') // no pay, no contributions
    const cents = run({ basic: 25000.55, nonTaxableAllowances: 0.1 })
    expect(cents.grossMonthly.toFixed(2)).toBe('25000.65')
    expect(cents.takeHomeMonthly.plus(cents.totalDeductions).toFixed(2)).toBe('25000.65')
  })

  it('rejects invalid input', () => {
    expect(() => run({ basic: -1 })).toThrow(InputError)
    expect(() => run({ basic: Number.NaN })).toThrow(InputError)
    expect(() => run({ overtime: -5 })).toThrow(InputError)
  })

  it('picks the rule version in force on the payroll date', () => {
    const future = { ...rules, sss: [...rules.sss, { ...rules.sss[0], effectiveFrom: '2030-01-01', employeeRatePct: 6 }] }
    expect(calculatePayroll({ ...base, basic: 30000 }, future).sss.employee.toFixed(2)).toBe('1500.00')
    expect(calculatePayroll({ ...base, basic: 30000, date: '2030-02-01' }, future).sss.employee.toFixed(2)).toBe('1800.00')
    expect(() => calculatePayroll({ ...base, basic: 30000, date: '2019-01-01' }, rules)).toThrow(/No payroll rules/)
  })
})
