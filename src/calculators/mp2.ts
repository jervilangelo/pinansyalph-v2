import { D, type Dec, InputError, ZERO, assertAmount, assertRate, assertYears, centavos } from './money'
import { analyseReal, priceIndex, type Flow, type RealAnalysis } from './inflation'

/**
 * Pag-IBIG MP2 projection.
 *
 * How MP2 works (Pag-IBIG Fund):
 *  - A five-year savings term counted from the first remittance.
 *  - A dividend rate is declared once a year, after the year closes, and
 *    applies to that calendar year.
 *  - Members pick annual payout (dividends paid out each year) or
 *    compounding (dividends added to the savings, paid at maturity).
 *  - Dividends are tax-exempt.
 *
 * Model used here (a projection, not Pag-IBIG's official computation):
 *  - Dividends accrue monthly on the month's balance at rate/12. Summed over
 *    a calendar year this equals rate × average monthly balance, the basis
 *    most published explanations of MP2 dividends describe.
 *  - A deposit made during a month counts for a share of that month set by
 *    `timing`: start = full month, mid = half, end = none.
 *  - Accrued dividends are credited each December and at maturity, rounded
 *    to centavos. Compounded dividends earn from the next month.
 *  - Annual-payout dividends are treated as cash kept outside MP2 (no further
 *    growth) when computing the ending total and real value.
 *  - Durations beyond 5 years assume the matured savings are rolled into a
 *    new MP2 term on the same terms, which is hypothetical.
 */

export type Frequency = 'monthly' | 'quarterly' | 'annually' | 'none'
export type Payout = 'compounded' | 'annual'
export type Timing = 'start' | 'mid' | 'end'

export interface Mp2Input {
  initial: number
  contribution: number
  frequency: Frequency
  years: number
  /** Calendar month (1–12) of the first remittance. */
  startMonth: number
  /** Annual dividend rate(s), percent. An array gives one rate per calendar year from the start year; the last repeats. */
  dividendRatePct: number | number[]
  payout: Payout
  /** Annual inflation assumption(s), percent, per simulation year. */
  inflationPct: number | number[]
  timing?: Timing
}

export interface Mp2YearRow {
  /** 1-based year of the simulation. */
  year: number
  contributed: Dec
  dividendsThisYear: Dec
  dividendsTotal: Dec
  payoutsTotal: Dec
  balance: Dec
  /** balance + payouts so far, in nominal pesos */
  nominalTotal: Dec
  /** nominalTotal in today's pesos */
  realTotal: Dec
  /** Contributions so far, each valued in today's pesos at the month it was made. */
  realContributed: Dec
}

export interface Mp2Result {
  input: Required<Mp2Input>
  rows: Mp2YearRow[]
  totalContributed: Dec
  totalDividends: Dec
  totalPayouts: Dec
  /** Balance at the end (for annual payout: savings only). */
  maturityBalance: Dec
  /** Maturity balance plus dividends already paid out. */
  maturityValue: Dec
  real: RealAnalysis
  beyondStandardTerm: boolean
  contributionCount: number
}

export const MP2_TERM_YEARS = 5

const WEIGHT: Record<Timing, number> = { start: 1, mid: 0.5, end: 0 }

function contributesAt(frequency: Frequency, t: number): boolean {
  switch (frequency) {
    case 'monthly':
      return true
    case 'quarterly':
      return t % 3 === 0
    case 'annually':
      return t % 12 === 0
    case 'none':
      return false
  }
}

export function validateMp2(input: Mp2Input): void {
  assertAmount(input.initial, 'Initial investment')
  assertAmount(input.contribution, 'Contribution')
  assertYears(input.years)
  if (!Number.isInteger(input.startMonth) || input.startMonth < 1 || input.startMonth > 12) {
    throw new InputError('Start month must be 1–12.')
  }
  const rates = Array.isArray(input.dividendRatePct) ? input.dividendRatePct : [input.dividendRatePct]
  if (!rates.length) throw new InputError('A dividend rate is required.')
  rates.forEach((r) => assertRate(r, 'Dividend rate', 30))
  if (rates.some((r) => r < 0)) throw new InputError('Dividend rate cannot be negative.')
}

