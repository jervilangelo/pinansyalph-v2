import { describe, expect, it } from 'vitest'
import { calculateBudget, fuelMonthly, salaryBreakdown, type BudgetItem, type GroupKey } from '../budget'
import { D, InputError } from '../money'

const item = (id: string, group: GroupKey, amount: number, kind: BudgetItem['kind'] = 'expense'): BudgetItem => ({ id, label: id, group, kind, amount })
const LABELS: Record<GroupKey, string> = {
  housing: 'Housing',
  transport: 'Transport',
  food: 'Food',
  personal: 'Personal',
  commitments: 'Debt and commitments',
  savings: 'Savings',
  custom: 'Other',
}

describe('budget', () => {
  it('leaves the whole take-home pay when there are no expenses', () => {
    const r = calculateBudget({ takeHome: 26542.45, items: [] })
    expect(r.remaining.toFixed(2)).toBe('26542.45')
    expect(r.status).toBe('positive')
    expect(r.ranking).toEqual([])
  })

  it('keeps savings apart from spending', () => {
    const r = calculateBudget({
      takeHome: 26542.45,
      items: [item('rent', 'housing', 8000), item('meralco', 'housing', 2500), item('grocery', 'food', 6000), item('card', 'commitments', 1500, 'debt'), item('mp2', 'savings', 3000, 'saving')],
    })
    expect(r.spending.toFixed(2)).toBe('16500.00')
    expect(r.debt.toFixed(2)).toBe('1500.00')
    expect(r.expenses.toFixed(2)).toBe('18000.00')
    expect(r.savings.toFixed(2)).toBe('3000.00')
    expect(r.remaining.toFixed(2)).toBe('5542.45')
    expect(r.ranking.map((x) => x.group)).toEqual(['housing', 'food', 'commitments'])
  })

  it('reports tight and negative balances', () => {
    expect(calculateBudget({ takeHome: 20000, items: [item('rent', 'housing', 19500)] }).status).toBe('tight')
    const neg = calculateBudget({ takeHome: 20000, items: [item('rent', 'housing', 25000)] })
    expect(neg.status).toBe('negative')
    expect(neg.remaining.toFixed(2)).toBe('-5000.00')
  })

  it('ignores switched-off groups and zero amounts', () => {
    const r = calculateBudget({ takeHome: 10000, items: [item('gym', 'personal', 2000), item('zero', 'food', 0)], disabledGroups: ['personal'] })
    expect(r.remaining.toFixed(2)).toBe('10000.00')
  })

  it('counts custom expenses and keeps decimals exact', () => {
    const r = calculateBudget({ takeHome: 1, items: [item('a', 'custom', 0.1), item('b', 'custom', 0.2)] })
    expect(r.byGroup.custom.toFixed(2)).toBe('0.30')
    expect(r.remaining.toFixed(2)).toBe('0.70')
  })

  it('rejects invalid amounts', () => {
    expect(() => calculateBudget({ takeHome: 1000, items: [item('bad', 'food', -1)] })).toThrow(InputError)
    expect(() => calculateBudget({ takeHome: 1000, items: [item('bad', 'food', Number.NaN)] })).toThrow(InputError)
  })
})

describe('fuel estimate', () => {
  it('converts distance, efficiency and price into a monthly cost', () => {
    const r = fuelMonthly({ kmPerDay: 40, daysPerWeek: 5, kmPerLiter: 12, pricePerLiter: 60 })
    // 40 × 5 × 52/12 = 866.67 km; ÷ 12 = 72.22 L; × ₱60 = ₱4,333.33
    expect(r.km.toFixed(2)).toBe('866.67')
    expect(r.liters.toFixed(2)).toBe('72.22')
    expect(r.cost.toFixed(2)).toBe('4333.33')
  })
  it('rejects impossible inputs', () => {
    expect(() => fuelMonthly({ kmPerDay: 10, daysPerWeek: 5, kmPerLiter: 0, pricePerLiter: 60 })).toThrow(InputError)
    expect(() => fuelMonthly({ kmPerDay: 10, daysPerWeek: 8, kmPerLiter: 10, pricePerLiter: 60 })).toThrow(InputError)
    expect(() => fuelMonthly({ kmPerDay: -1, daysPerWeek: 5, kmPerLiter: 10, pricePerLiter: 60 })).toThrow(InputError)
  })
})

describe('salary breakdown', () => {
  it('adds up to gross pay without double counting', () => {
    const budget = calculateBudget({ takeHome: 26542.45, items: [item('rent', 'housing', 8000), item('mp2', 'savings', 3000, 'saving')] })
    const { segments, shortfall } = salaryBreakdown(new D(30000), new D(3457.55), new D(0), budget, LABELS)
    const total = segments.reduce((s, x) => s.plus(x.amount), new D(0))
    expect(total.toFixed(2)).toBe('30000.00')
    expect(shortfall.toFixed(2)).toBe('0.00')
    expect(segments.map((x) => x.key)).toEqual(['government', 'housing', 'savings', 'remaining'])
  })
  it('reports a shortfall when spending exceeds take-home pay', () => {
    const budget = calculateBudget({ takeHome: 26542.45, items: [item('rent', 'housing', 30000)] })
    const { segments, shortfall } = salaryBreakdown(new D(30000), new D(3457.55), new D(0), budget, LABELS)
    expect(shortfall.toFixed(2)).toBe('3457.55')
    expect(segments.find((s) => s.key === 'remaining')).toBeUndefined()
  })
  it('throws if parts and whole disagree', () => {
    const budget = calculateBudget({ takeHome: 26542.45, items: [] })
    expect(() => salaryBreakdown(new D(30000), new D(1), new D(0), budget, LABELS)).toThrow(/does not add up/)
  })
})
