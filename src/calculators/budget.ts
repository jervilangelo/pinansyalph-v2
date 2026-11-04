import { D, type Dec, InputError, ZERO, assertAmount, centavos } from './money'

/**
 * Monthly budget after take-home pay.
 *
 * Spending (consumption and debt) and saving are kept apart: savings reduce
 * the cash left this month but are not counted as expenses.
 */

export type GroupKey = 'housing' | 'transport' | 'food' | 'personal' | 'commitments' | 'savings' | 'custom'
export type ItemKind = 'expense' | 'debt' | 'saving'

export interface BudgetItem {
  id: string
  label: string
  group: GroupKey
  kind: ItemKind
  amount: number
}

export interface BudgetInput {
  takeHome: Dec | number
  items: BudgetItem[]
  /** Groups switched off are ignored entirely. */
  disabledGroups?: GroupKey[]
}

export type BudgetStatus = 'positive' | 'tight' | 'negative'

export interface BudgetResult {
  byGroup: Record<GroupKey, Dec>
  /** Consumption spending (bills, food, transport, personal, custom, non-debt commitments). */
  spending: Dec
  debt: Dec
  /** spending + debt: everything that is not saving. */
  expenses: Dec
  savings: Dec
  remaining: Dec
  status: BudgetStatus
  /** Groups ranked by amount, highest first (savings excluded). */
  ranking: { group: GroupKey; amount: Dec }[]
}

/** Within this share of take-home pay, a positive balance is "almost used up". */
export const TIGHT_SHARE = 0.05

const GROUPS: GroupKey[] = ['housing', 'transport', 'food', 'personal', 'commitments', 'savings', 'custom']

export function calculateBudget(input: BudgetInput): BudgetResult {
  const takeHome = new D(input.takeHome)
  const off = new Set(input.disabledGroups ?? [])
  const byGroup = Object.fromEntries(GROUPS.map((g) => [g, ZERO])) as Record<GroupKey, Dec>
  let spending = ZERO
  let debt = ZERO
  let savings = ZERO

  for (const item of input.items) {
    assertAmount(item.amount, item.label || 'Expense')
    if (off.has(item.group) || item.amount === 0) continue
    const a = centavos(new D(item.amount))
    byGroup[item.group] = byGroup[item.group].plus(a)
    if (item.kind === 'saving') savings = savings.plus(a)
    else if (item.kind === 'debt') debt = debt.plus(a)
    else spending = spending.plus(a)
  }

  const expenses = spending.plus(debt)
  const remaining = takeHome.minus(expenses).minus(savings)
  let status: BudgetStatus = 'positive'
  if (remaining.lt(0)) status = 'negative'
  else if (takeHome.lte(0) || remaining.lte(takeHome.times(TIGHT_SHARE))) status = 'tight'

  const ranking = GROUPS.filter((g) => g !== 'savings')
    .map((g) => ({ group: g, amount: byGroup[g] }))
    .filter((x) => x.amount.gt(0))
    .sort((a, b) => b.amount.comparedTo(a.amount))

  return { byGroup, spending, debt, expenses, savings, remaining, status, ranking }
}

export interface FuelInput {
  /** Kilometers driven on a travel day (round trip). */
  kmPerDay: number
  daysPerWeek: number
  kmPerLiter: number
  pricePerLiter: number
}

export const WEEKS_PER_MONTH = 52 / 12

/** Monthly fuel cost = km per month ÷ km per liter × price per liter. */
export function fuelMonthly(f: FuelInput): { liters: Dec; cost: Dec; km: Dec } {
  assertAmount(f.kmPerDay, 'Kilometers per day')
  assertAmount(f.pricePerLiter, 'Fuel price')
  if (!Number.isFinite(f.daysPerWeek) || f.daysPerWeek < 0 || f.daysPerWeek > 7) throw new InputError('Travel days must be from 0 to 7 a week.')
  if (!Number.isFinite(f.kmPerLiter) || f.kmPerLiter <= 0) throw new InputError('Fuel efficiency must be more than 0 km per liter.')
  const km = new D(f.kmPerDay).times(f.daysPerWeek).times(WEEKS_PER_MONTH)
  const liters = km.div(f.kmPerLiter)
  return { km, liters, cost: centavos(liters.times(f.pricePerLiter)) }
}

export interface Breakdown {
  key: string
  label: string
  amount: Dec
}

/**
 * Segments of gross pay for the donut chart: deductions, each spending group,
 * savings and what is left. They add up to gross pay exactly when the
 * balance is not negative. When it is negative, `shortfall` is returned and
 * the segments add up to gross + shortfall (money that is not there).
 */
export function salaryBreakdown(
  gross: Dec,
  government: Dec,
  otherPayroll: Dec,
  budget: BudgetResult,
  labels: Record<GroupKey, string>,
): { segments: Breakdown[]; shortfall: Dec } {
  const segments: Breakdown[] = [
    { key: 'government', label: 'Government deductions', amount: government },
    { key: 'payroll', label: 'Other payroll deductions', amount: otherPayroll },
    ...(['housing', 'transport', 'food', 'personal', 'commitments', 'custom'] as GroupKey[]).map((g) => ({ key: g, label: labels[g], amount: budget.byGroup[g] })),
    { key: 'savings', label: labels.savings, amount: budget.savings },
    { key: 'remaining', label: 'Remaining', amount: D.max(budget.remaining, 0) },
  ].filter((s) => s.amount.gt(0))
  const shortfall = budget.remaining.lt(0) ? budget.remaining.neg() : ZERO
  // Sanity: the parts must equal gross (+ shortfall). Guards against double counting.
  const sum = segments.reduce((s, x) => s.plus(x.amount), ZERO)
  if (gross.gt(0) && !sum.minus(shortfall).minus(gross).abs().lt(0.05)) {
    throw new Error(`Breakdown does not add up: ${sum.toFixed(2)} vs ${gross.toFixed(2)} + ${shortfall.toFixed(2)}`)
  }
  return { segments, shortfall }
}
