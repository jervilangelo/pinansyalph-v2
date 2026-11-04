import { useMemo, useState } from 'react'
import { calculateMp2, historicalAverage, type Frequency, type Mp2Result, type Payout, type Timing } from '../calculators/mp2'
import { calculateSavings, type SavingsResult } from '../calculators/savings'
import { InputError } from '../calculators/money'
import { banks, latestHeadline, latestMp2, productById, recentAverageInflation, sortedMp2Rates } from '../data'
import { monthLabel } from '../utils/format'

/**
 * One shared scenario drives every calculator, so MP2 and bank products are
 * always compared with the same amounts, duration and inflation assumption.
 */

export type InflationMode = 'recent' | 'latest' | 'target' | 'custom'
export type RateMode = 'latest' | 'average' | 'custom'

export interface Scenario {
  initial: number
  monthly: number
  years: number
  inflationMode: InflationMode
  customInflation: number
}

export interface Mp2Options {
  rateMode: RateMode
  customRate: number
  payout: Payout
  frequency: Frequency
  startMonth: number
  timing: Timing
}

export interface BankOptions {
  productId: string
  override: number | null
  applyPromo: boolean
  includeBonus: boolean
}

/** BSP's inflation target is 2–4%; the midpoint is used as one reference assumption. */
export const BSP_TARGET_MIDPOINT = 3

export function inflationChoices() {
  return [
    {
      value: 'recent' as const,
      rate: recentAverageInflation.value,
      label: `PSA ${recentAverageInflation.from}–${recentAverageInflation.to} average (${recentAverageInflation.value}%)`,
      short: `the ${recentAverageInflation.from}–${recentAverageInflation.to} average inflation of ${recentAverageInflation.value}%`,
    },
    {
      value: 'latest' as const,
      rate: latestHeadline.value,
      label: `Latest PSA, ${monthLabel(latestHeadline.period, true)} (${latestHeadline.value}%)`,
      short: `${latestHeadline.value}% inflation (the latest PSA rate) every year`,
    },
    {
      value: 'target' as const,
      rate: BSP_TARGET_MIDPOINT,
      label: `BSP target midpoint (${BSP_TARGET_MIDPOINT}%)`,
      short: `${BSP_TARGET_MIDPOINT}% inflation (the BSP target midpoint)`,
    },
    { value: 'custom' as const, rate: NaN, label: 'My own estimate', short: '' },
  ]
}

export function resolveInflation(s: Scenario): { rate: number; label: string } {
  if (s.inflationMode === 'custom') return { rate: s.customInflation, label: `${s.customInflation}% inflation a year` }
  const c = inflationChoices().find((x) => x.value === s.inflationMode)!
  return { rate: c.rate, label: c.short }
}

export const MP2_AVERAGE_YEARS = 5

export function resolveMp2Rate(o: Mp2Options): { rate: number; label: string; kind: 'declared' | 'average' | 'assumption' } {
  if (o.rateMode === 'latest') return { rate: latestMp2.rate, label: `${latestMp2.year} declared rate`, kind: 'declared' }
  if (o.rateMode === 'average') {
    const avg = historicalAverage(sortedMp2Rates, MP2_AVERAGE_YEARS)
    const recent = sortedMp2Rates.slice(-MP2_AVERAGE_YEARS)
    return { rate: avg, label: `${recent[0].year}–${recent[recent.length - 1].year} average`, kind: 'average' }
  }
  return { rate: o.customRate, label: 'your projected rate', kind: 'assumption' }
}

const today = new Date()

export function useScenario() {
  const [scenario, setScenario] = useState<Scenario>({
    initial: 0,
    monthly: 5_000,
    years: 5,
    inflationMode: 'recent',
    customInflation: 4,
  })
  const [mp2Opts, setMp2Opts] = useState<Mp2Options>({
    rateMode: 'latest',
    customRate: 6,
    payout: 'compounded',
    frequency: 'monthly',
    startMonth: today.getMonth() + 1,
    timing: 'mid',
  })
  const [bankOpts, setBankOpts] = useState<BankOptions>({
    productId: banks.products[0].id,
    override: null,
    applyPromo: false,
    includeBonus: false,
  })
  const [compareIds, setCompareIds] = useState<string[]>(['maya-savings', 'tonik-solo-stash', 'cimb-gsave'])

  const inflation = resolveInflation(scenario)
  const mp2Rate = resolveMp2Rate(mp2Opts)

  const mp2Result = useMemo(
    () =>
      safe(() =>
        calculateMp2({
          initial: scenario.initial,
          contribution: scenario.monthly,
          frequency: mp2Opts.frequency,
          years: scenario.years,
          startMonth: mp2Opts.startMonth,
          dividendRatePct: mp2Rate.rate,
          payout: mp2Opts.payout,
          inflationPct: inflation.rate,
          timing: mp2Opts.timing,
        }),
      ),
    [scenario, mp2Opts, mp2Rate.rate, inflation.rate],
  )

  const bankResult = useMemo(() => {
    const p = productById(bankOpts.productId)
    if (!p) return { ok: false as const, error: 'Choose a product.' }
    return safe(() =>
      calculateSavings({
        initial: scenario.initial,
        monthly: scenario.monthly,
        years: scenario.years,
        product: p,
        rateOverridePct: bankOpts.override,
        applyPromo: bankOpts.applyPromo,
        includeConditionalBonus: bankOpts.includeBonus,
        inflationPct: inflation.rate,
        startDate: today.toISOString().slice(0, 10),
      }),
    )
  }, [scenario, bankOpts, inflation.rate])

  return {
    scenario,
    setScenario,
    mp2Opts,
    setMp2Opts,
    bankOpts,
    setBankOpts,
    compareIds,
    setCompareIds,
    inflation,
    mp2Rate,
    mp2Result,
    bankResult,
  }
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string }

export function safe<T>(fn: () => T): Outcome<T> {
  try {
    return { ok: true, value: fn() }
  } catch (err) {
    if (err instanceof InputError) return { ok: false, error: err.message }
    return { ok: false, error: 'Something went wrong with this calculation. Please check the inputs.' }
  }
}

export type ScenarioState = ReturnType<typeof useScenario>
export type { Mp2Result, SavingsResult }
