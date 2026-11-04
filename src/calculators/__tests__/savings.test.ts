import { describe, expect, it } from 'vitest'
import { calculateSavings, tieredInterestPerYear, type SavingsProduct } from '../savings'
import { D, InputError } from '../money'

const flat = (rate: number, extra: Partial<SavingsProduct> = {}): SavingsProduct => ({
  baseTiers: [{ upTo: null, rate }],
  promo: null,
  crediting: 'monthly',
  dayCount: 360,
  kind: 'savings',
  termMonths: null,
  conditionalBonus: null,
  withholdingTaxPct: 20,
  ...extra,
})

describe('bank savings calculator', () => {
  it('reproduces the CIMB disclosure example: ADB × days ÷ 360 × rate, 20% tax', () => {
    // April 2026 has 30 days: 100000 × 2.3% × 30/360 = 191.67 gross, 38.33 tax, 153.34 net
    const r = calculateSavings({ initial: 100_000, monthly: 0, years: 1, product: flat(2.3), inflationPct: 0, startDate: '2026-04-01' })
    expect(r.credits[0].gross.toFixed(2)).toBe('191.67')
    expect(r.credits[0].tax.toFixed(2)).toBe('38.33')
    expect(r.credits[0].balance.toFixed(2)).toBe('100153.34')
    // May has 31 days and earns on the new balance
    expect(r.credits[1].gross.toFixed(2)).toBe(new D('100153.34').times(0.023).times(31).div(360).toFixed(2))
  })

  it('withholds 20% final tax on every credit, rounded to centavos', () => {
    const r = calculateSavings({ initial: 100_000, monthly: 0, years: 1, product: flat(2.3), inflationPct: 0, startDate: '2026-04-01' })
    expect(r.tax.div(r.grossInterest).toNumber()).toBeCloseTo(0.2, 3)
    expect(r.netInterest.plus(r.tax).eq(r.grossInterest)).toBe(true)
    expect(r.finalBalance.eq(r.totalDeposited.plus(r.netInterest))).toBe(true)
    for (const c of r.credits) expect(c.tax.decimalPlaces()).toBeLessThanOrEqual(2)
  })

  it('compounds daily on the after-tax rate for daily-credited products', () => {
    const p = flat(3, { crediting: 'daily', dayCount: null })
    const r = calculateSavings({ initial: 100_000, monthly: 0, years: 1, product: p, taxPct: 0, inflationPct: 0, startDate: '2026-01-01' })
    const expected = 100_000 * (Math.pow(1 + 0.03 / 365, 365) - 1)
    expect(r.grossInterest.toNumber()).toBeCloseTo(expected, 0)
  })

  it('adds monthly deposits at the start of each month', () => {
    const r = calculateSavings({ initial: 0, monthly: 1_000, years: 2, product: flat(0), inflationPct: 0 })
    expect(r.totalDeposited.toFixed(2)).toBe('24000.00')
    expect(r.finalBalance.toFixed(2)).toBe('24000.00')
    expect(r.rows).toHaveLength(2)
  })

  it('applies marginal tiers to each slice of the balance', () => {
    const tiers = [
      { upTo: 20_000, rate: 4 },
      { upTo: null, rate: 8 },
    ]
    expect(tieredInterestPerYear(new D(30_000), tiers).toFixed(2)).toBe('1600.00')
    expect(tieredInterestPerYear(new D(10_000), tiers).toFixed(2)).toBe('400.00')
  })

  it('applies a promo only up to its cap and only until it ends', () => {
    const p = flat(3, {
      crediting: 'daily',
      dayCount: null,
      promo: { name: 'Boost', rate: 15, cap: 100_000, conditions: ['Missions'], startsOn: '2026-11-01', endsOn: '2026-11-30' },
    })
    const withPromo = calculateSavings({ initial: 200_000, monthly: 0, years: 1, product: p, applyPromo: true, inflationPct: 0, startDate: '2026-11-01' })
    const without = calculateSavings({ initial: 200_000, monthly: 0, years: 1, product: p, applyPromo: false, inflationPct: 0, startDate: '2026-11-01' })
    expect(withPromo.promoEndedAtMonth).toBe(1)
    const extra = withPromo.grossInterest.minus(without.grossInterest).toNumber()
    // One month of +12% on the capped ₱100,000 only ≈ 100000 × 12% × 30/365 ≈ 986
    expect(extra).toBeGreaterThan(900)
    expect(extra).toBeLessThan(1_100)
  })

  it('ignores an expired promo and says so', () => {
    const p = flat(3, {
      promo: { name: 'Boost', rate: 15, cap: 100_000, conditions: ['Missions'], startsOn: '2026-11-01', endsOn: '2026-11-30' },
    })
    const expired = calculateSavings({ initial: 50_000, monthly: 0, years: 1, product: p, applyPromo: true, inflationPct: 0, startDate: '2027-01-01' })
    const base = calculateSavings({ initial: 50_000, monthly: 0, years: 1, product: p, applyPromo: false, inflationPct: 0, startDate: '2027-01-01' })
    expect(expired.grossInterest.eq(base.grossInterest)).toBe(true)
    expect(expired.assumptions.join(' ')).toMatch(/already ended/)
  })

  it('renews a time deposit each term and ignores monthly deposits', () => {
    const td = flat(4, { kind: 'time-deposit', termMonths: 6, crediting: 'at-maturity', dayCount: null })
    const r = calculateSavings({ initial: 100_000, monthly: 5_000, years: 1, product: td, inflationPct: 0 })
    // Term 1: 2000 gross, 400 tax → 101600. Term 2: 2032 gross, 406.40 tax → 103225.60
    expect(r.finalBalance.toFixed(2)).toBe('103225.60')
    expect(r.totalDeposited.toFixed(2)).toBe('100000.00')
    expect(r.assumptions.join(' ')).toMatch(/one placement/)
  })

  it('adds the conditional time-deposit bonus only when asked', () => {
    const td = flat(4, { kind: 'time-deposit', termMonths: 12, crediting: 'at-maturity', conditionalBonus: { rate: 1, condition: 'ADB' } })
    const r = calculateSavings({ initial: 100_000, monthly: 0, years: 1, product: td, taxPct: 0, includeConditionalBonus: true, inflationPct: 0 })
    expect(r.finalBalance.toFixed(2)).toBe('105000.00')
  })

  it('lets the user override the published rate', () => {
    const r = calculateSavings({ initial: 100_000, monthly: 0, years: 1, product: flat(2.3), rateOverridePct: 0, inflationPct: 0 })
    expect(r.grossInterest.toFixed(2)).toBe('0.00')
  })

  it('shows a real loss when interest after tax trails inflation', () => {
    const r = calculateSavings({ initial: 100_000, monthly: 0, years: 5, product: flat(2.3), inflationPct: 5 })
    expect(r.real.nominalGain.gt(0)).toBe(true)
    expect(r.real.realGain.lt(0)).toBe(true)
  })

  it('rejects invalid input and missing rate data', () => {
    expect(() => calculateSavings({ initial: -5, monthly: 0, years: 1, product: flat(3), inflationPct: 0 })).toThrow(InputError)
    expect(() => calculateSavings({ initial: 5, monthly: 0, years: 0, product: flat(3), inflationPct: 0 })).toThrow(InputError)
    expect(() => calculateSavings({ initial: 5, monthly: 0, years: 1, product: flat(3), rateOverridePct: -1, inflationPct: 0 })).toThrow(InputError)
    expect(() => calculateSavings({ initial: 5, monthly: 0, years: 1, product: { ...flat(3), baseTiers: [] }, inflationPct: 0 })).toThrow(/Enter a rate manually/)
    expect(() => calculateSavings({ initial: 5, monthly: 0, years: 1, product: flat(3), inflationPct: 0, startDate: 'nope' })).toThrow(InputError)
  })

  it('handles extremely large balances without overflow', () => {
    const r = calculateSavings({ initial: 1e12, monthly: 1e9, years: 30, product: flat(3), inflationPct: 4 })
    expect(Number.isFinite(r.finalBalance.toNumber())).toBe(true)
    expect(r.finalBalance.gt(1e12)).toBe(true)
  })
})
