import { describe, expect, it } from 'vitest'
import housingJson from '../../data/housing.json'
import { HOUSING_LOCATIONS, searchLocations } from '../../data/housingLocations'
import { AREA_IDS, HousingDataset } from '../../types/housing'
import { compareToMedian, growthFor, loanAffordability, medianFor, monthlyAmortization } from '../housing'
import { InputError } from '../money'

const data = HousingDataset.parse(housingJson)

describe('BSP medians (Q2 2026)', () => {
  it('returns the published median and the loans behind it', () => {
    const m = medianFor(data, 'balance-gma', 'house')!
    expect(m.pesos).toBe(3_465_340)
    expect(m.loans).toBe(3146)
    expect(m.period).toBe('Q2 2026')
    expect(medianFor(data, 'ncr', 'condominium')!.pesos).toBe(5_179_350)
    expect(medianFor(data, 'philippines', 'all')!.pesos).toBe(3_905_999)
  })

  it('counts both housing types for "all"', () => {
    expect(medianFor(data, 'philippines', 'all')!.loans).toBe(4378 + 5277)
  })

  it('has a median for every area and type, and nothing else', () => {
    expect(data.medians.values).toHaveLength(AREA_IDS.length * 3)
    for (const a of AREA_IDS) for (const t of ['all', 'condominium', 'house'] as const) expect(medianFor(data, a, t), `${a} ${t}`).not.toBeNull()
  })

  it('sub-area loan counts add up to their totals, as published', () => {
    const n = (area: string, type: string) => data.loans.values.find((l) => l.area === area && l.type === type)!.count
    for (const t of ['condominium', 'house']) {
      expect(n('ncr', t) + n('aoncr', t)).toBe(n('philippines', t))
      expect(n('balance-gma', t) + n('metro-cebu', t) + n('metro-mindanao', t) + n('other-areas', t)).toBe(n('aoncr', t))
    }
  })

  it('price movements are published per area; by type only for the Philippines, NCR and outside NCR', () => {
    expect(growthFor(data, 'philippines', 'all')!.yoy).toEqual([7.5, 4.5, 0.4])
    expect(growthFor(data, 'ncr', 'condominium')!.yoy.at(-1)).toBe(7.4)
    expect(growthFor(data, 'balance-gma', 'house')).toBeNull()
    for (const s of data.growth.series) {
      expect(s.yoy).toHaveLength(data.growth.yoyQuarters.length)
      expect(s.qoq).toHaveLength(data.growth.qoqQuarters.length)
    }
  })

  it('the area-level changes are consistent with their sub-areas (weighted by BSP’s 2026 area weights)', () => {
    // Weights from the report (Figure 5): Balance GMA 42.4%, Other Areas 15.4%, Metro Cebu 6.6%, Metro Mindanao 4.9%.
    const w = { 'balance-gma': 42.4, 'other-areas': 15.4, 'metro-cebu': 6.6, 'metro-mindanao': 4.9 } as const
    const total = Object.values(w).reduce((a, b) => a + b, 0)
    for (const i of [0, 1, 2, 3]) {
      const weighted = Object.entries(w).reduce((s, [a, wt]) => s + growthFor(data, a as keyof typeof w, 'all')!.qoq[i] * wt, 0) / total
      expect(Math.abs(weighted - growthFor(data, 'aoncr', 'all')!.qoq[i])).toBeLessThan(0.6)
    }
  })
})

describe('data integrity', () => {
  it('every figure points to a registered source with a specific URL', () => {
    const ids = new Set(data.sources.map((s) => s.id))
    for (const ref of [data.medians.source, data.loans.source, data.growth.source, ...data.loanRates.map((r) => r.source)]) expect(ids.has(ref)).toBe(true)
    for (const s of data.sources) expect(new URL(s.url).pathname.length).toBeGreaterThan(1)
  })

  it('labels BSP figures as bank-financed medians, not asking prices or zonal values', () => {
    const bsp = data.sources.find((s) => s.id === data.medians.source)!
    expect(bsp.limitations.join(' ')).toMatch(/bank/i)
    expect(JSON.stringify(data)).not.toMatch(/asking price median|zonal value of/i)
  })
})

describe('locations', () => {
  it('maps places to their BSP area', () => {
    const area = (q: string) => searchLocations(q)[0]?.area
    expect(area('San Jose del Monte')).toBe('balance-gma')
    expect(area('sjdm')).toBe('balance-gma')
    expect(area('Quezon City')).toBe('ncr')
    expect(area('Cebu City')).toBe('metro-cebu')
    expect(area('cdo')).toBe('metro-mindanao')
    expect(area('baguio')).toBe('other-areas')
    expect(area('Las Pinas')).toBe('ncr')
    expect(searchLocations('')).toEqual([])
  })
  it('has unique ids', () => {
    expect(new Set(HOUSING_LOCATIONS.map((l) => l.id)).size).toBe(HOUSING_LOCATIONS.length)
  })
})

describe('asking price against the median', () => {
  it('is (asking − median) ÷ median', () => {
    const c = compareToMedian(3_881_181, 3_465_340)
    expect(c.difference.toNumber()).toBe(415_841)
    expect(c.percent).toBe(12)
    expect(compareToMedian(3_000_000, 4_000_000).percent).toBe(-25)
  })
  it('validates', () => {
    expect(() => compareToMedian(0, 1)).toThrow(InputError)
  })
})

describe('loan amortization', () => {
  it('matches the standard formula: ₱1,000,000 at 6.5% for 20 years is ₱7,455.73 a month', () => {
    expect(monthlyAmortization(1_000_000, 6.5, 20).toNumber()).toBe(7455.73)
  })
  it('divides evenly at 0%', () => {
    expect(monthlyAmortization(1_200_000, 0, 10).toNumber()).toBe(10_000)
  })
  it('computes down payment, totals and income ratios', () => {
    const r = loanAffordability({ price: 3_465_340, downPercent: 20, years: 20, annualRate: 6.5, grossMonthly: 60_000, takeHomeMonthly: 50_000, otherDebts: 5_000, otherUpfront: 100_000 })
    expect(r.downPayment.toNumber()).toBe(693_068)
    expect(r.principal.toNumber()).toBe(2_772_272)
    expect(r.monthly.toNumber()).toBe(monthlyAmortization(2_772_272, 6.5, 20).toNumber())
    expect(r.totalInterest.toNumber()).toBeCloseTo(r.monthly.toNumber() * 240 - 2_772_272, 2)
    expect(r.paymentToIncome).toBeCloseTo((r.monthly.toNumber() / 60_000) * 100, 1)
    expect(r.remaining!.toNumber()).toBeCloseTo(50_000 - r.monthly.toNumber() - 5_000, 2)
    expect(r.upfront.toNumber()).toBe(793_068)
  })
  it('handles a full cash purchase and validates inputs', () => {
    expect(loanAffordability({ price: 1_000_000, downPercent: 100, years: 10, annualRate: 6, grossMonthly: 0, takeHomeMonthly: 0, otherDebts: 0, otherUpfront: 0 }).monthly.toNumber()).toBe(0)
    expect(() => monthlyAmortization(1, 6, 0)).toThrow(/term/)
    expect(() => monthlyAmortization(1, 31, 10)).toThrow(/rate/)
  })
})
