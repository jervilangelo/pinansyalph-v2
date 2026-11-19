/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import rulesJson from '../../data/payroll.json'
import { PayrollRules } from '../../types/payroll'
import { compareOffer, evaluateJob, type JobPackage } from '../jobOffer'
import { InputError } from '../money'
import { calculatePayroll } from '../payroll'

const rules = PayrollRules.parse(rulesJson)
const DATE = '2026-11-05'

const job = (patch: Partial<JobPackage>): JobPackage => ({
  basic: 30_000,
  taxableAllowances: 0,
  nonTaxableAllowances: 0,
  arrangement: 'onsite',
  officeDays: 5,
  commutePerDay: 0,
  otherMonthlyCosts: 0,
  ...patch,
})

describe('evaluateJob', () => {
  it('uses the site payroll engine for take-home pay', () => {
    const r = evaluateJob(job({}), rules, 'Test', DATE)
    const p = calculatePayroll(
      { basic: 30_000, taxableAllowances: 0, otherTaxable: 0, nonTaxableAllowances: 0, overtime: 0, frequency: 'semiMonthly', minimumWageEarner: false, otherDeductions: 0, annualBonus: 0, date: DATE },
      rules,
    )
    expect(r.takeHome.toNumber()).toBe(p.takeHomeMonthly.toNumber())
    // ₱30,000 semi-monthly is ₱26,542.60 in the Sweldo calculator's own tests
    expect(r.takeHome.toFixed(2)).toBe('26542.60')
  })

  it('turns a daily commute into a monthly cost: ₱150 × 5 days × 52 ÷ 12 = ₱3,250', () => {
    const r = evaluateJob(job({ commutePerDay: 150 }), rules, 'Test', DATE)
    expect(r.commuteMonthly.toNumber()).toBe(3_250)
    expect(r.disposable.toNumber()).toBe(r.takeHome.minus(3_250).toNumber())
  })

  it('keeps non-taxable allowances out of tax but in take-home pay', () => {
    const plain = evaluateJob(job({}), rules, 'Test', DATE)
    const withDeMinimis = evaluateJob(job({ nonTaxableAllowances: 2_000 }), rules, 'Test', DATE)
    expect(withDeMinimis.takeHome.minus(plain.takeHome).toNumber()).toBe(2_000)
    const withTaxable = evaluateJob(job({ taxableAllowances: 2_000 }), rules, 'Test', DATE)
    expect(withTaxable.takeHome.minus(plain.takeHome).toNumber()).toBeLessThan(2_000)
  })

  it('validates inputs', () => {
    expect(() => evaluateJob(job({ basic: 0 }), rules, 'Offer', DATE)).toThrow(/basic monthly pay/)
    expect(() => evaluateJob(job({ commutePerDay: -5 }), rules, 'Offer', DATE)).toThrow(InputError)
    expect(() => evaluateJob(job({ officeDays: 8 }), rules, 'Offer', DATE)).toThrow(/0 to 7/)
    expect(() => evaluateJob(job({ arrangement: 'remote', officeDays: 2 }), rules, 'Offer', DATE)).toThrow(/remote/)
  })
})

describe('compareOffer', () => {
  it('shows a higher offer can leave less once the commute is counted', () => {
    const current = job({ basic: 30_000, arrangement: 'remote', officeDays: 0, otherMonthlyCosts: 1_500 })
    const offer = job({ basic: 33_000, arrangement: 'onsite', officeDays: 5, commutePerDay: 400 })
    const c = compareOffer(current, offer, rules, DATE)
    expect(c.diff.gross.toNumber()).toBe(3_000)
    expect(c.diff.takeHome.toNumber()).toBeGreaterThan(0)
    expect(c.diff.takeHome.toNumber()).toBeLessThan(3_000) // contributions and tax take part of the raise
    expect(c.diff.disposable.toNumber()).toBeLessThan(0)
  })

  it('annualises as 12 months of disposable income plus the 13th month pay difference', () => {
    const c = compareOffer(job({ basic: 30_000 }), job({ basic: 35_000 }), rules, DATE)
    expect(c.diff.annual.toNumber()).toBe(c.diff.disposable.times(12).plus(5_000).toNumber())
  })

  it('is zero for identical packages', () => {
    const c = compareOffer(job({ commutePerDay: 120 }), job({ commutePerDay: 120 }), rules, DATE)
    expect(c.diff.disposable.toNumber()).toBe(0)
    expect(c.diff.annual.toNumber()).toBe(0)
    expect(c.diff.disposablePct).toBe(0)
  })

  it('states its assumptions', () => {
    const c = compareOffer(job({}), job({}), rules, DATE)
    expect(c.assumptions.join(' ')).toMatch(/13th month/)
    expect(c.assumptions.join(' ')).toMatch(/not counted/)
  })
})
