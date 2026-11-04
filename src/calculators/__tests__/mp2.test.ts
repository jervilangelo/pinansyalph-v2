import { describe, expect, it } from 'vitest'
import { calculateMp2, historicalAverage, type Mp2Input } from '../mp2'
import { InputError } from '../money'

const base: Mp2Input = {
  initial: 0,
  contribution: 0,
  frequency: 'monthly',
  years: 5,
  startMonth: 1,
  dividendRatePct: 7,
  payout: 'compounded',
  inflationPct: 0,
  timing: 'start',
}

describe('MP2 calculator', () => {
  it('compounds a one-time investment annually over the 5-year term', () => {
    const r = calculateMp2({ ...base, initial: 100_000 })
    // Credited each December: 7000, 7490, 8014.30, 8575.30, 9175.57
    expect(r.rows.map((x) => x.dividendsThisYear.toFixed(2))).toEqual(['7000.00', '7490.00', '8014.30', '8575.30', '9175.57'])
    expect(r.maturityValue.toFixed(2)).toBe('140255.17') // = 100000 × 1.07^5 to the centavo
    expect(r.totalContributed.toFixed(2)).toBe('100000.00')
    expect(r.beyondStandardTerm).toBe(false)
  })

  it('pays dividends out annually without compounding', () => {
    const r = calculateMp2({ ...base, initial: 100_000, payout: 'annual' })
    expect(r.totalDividends.toFixed(2)).toBe('35000.00')
    expect(r.totalPayouts.toFixed(2)).toBe('35000.00')
    expect(r.maturityBalance.toFixed(2)).toBe('100000.00')
    expect(r.maturityValue.toFixed(2)).toBe('135000.00')
  })

  it('accounts for contribution timing within the month', () => {
    const one = { ...base, contribution: 500, years: 1, dividendRatePct: 6 }
    // Σ k=1..12 of 500k × 0.5% = 195; end-of-month timing earns one month less on each.
    expect(calculateMp2({ ...one, timing: 'start' }).totalDividends.toFixed(2)).toBe('195.00')
    expect(calculateMp2({ ...one, timing: 'mid' }).totalDividends.toFixed(2)).toBe('180.00')
    expect(calculateMp2({ ...one, timing: 'end' }).totalDividends.toFixed(2)).toBe('165.00')
  })

  it('credits dividends at calendar year end when starting mid-year', () => {
    const r = calculateMp2({ ...base, initial: 10_000, years: 1, startMonth: 7, dividendRatePct: 6 })
    // Jul–Dec: 10000 × 0.5% × 6 = 300 credited in Dec; Jan–Jun on 10300 = 309 at maturity
    expect(r.totalDividends.toFixed(2)).toBe('609.00')
    expect(r.maturityValue.toFixed(2)).toBe('10609.00')
  })

  it('uses a different declared rate for each calendar year', () => {
    const r = calculateMp2({ ...base, initial: 100_000, years: 2, dividendRatePct: [6, 8] })
    expect(r.rows[0].dividendsThisYear.toFixed(2)).toBe('6000.00')
    expect(r.rows[1].dividendsThisYear.toFixed(2)).toBe('8480.00')
  })

  it('handles recurring ₱5,000 monthly for five years', () => {
    const r = calculateMp2({ ...base, contribution: 5_000, dividendRatePct: 7.12, timing: 'mid' })
    expect(r.totalContributed.toFixed(2)).toBe('300000.00')
    expect(r.contributionCount).toBe(60)
    expect(r.totalDividends.gt(50_000)).toBe(true)
    expect(r.totalDividends.lt(60_000)).toBe(true)
  })

  it('supports quarterly and annual contribution frequency', () => {
    expect(calculateMp2({ ...base, contribution: 1_000, frequency: 'quarterly' }).totalContributed.toFixed(2)).toBe('20000.00')
    expect(calculateMp2({ ...base, contribution: 1_000, frequency: 'annually' }).totalContributed.toFixed(2)).toBe('5000.00')
  })

  it('returns zeros for zero initial and zero contributions', () => {
    const r = calculateMp2(base)
    expect(r.maturityValue.toFixed(2)).toBe('0.00')
    expect(r.real.realGain.toFixed(2)).toBe('0.00')
    expect(r.real.nominalAnnualReturnPct).toBeNull()
  })

  it('flags durations beyond the standard 5-year MP2 term', () => {
    expect(calculateMp2({ ...base, initial: 1_000, years: 10 }).beyondStandardTerm).toBe(true)
  })

  it('rejects invalid input', () => {
    expect(() => calculateMp2({ ...base, initial: -1 })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, initial: Number.NaN })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, years: 0 })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, years: 31 })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, years: 2.5 })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, startMonth: 13 })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, dividendRatePct: -1 })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, dividendRatePct: [] })).toThrow(InputError)
    expect(() => calculateMp2({ ...base, initial: 2e12 })).toThrow(InputError)
  })

  it('stays exact with extremely large amounts', () => {
    const r = calculateMp2({ ...base, initial: 1e12, years: 30, payout: 'compounded' })
    expect(Number.isFinite(r.maturityValue.toNumber())).toBe(true)
    const exact = 1e12 * Math.pow(1.07, 30)
    expect(Math.abs(r.maturityValue.toNumber() - exact) / exact).toBeLessThan(1e-9)
  })

  it('keeps decimal precision on small amounts', () => {
    const r = calculateMp2({ ...base, contribution: 0.1, years: 1, dividendRatePct: 0 })
    expect(r.totalContributed.toFixed(2)).toBe('1.20')
    expect(r.totalContributed.toString()).toBe('1.2')
  })

  it('averages the most recent declared rates', () => {
    const rates = [
      { year: 2021, rate: 6.0 },
      { year: 2022, rate: 7.03 },
      { year: 2023, rate: 7.05 },
      { year: 2024, rate: 7.1 },
      { year: 2025, rate: 7.12 },
      { year: 2017, rate: 8.11 },
    ]
    expect(historicalAverage(rates, 5)).toBe(6.86)
    expect(() => historicalAverage([], 5)).toThrow()
  })
})
