import { useEffect, useMemo, useState } from 'react'
import { calculateBudget, fuelMonthly, type BudgetItem, type GroupKey, type ItemKind } from '../calculators/budget'
import { calculatePayroll, type PayFrequency, type SalaryInput } from '../calculators/payroll'
import { payrollRules } from '../data'
import { safe } from './useScenario'

/**
 * State for "Saan napupunta ang sweldo ko?". Everything stays in the
 * browser. Inputs are only written to localStorage when the visitor turns
 * on "Remember on this device", and can be cleared at any time.
 */

export const GROUP_LABELS: Record<GroupKey, string> = {
  housing: 'Housing and utilities',
  transport: 'Transportation',
  food: 'Food and groceries',
  personal: 'Personal expenses',
  commitments: 'Debt and commitments',
  savings: 'Savings and investments',
  custom: 'Other expenses',
}

interface ItemDef {
  id: string
  label: string
  kind: ItemKind
  hint?: string
}

export const CATALOGUE: Record<Exclude<GroupKey, 'custom'>, ItemDef[]> = {
  housing: [
    { id: 'rent', label: 'Rent or housing payment', kind: 'expense' },
    { id: 'electricity', label: 'Electricity (Meralco or local co-op)', kind: 'expense' },
    { id: 'water', label: 'Water', kind: 'expense' },
    { id: 'internet', label: 'Internet', kind: 'expense' },
    { id: 'mobile', label: 'Mobile load or postpaid plan', kind: 'expense' },
    { id: 'lpg', label: 'LPG or cooking gas', kind: 'expense' },
    { id: 'homeMaintenance', label: 'Home maintenance', kind: 'expense' },
  ],
  transport: [
    { id: 'carFuel', label: 'Car gasoline', kind: 'expense' },
    { id: 'motoFuel', label: 'Motorcycle gasoline', kind: 'expense' },
    { id: 'commute', label: 'Public transportation', kind: 'expense', hint: 'Jeepney, bus, MRT/LRT, tricycle, ride-hailing' },
    { id: 'parking', label: 'Parking', kind: 'expense' },
    { id: 'toll', label: 'Toll fees', kind: 'expense' },
    { id: 'vehicleMaintenance', label: 'Vehicle maintenance', kind: 'expense' },
    { id: 'vehicleLoan', label: 'Car or motorcycle loan', kind: 'debt' },
  ],
  food: [
    { id: 'groceries', label: 'Groceries', kind: 'expense' },
    { id: 'meals', label: 'Daily meals and baon', kind: 'expense' },
    { id: 'eatingOut', label: 'Eating out', kind: 'expense' },
    { id: 'delivery', label: 'Food delivery', kind: 'expense' },
    { id: 'coffee', label: 'Coffee or snacks', kind: 'expense' },
  ],
  personal: [
    { id: 'shopping', label: 'Shopping', kind: 'expense' },
    { id: 'clothing', label: 'Clothing', kind: 'expense' },
    { id: 'haircut', label: 'Haircuts and grooming', kind: 'expense' },
    { id: 'toiletries', label: 'Toiletries', kind: 'expense' },
    { id: 'entertainment', label: 'Entertainment', kind: 'expense' },
    { id: 'subscriptions', label: 'Subscriptions', kind: 'expense', hint: 'Streaming, apps, cloud storage' },
    { id: 'gym', label: 'Gym or fitness', kind: 'expense' },
    { id: 'otherPersonal', label: 'Other personal spending', kind: 'expense' },
  ],
  commitments: [
    { id: 'creditCard', label: 'Credit card payments', kind: 'debt' },
    { id: 'personalLoan', label: 'Personal loans', kind: 'debt' },
    { id: 'insurance', label: 'Insurance premiums', kind: 'expense' },
    { id: 'familySupport', label: 'Family support', kind: 'expense', hint: 'Padala to parents or relatives' },
  ],
  savings: [
    { id: 'emergencyFund', label: 'Emergency fund', kind: 'saving' },
    { id: 'savings', label: 'Savings', kind: 'saving' },
    { id: 'mp2', label: 'Pag-IBIG MP2', kind: 'saving' },
    { id: 'investments', label: 'Other investments', kind: 'saving' },
  ],
}

export interface CustomItem {
  id: string
  label: string
  amount: number
}

export interface FuelEstimator {
  on: boolean
  kmPerDay: number
  daysPerWeek: number
  kmPerLiter: number
  /** Price per liter the visitor enters. There is no national pump price to default to. */
  pricePerLiter: number
}

export interface SalaryState {
  salary: SalaryInput
  amounts: Record<string, number>
  custom: CustomItem[]
  disabled: GroupKey[]
  fuel: FuelEstimator
}

