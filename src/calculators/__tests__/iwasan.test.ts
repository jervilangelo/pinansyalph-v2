import { describe, expect, it } from 'vitest'
import { IWASAN_SOURCES } from '../../data/iwasanSources'
import {
  cardProblem,
  cardRepayment,
  cashVsInstallment,
  cycleProblem,
  debtCycle,
  expectedLoss,
  futureValue,
  gamblingProblem,
  installmentLoad,
  loanCost,
  loanProblem,
  simulatePaths,
  solveRate,
} from '../iwasan'

describe('gambling: expected loss = total wagered × house edge', () => {
  it('₱1,000 a session, 3 a week, 2.7% edge, a year', () => {
    expect(expectedLoss({ perSession: 1000, sessionsPerWeek: 3, houseEdge: 2.7, weeks: 52 })).toEqual({
      totalWagered: 156000,
      expectedLoss: 4212,
      expectedReturned: 151788,
      perWeek: 81,
      perMonth: 351,
      perYear: 4212,
    })
  })
  it('a 0% edge loses nothing on average; inputs are validated', () => {
    expect(expectedLoss({ perSession: 500, sessionsPerWeek: 1, houseEdge: 0, weeks: 4 }).expectedLoss).toBe(0)
    expect(gamblingProblem({ perSession: 0, sessionsPerWeek: 1, houseEdge: 2, weeks: 1 })).toMatch(/amount/)
    expect(gamblingProblem({ perSession: 100, sessionsPerWeek: 1, houseEdge: 120, weeks: 1 })).toMatch(/House edge/)
    expect(gamblingProblem({ perSession: 100, sessionsPerWeek: 1, houseEdge: 2, weeks: 1.5 })).toMatch(/Weeks/)
  })
  it('the variance demo is deterministic and drifts down with a negative edge', () => {
    const a = simulatePaths(5, 2000, 18 / 37)
    expect(a).toEqual(simulatePaths(5, 2000, 18 / 37))
    const mean = a.reduce((s, p) => s + p[p.length - 1], 0) / a.length
    expect(mean).toBeLessThan(0)
  })
})

describe('loans', () => {
  it('add-on: ₱10,000 advertised, ₱1,500 deducted, 6% for one month', () => {
    const r = loanCost({ principal: 10000, deductedFees: 1500, monthlyRate: 6, method: 'add-on', months: 1, installments: 1, otherCharges: 0, lateFees: 0 })
    expect(r).toMatchObject({ cashReceived: 8500, shortfall: 1500, interest: 600, installment: 10600, totalRepayment: 10600, totalCost: 2100, costPercent: 24.71 })
    // ₱8,500 in, ₱10,600 out a month later: 24.71% a month.
    expect(r.effectiveMonthly).toBe(24.71)
    expect(r.effectiveAnnual).toBeGreaterThan(1300)
  })
  it('diminishing balance: ₱12,000 at 2% a month over 12 payments', () => {
    const r = loanCost({ principal: 12000, deductedFees: 0, monthlyRate: 2, method: 'diminishing', months: 12, installments: 12, otherCharges: 0, lateFees: 0 })
    expect(r.installment).toBeCloseTo(1134.72, 1)
    expect(r.effectiveMonthly).toBe(2)
  })
  it('add-on interest costs more than the same nominal rate on a diminishing balance', () => {
    const base = { principal: 12000, deductedFees: 0, monthlyRate: 2, months: 12, installments: 12, otherCharges: 0, lateFees: 0 }
    const addOn = loanCost({ ...base, method: 'add-on' })
    expect(addOn.interest).toBe(2880)
    expect(addOn.effectiveMonthly!).toBeGreaterThan(3.4)
    expect(addOn.totalRepayment).toBeGreaterThan(loanCost({ ...base, method: 'diminishing' }).totalRepayment)
  })
  it('fees and late fees count in the total; validation', () => {
    const r = loanCost({ principal: 5000, deductedFees: 0, monthlyRate: 0, method: 'add-on', months: 2, installments: 2, otherCharges: 200, lateFees: 250 })
    expect(r.totalRepayment).toBe(5450)
    expect(loanProblem({ principal: 5000, deductedFees: 5000, monthlyRate: 1, method: 'add-on', months: 1, installments: 1, otherCharges: 0, lateFees: 0 })).toMatch(/less than/)
    expect(solveRate(100, [100])).toBe(0)
  })
})

