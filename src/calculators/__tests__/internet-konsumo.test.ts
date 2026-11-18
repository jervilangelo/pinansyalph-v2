import { describe, expect, it } from 'vitest'
import { APPLIANCE_TYPES, searchAppliances } from '../../data/appliances'
import { INDICATIVE_RATES } from '../../data/electricityRates'
import { PLANS, PROVIDERS, planById } from '../../data/internetPlans'
import { bestValueId, overpayCheck, planCosts, planProblem, sortPlans, type PlanCosting } from '../internet'
import { entryFor, entryProblem, household, sanitizeEntries, simulateReduction, usage, type ApplianceEntry } from '../konsumo'

const post = (o: Partial<PlanCosting> & Pick<PlanCosting, 'price'>): PlanCosting => ({ billing: 'postpaid', downMbps: 200, upfront: 0, lockInMonths: 0, ...o })

describe('internet: cost per Mbps and totals', () => {
  it('₱1,500 for 200 Mbps is ₱7.50 per Mbps', () => {
    expect(planCosts(post({ price: 1500 })).perMbps).toBe(7.5)
  })

  it('contract total = monthly × lock-in months + upfront fees', () => {
    const c = planCosts(post({ price: 1500, upfront: 2500, lockInMonths: 24 }))
    expect(c.contractTotal).toBe(1500 * 24 + 2500)
    expect(c.firstYear).toBe(1500 * 12 + 2500)
    expect(c.effectiveMonthly).toBe(1604.17)
    expect(c.horizonAssumed).toBe(false)
  })

  it('without a lock-in, a 24-month reference period is used and flagged', () => {
    const c = planCosts(post({ price: 1000 }))
    expect(c.horizon).toBe(24)
    expect(c.horizonAssumed).toBe(true)
  })

  it('installation in instalments and a ₱1 upfront fee (GFiber 1499)', () => {
    const c = planCosts(planById('globe-1499')!)
    // ₱1 + 12 × (₱1,499 + ₱100) in year one; ₱1 + 24 × ₱1,599 over 24 months.
    expect(c.firstYear).toBe(1 + 12 * 1599)
    expect(c.contractTotal).toBe(1 + 24 * 1599)
    expect(c.perMbps).toBe(5)
  })

  it('a free first month lowers the first year, not the regular price', () => {
    const c = planCosts(post({ price: 1000, promo: { months: 1, price: 0 } }))
    expect(c.monthly).toBe(1000)
    expect(c.firstYear).toBe(11000)
  })

  it('prepaid 30-day loads become a monthly equivalent: price × 365 ÷ 30 ÷ 12', () => {
    const c = planCosts(planById('pldt-prepaid-50')!)
    expect(c.monthly).toBe(708.71)
    expect(c.annual).toBe(8504.5)
    expect(planCosts(planById('pldt-prepaid-50-365')!).monthly).toBe(583.25)
  })

  it('no advertised speed means no ₱ per Mbps, and unknown fees are flagged', () => {
    const c = planCosts(planById('smart-unli-1299')!)
    expect(c.perMbps).toBeNull()
    expect(c.upfrontUnknown).toBe(true)
  })
})

describe('internet: am I overpaying', () => {
  it('compares only verified current plans and finds faster plans for less', () => {
    const r = overpayCheck({ bill: 1700, advertisedMbps: 200 }, PLANS)
    expect(r.perMbps).toBe(8.5)
    expect(r.compared).toBe(PLANS.filter((p) => p.status === 'current' && p.downMbps).length)
    expect(r.cheaperPerMbps).toBeGreaterThan(0)
    expect(r.fasterForLess.every((a) => a.plan.status === 'current' && a.plan.downMbps! >= 200 && a.costs.monthly < 1700)).toBe(true)
    expect(r.fasterForLess.some((a) => a.plan.id === 'dito-wowfi-790')).toBe(false)
  })

  it('reports cost per measured Mbps when given', () => {
    expect(overpayCheck({ bill: 1500, advertisedMbps: 300, actualMbps: 150 }, PLANS).actualPerMbps).toBe(10)
  })

  it('validates inputs', () => {
    expect(planProblem({ bill: 0, advertisedMbps: 100 })).toMatch(/bill/)
    expect(planProblem({ bill: 1000, advertisedMbps: 0 })).toMatch(/speed/)
    expect(planProblem({ bill: 1000, advertisedMbps: 100 })).toBeNull()
  })

  it('sorting puts unknown values last; best value is the lowest ₱ per Mbps', () => {
    const rows = PLANS.map((plan) => ({ plan, costs: planCosts(plan) }))
    const bySpeed = sortPlans(rows, 'speed')
    expect(bySpeed[0].plan.downMbps).toBe(1000)
    expect(bySpeed.at(-1)!.plan.downMbps).toBeNull()
    const byValue = sortPlans(rows, 'perMbps')
    expect(byValue[0].plan.id).toBe(bestValueId(rows))
    const byPrice = sortPlans(rows, 'price')
    for (let i = 1; i < byPrice.length; i++) expect(byPrice[i].costs.monthly).toBeGreaterThanOrEqual(byPrice[i - 1].costs.monthly)
  })
})