export const DEFAULT_STATE: SalaryState = {
  salary: {
    basic: 30000,
    taxableAllowances: 0,
    otherTaxable: 0,
    nonTaxableAllowances: 0,
    overtime: 0,
    frequency: 'semiMonthly',
    minimumWageEarner: false,
    otherDeductions: 0,
    annualBonus: 0,
  },
  amounts: {},
  custom: [],
  disabled: [],
  fuel: { on: false, kmPerDay: 30, daysPerWeek: 5, kmPerLiter: 12, pricePerLiter: 0 },
}

/** An illustrative budget, clearly labelled as a sample in the interface. */
export const SAMPLE_AMOUNTS: Record<string, number> = {
  rent: 6000,
  electricity: 2200,
  water: 400,
  internet: 1499,
  mobile: 300,
  lpg: 500,
  commute: 2200,
  groceries: 4500,
  meals: 2000,
  coffee: 400,
  toiletries: 400,
  subscriptions: 300,
  familySupport: 2000,
  emergencyFund: 1000,
  mp2: 1000,
}

const STORAGE_KEY = 'wib-salary-v1'

function readStored(): SalaryState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SalaryState
    if (!parsed?.salary || typeof parsed.salary.basic !== 'number') return null
    return { ...DEFAULT_STATE, ...parsed, salary: { ...DEFAULT_STATE.salary, ...parsed.salary }, fuel: { ...DEFAULT_STATE.fuel, ...parsed.fuel } }
  } catch {
    return null
  }
}

export function itemsFrom(state: SalaryState, fuelCost: number | null): BudgetItem[] {
  const items: BudgetItem[] = []
  for (const [group, defs] of Object.entries(CATALOGUE) as [Exclude<GroupKey, 'custom'>, ItemDef[]][]) {
    for (const d of defs) {
      const amount = d.id === 'carFuel' && state.fuel.on && fuelCost !== null ? fuelCost : (state.amounts[d.id] ?? 0)
      items.push({ id: d.id, label: d.label, group, kind: d.kind, amount })
    }
  }
  for (const c of state.custom) items.push({ id: c.id, label: c.label || 'Custom expense', group: 'custom', kind: 'expense', amount: c.amount })
  return items
}

export function useSalary() {
  const [stored] = useState(() => (typeof window === 'undefined' ? null : readStored()))
  const [state, setState] = useState<SalaryState>(stored ?? DEFAULT_STATE)
  const [remember, setRemember] = useState(stored !== null)
  const [view, setView] = useState<'monthly' | 'perPay'>('monthly')

  useEffect(() => {
    try {
      if (remember) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage blocked: the calculator still works */
    }
  }, [state, remember])

  const fuel = useMemo(() => {
    if (!state.fuel.on) return null
    return safe(() => fuelMonthly(state.fuel))
  }, [state.fuel])
  const fuelCost = fuel?.ok ? fuel.value.cost.toNumber() : null

  const payroll = useMemo(() => safe(() => calculatePayroll(state.salary, payrollRules)), [state.salary])
  const budget = useMemo(() => {
    if (!payroll.ok) return null
    return safe(() => calculateBudget({ takeHome: payroll.value.takeHomeMonthly, items: itemsFrom(state, fuelCost), disabledGroups: state.disabled }))
  }, [payroll, state, fuelCost])

  return {
    state,
    setSalary: (patch: Partial<SalaryInput>) => setState((s) => ({ ...s, salary: { ...s.salary, ...patch } })),
    setAmount: (id: string, amount: number) => setState((s) => ({ ...s, amounts: { ...s.amounts, [id]: amount } })),
    setFuel: (patch: Partial<FuelEstimator>) => setState((s) => ({ ...s, fuel: { ...s.fuel, ...patch } })),
    toggleGroup: (g: GroupKey) => setState((s) => ({ ...s, disabled: s.disabled.includes(g) ? s.disabled.filter((x) => x !== g) : [...s.disabled, g] })),
    addCustom: () => setState((s) => ({ ...s, custom: [...s.custom, { id: `custom-${Date.now().toString(36)}`, label: '', amount: 0 }] })),
    updateCustom: (id: string, patch: Partial<CustomItem>) => setState((s) => ({ ...s, custom: s.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    removeCustom: (id: string) => setState((s) => ({ ...s, custom: s.custom.filter((c) => c.id !== id) })),
    fillSample: () => setState((s) => ({ ...s, amounts: { ...SAMPLE_AMOUNTS } })),
    reset: () => setState(DEFAULT_STATE),
    remember,
    setRemember,
    clearSaved: () => {
      setRemember(false)
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },
    view,
    setView,
    fuel,
    payroll,
    budget,
  }
}

export type SalaryHook = ReturnType<typeof useSalary>
export type { PayFrequency }
