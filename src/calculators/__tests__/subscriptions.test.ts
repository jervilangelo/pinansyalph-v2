import { describe, expect, it } from 'vitest'
import { SERVICES, searchServices, serviceById } from '../../data/subscriptions'
import { BRAND_MARKS } from '../../data/brandMarks'
import { annualCost, budgetCheck, entryProblem, monthlyCost, nextRenewal, sanitizeEntries, simulateCancel, summarize, upcomingRenewals, yourShare, type SubEntry } from '../subscriptions'

let n = 0
const sub = (o: Partial<SubEntry> & Pick<SubEntry, 'price'>): SubEntry => ({ id: `s${++n}`, name: 'Test', category: 'entertainment', billing: 'monthly', people: 1, ...o })

describe('normalising to a month', () => {
  it('monthly, quarterly and yearly prices become monthly equivalents', () => {
    expect(monthlyCost(sub({ price: 169 }))).toBe(169)
    expect(monthlyCost(sub({ price: 700, billing: 'quarterly' }))).toBe(233.33)
    expect(monthlyCost(sub({ price: 2290, billing: 'annual' }))).toBe(190.83)
    expect(annualCost(sub({ price: 2290, billing: 'annual' }))).toBe(2290)
    expect(annualCost(sub({ price: 700, billing: 'quarterly' }))).toBe(2800)
  })

  it('a shared plan counts only your share', () => {
    const family = sub({ price: 279, people: 6 })
    expect(yourShare(family)).toBe(46.5)
    expect(monthlyCost(family)).toBe(46.5)
    expect(annualCost(sub({ price: 6099, billing: 'annual', people: 3 }))).toBe(2033)
  })
})

describe('summary', () => {
  const list = [
    sub({ name: 'Netflix', price: 449 }),
    sub({ name: 'Spotify', price: 169 }),
    sub({ name: 'Disney+', price: 2290, billing: 'annual' }),
    sub({ name: 'ChatGPT', price: 1100, category: 'ai' }),
    sub({ name: 'M365', price: 6099, billing: 'annual', people: 6, category: 'productivity' }),
  ]
  const s = summarize(list)

  it('totals are exact sums of the monthly equivalents', () => {
    // 449 + 169 + 2290/12 + 1100 + 6099/72 = 1,993.54…
    expect(s.monthly).toBe(1993.54)
    expect(s.annual).toBe(23922.5)
    expect(s.weekly).toBe(460.05)
    expect(s.count).toBe(5)
    expect(s.average).toBe(398.71)
  })

  it('ranks by monthly cost and breaks spending down by category and billing', () => {
    expect(s.top[0].entry.name).toBe('ChatGPT')
    expect(s.top.map((t) => t.entry.name).at(-1)).toBe('M365')
    expect(s.byCategory.map((c) => c.category)).toEqual(['ai', 'entertainment', 'productivity'])
    expect(s.byCategory.reduce((a, c) => a + c.percent, 0)).toBeCloseTo(100, 0)
    expect(s.byCategory[1]).toMatchObject({ count: 3, monthly: 808.83 })
    expect(s.byBilling.find((b) => b.billing === 'annual')).toMatchObject({ count: 2, monthly: 275.54 })
  })

  it('is all zeros with nothing added', () => {
    expect(summarize([])).toMatchObject({ count: 0, monthly: 0, annual: 0, weekly: 0, average: 0, top: [], byCategory: [] })
  })
})

describe('what if I cancel', () => {
  it('reports the savings and the new total', () => {
    const a = sub({ price: 1000 })
    const b = sub({ price: 1200, billing: 'annual' })
    const r = simulateCancel([a, b], new Set([a.id]))
    expect(r).toEqual({ savedMonthly: 1000, savedAnnual: 12000, newMonthly: 100, newAnnual: 1200, reduction: 90.9 })
    expect(simulateCancel([a, b], new Set()).reduction).toBe(0)
  })
})

describe('budget', () => {
  it('shows how much of the budget is used, and when it is over', () => {
    expect(budgetCheck(1500, 2000)).toEqual({ budget: 2000, spent: 1500, left: 500, used: 75, over: false })
    expect(budgetCheck(2500, 2000)).toMatchObject({ left: -500, used: 125, over: true })
    expect(budgetCheck(0, 0)).toMatchObject({ used: 0, over: false })
  })
})

