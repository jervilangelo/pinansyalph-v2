import { describe, expect, it } from 'vitest'
import { analyseReal, annualisedIrr, insightFor, priceIndex } from '../inflation'
import { calculateMp2 } from '../mp2'
import { D } from '../money'

describe('inflation adjustment', () => {
  it('matches Real = Nominal / (1 + π)^years for a constant rate', () => {
    const idx = priceIndex(4, 60)
    expect(idx[60].toNumber()).toBeCloseTo(Math.pow(1.04, 5), 12)
    expect(new D(100_000).div(idx[60]).toFixed(2)).toBe('82192.71')
  })

  it('uses cumulative factors when the rate changes each year', () => {
    const idx = priceIndex([2, 10, 3], 36)
    expect(idx[12].toNumber()).toBeCloseTo(1.02, 12)
    expect(idx[24].toNumber()).toBeCloseTo(1.02 * 1.1, 12)
    expect(idx[36].toNumber()).toBeCloseTo(1.02 * 1.1 * 1.03, 12)
  })

  it('values contributions at the time they were made', () => {
    const idx = priceIndex(12, 12)
    // ₱100 deposited at month 0 and ₱100 at month 12, nothing earned.
    const a = analyseReal(
      [
        { month: 0, amount: new D(100) },
        { month: 12, amount: new D(100) },
      ],
      [],
      new D(200),
      12,
      idx,
    )
    // Ending ₱200 is worth 200/1.12 today; contributions are worth 100 + 100/1.12.
    expect(a.realEnding.toNumber()).toBeCloseTo(200 / 1.12, 8)
    expect(a.realContributed.toNumber()).toBeCloseTo(100 + 100 / 1.12, 8)
    expect(a.realGain.toNumber()).toBeCloseTo(100 / 1.12 - 100, 8)
    // A naive comparison (200 − 200) would wrongly show zero loss.
    expect(a.nominalGain.toNumber()).toBe(0)
  })

  it('finds the annual IRR of a simple investment', () => {
    expect(annualisedIrr([
      { month: 0, amount: -100 },
      { month: 12, amount: 110 },
    ])).toBeCloseTo(10, 6)
    expect(annualisedIrr([{ month: 0, amount: -100 }])).toBeNull()
  })

  it('reports a positive real return when growth beats inflation', () => {
    const r = calculateMp2({ initial: 100_000, contribution: 0, frequency: 'none', years: 5, startMonth: 1, dividendRatePct: 7, payout: 'compounded', inflationPct: 3, timing: 'start' })
    expect(r.real.realGain.gt(0)).toBe(true)
    expect(r.real.realAnnualReturnPct!).toBeCloseTo((1.07 / 1.03 - 1) * 100, 1)
    expect(insightFor(r.real, '3% inflation').tone).toBe('positive')
  })

  it('reports a negative real return when inflation beats growth', () => {
    const r = calculateMp2({ initial: 100_000, contribution: 0, frequency: 'none', years: 5, startMonth: 1, dividendRatePct: 7, payout: 'compounded', inflationPct: 10, timing: 'start' })
    expect(r.real.nominalGain.gt(0)).toBe(true)
    expect(r.real.realGain.lt(0)).toBe(true)
    const insight = insightFor(r.real, '10% inflation')
    expect(insight.tone).toBe('negative')
    expect(insight.title).toMatch(/grew in pesos/)
  })

  it('reports neutral when growth matches inflation', () => {
    const r = calculateMp2({ initial: 100_000, contribution: 0, frequency: 'none', years: 5, startMonth: 1, dividendRatePct: 7, payout: 'compounded', inflationPct: 7, timing: 'start' })
    expect(Math.abs(r.real.realGain.toNumber())).toBeLessThan(5)
    expect(insightFor(r.real, '7% inflation').tone).toBe('neutral')
  })

  it('asks for an amount when nothing was invested', () => {
    const r = calculateMp2({ initial: 0, contribution: 0, frequency: 'none', years: 5, startMonth: 1, dividendRatePct: 7, payout: 'compounded', inflationPct: 3 })
    expect(insightFor(r.real, '3%').title).toMatch(/Enter an amount/)
  })

  it("tracks contributions in today's pesos per year, ending at the analysis total", () => {
    const r = calculateMp2({ initial: 0, contribution: 1000, frequency: 'monthly', years: 3, startMonth: 1, dividendRatePct: 5, payout: 'compounded', inflationPct: 6 })
    expect(r.rows[2].realContributed.toFixed(6)).toBe(r.real.realContributed.toFixed(6))
    expect(r.rows[0].realContributed.lt(r.rows[0].contributed)).toBe(true)
    // Real gain shown in the chart = last real total − last real contributions
    expect(r.rows[2].realTotal.minus(r.rows[2].realContributed).toFixed(6)).toBe(r.real.realGain.toFixed(6))
  })

  it('rejects impossible inflation rates', () => {
    expect(() => priceIndex(-100, 12)).toThrow()
    expect(() => priceIndex([], 12)).toThrow()
  })
})