export function calculateMp2(raw: Mp2Input): Mp2Result {
  validateMp2(raw)
  const input: Required<Mp2Input> = { timing: 'mid', ...raw }
  const rates = Array.isArray(input.dividendRatePct) ? input.dividendRatePct : [input.dividendRatePct]
  const months = input.years * 12
  const index = priceIndex(input.inflationPct, months)
  const w = new D(WEIGHT[input.timing])

  let balance = ZERO
  let accrued = ZERO
  let contributed = ZERO
  let dividendsTotal = ZERO
  let payoutsTotal = ZERO
  let dividendsThisYear = ZERO
  let contributionCount = 0
  let realContributed = ZERO
  const contributions: Flow[] = []
  const payouts: Flow[] = []
  const rows: Mp2YearRow[] = []

  for (let t = 0; t < months; t++) {
    // Deposits this month
    let deposit = ZERO
    if (t === 0 && input.initial > 0) deposit = deposit.plus(input.initial)
    if (input.contribution > 0 && contributesAt(input.frequency, t)) {
      deposit = deposit.plus(input.contribution)
      contributionCount++
    }
    if (deposit.gt(0)) {
      contributions.push({ month: t, amount: deposit })
      contributed = contributed.plus(deposit)
      realContributed = realContributed.plus(deposit.div(index[t]))
    }

    // Dividend accrual for the month
    const calendarOffset = Math.floor((input.startMonth - 1 + t) / 12)
    const rate = new D(rates[Math.min(calendarOffset, rates.length - 1)]).div(100)
    const earningBalance = balance.plus(deposit.times(w))
    accrued = accrued.plus(earningBalance.times(rate).div(12))
    balance = balance.plus(deposit)

    // Crediting at calendar year end (December) or at maturity
    const calendarMonth = ((input.startMonth - 1 + t) % 12) + 1
    const isLast = t === months - 1
    if (calendarMonth === 12 || isLast) {
      const credited = centavos(accrued)
      accrued = ZERO
      dividendsTotal = dividendsTotal.plus(credited)
      dividendsThisYear = dividendsThisYear.plus(credited)
      if (input.payout === 'compounded') {
        balance = balance.plus(credited)
      } else if (credited.gt(0)) {
        payoutsTotal = payoutsTotal.plus(credited)
        payouts.push({ month: t + 1, amount: credited })
      }
    }

    // Year-of-term snapshot (every 12 months from start)
    if ((t + 1) % 12 === 0) {
      const nominalTotal = balance.plus(payoutsTotal)
      rows.push({
        year: (t + 1) / 12,
        contributed,
        dividendsThisYear,
        dividendsTotal,
        payoutsTotal,
        balance,
        nominalTotal,
        realTotal: nominalTotal.div(index[t + 1]),
        realContributed,
      })
      dividendsThisYear = ZERO
    }
  }

  // Payouts are held as cash until the end; the final payout lands at `months`.
  const real = analyseReal(contributions, payouts, balance, months, index)

  return {
    input,
    rows,
    totalContributed: contributed,
    totalDividends: dividendsTotal,
    totalPayouts: payoutsTotal,
    maturityBalance: balance,
    maturityValue: balance.plus(payoutsTotal),
    real,
    beyondStandardTerm: input.years > MP2_TERM_YEARS,
    contributionCount,
  }
}

/** Simple average of declared rates over the most recent `years` years. */
export function historicalAverage(rates: { year: number; rate: number }[], years = 5): number {
  const recent = [...rates].sort((a, b) => b.year - a.year).slice(0, years)
  if (!recent.length) throw new InputError('No declared rates available')
  const avg = recent.reduce((s, r) => s + r.rate, 0) / recent.length
  return Math.round(avg * 100) / 100
}