describe('renewals', () => {
  it('rolls a past renewal date forward by the billing period', () => {
    expect(nextRenewal('2026-01-31', 'monthly', '2026-02-10')).toBe('2026-02-28')
    expect(nextRenewal('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31')
    expect(nextRenewal('2025-12-01', 'annual', '2026-11-18')).toBe('2026-12-01')
    expect(nextRenewal('2026-12-05', 'quarterly', '2026-11-18')).toBe('2026-12-05')
    expect(nextRenewal('not a date', 'monthly', '2026-11-18')).toBeNull()
  })

  it('lists the coming month’s renewals with your share, soonest first', () => {
    const list = [
      sub({ name: 'Later', price: 300, renewal: '2026-12-15' }),
      sub({ name: 'Soon', price: 279, people: 3, renewal: '2026-10-20' }),
      sub({ name: 'Far', price: 2290, billing: 'annual', renewal: '2026-03-01' }),
    ]
    const r = upcomingRenewals(list, '2026-11-18', 31)
    expect(r.map((x) => [x.entry.name, x.date, x.inDays, x.amount])).toEqual([
      ['Soon', '2026-11-20', 2, 93],
      ['Later', '2026-12-15', 27, 300],
    ])
  })
})

describe('validation and storage', () => {
  it('rejects entries that cannot be counted', () => {
    expect(entryProblem({ name: '', price: 100, people: 1, billing: 'monthly' })).toMatch(/name/)
    expect(entryProblem({ name: 'X', price: 0, people: 1, billing: 'monthly' })).toMatch(/more than ₱0/)
    expect(entryProblem({ name: 'X', price: -5, people: 1, billing: 'monthly' })).toMatch(/more than ₱0/)
    expect(entryProblem({ name: 'X', price: 100, people: 0, billing: 'monthly' })).toMatch(/Split/)
    expect(entryProblem({ name: 'X', price: 100, people: 2, billing: 'monthly' })).toBeNull()
  })

  it('drops malformed stored entries and keeps good ones', () => {
    const good = sub({ price: 169, renewal: '2026-12-01' })
    const out = sanitizeEntries([good, { id: 'x', name: 'Bad', price: 'abc' }, null, { ...good, id: 'y', renewal: '2026-02-31', category: 'nope' }])
    expect(out).toHaveLength(2)
    expect(out[1]).toMatchObject({ id: 'y', category: 'other' })
    expect(out[1].renewal).toBeUndefined()
    expect(sanitizeEntries('junk')).toEqual([])
  })
})

describe('directory', () => {
  it('every service has unique ids, a source for every verified price, and no converted prices', () => {
    expect(new Set(SERVICES.map((s) => s.id)).size).toBe(SERVICES.length)
    for (const s of SERVICES) {
      expect(new Set(s.plans.map((p) => p.id)).size, s.id).toBe(s.plans.length)
      const priced = s.plans.some((p) => p.prices.length || p.usd?.length)
      if (priced) expect(s.source?.url, s.id).toMatch(/^https:\/\//)
      for (const p of s.plans) {
        for (const x of p.prices) expect(x.pesos, `${s.id}/${p.id}`).toBeGreaterThan(0)
        // A plan is either priced in pesos or in dollars, never both: dollar prices are not converted.
        expect(p.prices.length > 0 && (p.usd?.length ?? 0) > 0, `${s.id}/${p.id}`).toBe(false)
      }
      if (s.logo) expect(BRAND_MARKS[s.logo], s.id).toBeDefined()
    }
  })

  it('matches the prices read from the official pages on 18 November 2026', () => {
    const price = (id: string, plan: string, billing = 'monthly') =>
      serviceById(id)!
        .plans.find((p) => p.id === plan)!
        .prices.find((x) => x.billing === billing)!.pesos
    expect(price('spotify', 'student')).toBe(85)
    expect(price('netflix', 'standard')).toBe(449)
    expect(price('disney', 'premium', 'annual')).toBe(4850)
    expect(price('youtube-premium', 'family')).toBe(379)
    expect(price('microsoft-365', 'family', 'annual')).toBe(6099)
    expect(price('chatgpt', 'plus')).toBe(1100)
    expect(price('hbo-max', 'standard')).toBe(269)
  })

  it('search finds services by name and keyword', () => {
    expect(searchServices('spot')[0].id).toBe('spotify')
    expect(searchServices('gemini')[0].id).toBe('google-ai-pro')
    expect(searchServices('photoshop')[0].id).toBe('adobe')
    expect(searchServices('netflix')[0].id).toBe('netflix')
    expect(searchServices('')).toEqual([])
  })
})