describe('internet dataset', () => {
  it('every plan has a known provider, an https source and no invented speed', () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length)
    for (const p of PLANS) {
      expect(
        PROVIDERS.some((x) => x.id === p.providerId),
        p.id,
      ).toBe(true)
      expect(p.source.url, p.id).toMatch(/^https:\/\//)
      expect(p.price, p.id).toBeGreaterThan(0)
      if (p.billing === 'prepaid') expect(p.periodDays, p.id).toBeGreaterThan(0)
    }
  })
})

describe('konsumo', () => {
  const fan = { ...entryFor('fan', 'stand')!, id: 'f' } as ApplianceEntry

  it('kWh = watts × hours × days × units ÷ 1,000; cost = kWh × rate', () => {
    // 55 W × 8 h × 30 days = 13.2 kWh; at ₱12 = ₱158.40.
    const u = usage(fan, 12)
    expect(u.dailyKwh).toBe(0.44)
    expect(u.monthlyKwh).toBe(13.2)
    expect(u.annualKwh).toBe(158.4)
    expect(u.monthlyCost).toBe(158.4)
    expect(u.annualCost).toBe(1900.8)
    expect(u.weeklyKwh).toBe(3.046)
    expect(usage({ ...fan, units: 3 }, 12).monthlyKwh).toBe(39.6)
  })

  it('cycling appliances use the share of time at full power', () => {
    const ref = { ...entryFor('refrigerator', 'two-door')!, id: 'r' } as ApplianceEntry
    // 120 W × 24 h × 30 days × 40% = 34.56 kWh.
    expect(usage(ref, 10).monthlyKwh).toBe(34.56)
  })

  it('energy-label kWh replaces the watts arithmetic', () => {
    const ref = { ...entryFor('refrigerator')!, id: 'r', basis: 'label' as const, labelKwh: 365, labelUnit: 'year' as const }
    const u = usage(ref, 10)
    expect(u.dailyKwh).toBe(1)
    expect(u.monthlyKwh).toBeCloseTo(30.417, 3)
    expect(u.annualCost).toBe(3650)
  })

  it('household totals, ranking and shares', () => {
    const ac = { ...entryFor('aircon-inverter', '1hp')!, id: 'a' } as ApplianceEntry
    const h = household([fan, ac], 12)
    // Aircon: 900 × 8 × 30 × 0.5 = 108 kWh. Fan: 13.2 kWh.
    expect(h.monthlyKwh).toBe(121.2)
    expect(h.monthlyCost).toBe(1454.4)
    expect(h.annualCost).toBe(17452.8)
    expect(h.items[0].entry.id).toBe('a')
    expect(h.items.reduce((s, i) => s + i.percent, 0)).toBeCloseTo(100, 0)
  })

  it('what if I reduce: AC from 8 to 5 hours', () => {
    const ac = { ...entryFor('aircon-inverter', '1hp')!, id: 'a' } as ApplianceEntry
    const r = simulateReduction([fan, ac], { a: 5 }, 12)
    // 108 → 67.5 kWh: 40.5 kWh saved = ₱486 a month, ₱5,832 a year.
    expect(r).toMatchObject({ beforeKwh: 121.2, afterKwh: 80.7, savedKwh: 40.5, monthlySavings: 486, annualSavings: 5832, percent: 33.4 })
    // Hours can only go down.
    expect(simulateReduction([ac], { a: 20 }, 12).savedKwh).toBe(0)
  })

  it('validation and storage', () => {
    expect(entryProblem({ ...fan, watts: 0 })).toMatch(/Watts/)
    expect(entryProblem({ ...fan, hoursPerDay: 25 })).toMatch(/Hours/)
    expect(entryProblem({ ...fan, units: 0 })).toMatch(/Units/)
    expect(sanitizeEntries([fan, { id: 'x', name: 'bad', watts: 'a' }, null])).toEqual([fan])
  })

  it('directory and rates are usable', () => {
    expect(new Set(APPLIANCE_TYPES.map((a) => a.id)).size).toBe(APPLIANCE_TYPES.length)
    for (const a of APPLIANCE_TYPES) for (const o of a.options) expect(o.watts, a.id).toBeGreaterThan(0)
    expect(searchAppliances('ref')[0].id).toBe('refrigerator')
    expect(searchAppliances('ac').some((a) => a.id.startsWith('aircon'))).toBe(true)
    for (const r of INDICATIVE_RATES) {
      expect(r.perKwh, r.id).toBeGreaterThan(5)
      expect(r.perKwh, r.id).toBeLessThan(30)
      expect(r.sourceUrl).toMatch(/^https:\/\//)
    }
  })
})