describe('borrowing again to repay', () => {
  const base = { principal: 5000, feePercent: 10, monthlyRate: 5, months: 1, cycles: 2, ownPayment: 0 }
  it('three loans, no own money: what is owed grows by every round of fees and interest', () => {
    const r = debtCycle(base)
    expect(r.rounds.map((x) => [x.borrowed, x.fees, x.amountDue])).toEqual([
      [5000, 500, 5250],
      [5833.33, 583.33, 6125],
      [6805.56, 680.56, 7145.83],
    ])
    expect(r.finalDue).toBe(7145.83)
    expect(r.firstCash).toBe(4500)
    // Everything owed beyond the ₱4,500 actually received is cost.
    expect(r.totalCost).toBe(2645.83)
  })
  it('paying the due amount yourself ends the cycle', () => {
    const r = debtCycle({ ...base, ownPayment: 6000 })
    expect(r).toMatchObject({ clearedEarly: true, finalDue: 0, totalCost: 750, totalOwnPaid: 5250 })
    expect(r.rounds).toHaveLength(1)
  })
  it('validation', () => {
    expect(cycleProblem({ ...base, feePercent: 100 })).toMatch(/Fees/)
    expect(cycleProblem(base)).toBeNull()
  })
})

describe('credit cards', () => {
  const card = { balance: 10000, monthlyRate: 3, minPercent: 5, minAmount: 500, newSpending: 0 }
  it('₱1,000 a month on ₱10,000 at 3% a month takes 13 months', () => {
    const r = cardRepayment(card, { kind: 'fixed', amount: 1000 })
    expect(r.months).toBe(13)
    expect(r.totalPaid).toBeCloseTo(10000 + r.totalInterest, 2)
    expect(r.schedule[0]).toEqual({ month: 1, opening: 10000, interest: 300, payment: 1000, closing: 9300 })
  })
  it('minimum payments take longer and cost more than a fixed higher payment', () => {
    const min = cardRepayment(card, { kind: 'minimum' })
    const fixed = cardRepayment(card, { kind: 'fixed', amount: 1000 })
    expect(min.months!).toBeGreaterThan(fixed.months!)
    expect(min.totalInterest).toBeGreaterThan(fixed.totalInterest)
  })
  it('a minimum below the finance charge never pays off', () => {
    const r = cardRepayment({ ...card, minPercent: 2, minAmount: 0 }, { kind: 'minimum' })
    expect(r.neverPaysOff).toBe(true)
    expect(r.months).toBeNull()
  })
  it('new spending each month is carried too; validation', () => {
    expect(cardRepayment({ ...card, newSpending: 2000 }, { kind: 'fixed', amount: 1000 }).neverPaysOff).toBe(true)
    expect(cardProblem({ ...card, balance: 0 })).toMatch(/balance/)
  })
})

describe('installments and savings', () => {
  it('monthly burden, share of income and what is left', () => {
    const r = installmentLoad(
      [
        { id: 'a', name: 'Phone', monthly: 1500, monthsLeft: 3 },
        { id: 'b', name: 'Laptop', monthly: 2000, monthsLeft: 12 },
      ],
      25000,
    )
    expect(r).toMatchObject({ totalMonthly: 3500, percentOfIncome: 14, remainingIncome: 21500, totalRemaining: 28500 })
    expect(r.nextMonths.slice(0, 4)).toEqual([3500, 3500, 3500, 2000])
    expect(installmentLoad([], 0).percentOfIncome).toBeNull()
  })
  it('cash versus installment', () => {
    expect(cashVsInstallment(12000, 1100, 12, 0)).toEqual({ installmentTotal: 13200, extraCost: 1200, monthsToSave: 11 })
  })
  it('future value: 0% is plain addition; 6% a year compounds monthly', () => {
    expect(futureValue(1000, 'monthly', 10, 0)).toEqual({ contributions: 120000, growth: 0, futureValue: 120000 })
    const r = futureValue(1000, 'monthly', 10, 6)
    expect(r.contributions).toBe(120000)
    expect(r.futureValue).toBeCloseTo(162474.5, -1)
    expect(futureValue(50, 'daily', 1, 0).futureValue).toBe(18250)
  })
})

describe('sources', () => {
  it('every source has an organisation, a title, an https URL and a verified date', () => {
    for (const s of IWASAN_SOURCES) {
      expect(s.org, s.id).toBeTruthy()
      expect(s.title, s.id).toBeTruthy()
      expect(s.url, s.id).toMatch(/^https:\/\//)
      expect(s.verified, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(new Set(IWASAN_SOURCES.map((s) => s.id)).size).toBe(IWASAN_SOURCES.length)
  })
})
