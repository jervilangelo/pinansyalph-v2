import { D, type Dec, ZERO, assertRate } from './money'

/**
 * Inflation adjustment.
 *
 * A price index P[t] is built month by month from annual inflation rates:
 *   P[0] = 1,  P[t] = P[t-1] × (1 + π_y)^(1/12)
 * where π_y is the annual rate assumed for the simulation year containing
 * month t. With one constant rate this is exactly (1 + π)^(t/12), so after
 * whole years Real = Nominal / (1 + π)^years. With a different rate per
 * year it is the cumulative product of those yearly factors.
 *
 * All "real" amounts are expressed in today's pesos (month 0).
 */
export function priceIndex(annualRatesPct: number | number[], months: number): Dec[] {
  const rates = Array.isArray(annualRatesPct) ? annualRatesPct : [annualRatesPct]
  if (rates.length === 0) throw new Error('At least one inflation rate is required')
  rates.forEach((r) => assertRate(r, 'Inflation rate', 100))
  const index: Dec[] = [new D(1)]
  for (let t = 1; t <= months; t++) {
    const yearIdx = Math.floor((t - 1) / 12)
    const pct = rates[Math.min(yearIdx, rates.length - 1)]
    const monthly = new D(1).plus(new D(pct).div(100)).pow(new D(1).div(12))
    index.push(index[t - 1].times(monthly))
  }
  return index
}

/** Purchasing power, in today's pesos, of `nominal` received at month t. */
export function toReal(nominal: Dec, index: Dec[], t: number): Dec {
  return nominal.div(index[Math.min(t, index.length - 1)])
}

export interface Flow {
  /** Month index from the start (0 = today). */
  month: number
  amount: Dec
}

export interface RealAnalysis {
  totalContributed: Dec
  /** Final balance plus any payouts received (held as cash, no further growth). */
  nominalEnding: Dec
  nominalGain: Dec
  /** Purchasing power of nominalEnding at the end, in today's pesos. */
  realEnding: Dec
  /** Sum of each contribution valued in today's pesos at the time it was made. */
  realContributed: Dec
  /** realEnding − realContributed. Negative = purchasing power lost. */
  realGain: Dec
  /** Money-weighted annual returns (internal rate of return), percent. null if undefined. */
  nominalAnnualReturnPct: number | null
  realAnnualReturnPct: number | null
  /** Cumulative price rise over the horizon, percent. */
  cumulativeInflationPct: number
}

/**
 * Compare what went in with what came out, in nominal and in real terms,
 * respecting when each peso was deposited or received.
 */
export function analyseReal(
  contributions: Flow[],
  payouts: Flow[],
  finalBalance: Dec,
  finalMonth: number,
  index: Dec[],
): RealAnalysis {
  const totalContributed = contributions.reduce((s, f) => s.plus(f.amount), ZERO)
  const totalPayouts = payouts.reduce((s, f) => s.plus(f.amount), ZERO)
  const nominalEnding = finalBalance.plus(totalPayouts)
  const pEnd = index[Math.min(finalMonth, index.length - 1)]
  const realEnding = nominalEnding.div(pEnd)
  const realContributed = contributions.reduce((s, f) => s.plus(toReal(f.amount, index, f.month)), ZERO)

  const nominalFlows = [
    ...contributions.map((f) => ({ month: f.month, amount: f.amount.neg().toNumber() })),
    ...payouts.map((f) => ({ month: f.month, amount: f.amount.toNumber() })),
    { month: finalMonth, amount: finalBalance.toNumber() },
  ]
  const realFlows = nominalFlows.map((f) => ({
    month: f.month,
    amount: new D(f.amount).div(index[Math.min(f.month, index.length - 1)]).toNumber(),
  }))

  return {
    totalContributed,
    nominalEnding,
    nominalGain: nominalEnding.minus(totalContributed),
    realEnding,
    realContributed,
    realGain: realEnding.minus(realContributed),
    nominalAnnualReturnPct: annualisedIrr(nominalFlows),
    realAnnualReturnPct: annualisedIrr(realFlows),
    cumulativeInflationPct: pEnd.minus(1).times(100).toNumber(),
  }
}

/**
 * Monthly internal rate of return by bisection, annualised.
 * Payout flows are positive, deposits negative. Returns null when there is
 * no sign change (e.g. nothing was invested).
 */
export function annualisedIrr(flows: { month: number; amount: number }[]): number | null {
  const hasIn = flows.some((f) => f.amount < 0)
  const hasOut = flows.some((f) => f.amount > 0)
  if (!hasIn || !hasOut) return null
  const npv = (r: number) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, f.month), 0)
  let lo = -0.99
  let hi = 1
  let fLo = npv(lo)
  if (Math.sign(fLo) === Math.sign(npv(hi))) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-9) {
      lo = hi = mid
      break
    }
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid
      fLo = fMid
    } else {
      hi = mid
    }
  }
  const monthly = (lo + hi) / 2
  return (Math.pow(1 + monthly, 12) - 1) * 100
}

export type InsightTone = 'positive' | 'negative' | 'neutral'
export interface Insight {
  tone: InsightTone
  title: string
  body: string
}

/** Within ±0.5% of what was put in counts as roughly keeping pace. */
const NEUTRAL_BAND = 0.005

/**
 * Plain-language reading of the result. Driven only by the numbers:
 * the site's name asks a question, it does not presume the answer.
 */
export function insightFor(a: RealAnalysis, inflationLabel: string): Insight {
  if (a.totalContributed.isZero()) {
    return { tone: 'neutral', title: 'Enter an amount to see the result.', body: 'Add a starting amount or a regular contribution.' }
  }
  const realRatio = a.realGain.div(a.realContributed).toNumber()
  const nominalUp = a.nominalGain.gt(0)

  if (realRatio > NEUTRAL_BAND) {
    return {
      tone: 'positive',
      title: 'Your money outpaced inflation.',
      body: `Under ${inflationLabel}, the final amount buys more than everything you put in. Your purchasing power grew.`,
    }
  }
  if (realRatio < -NEUTRAL_BAND) {
    return nominalUp
      ? {
          tone: 'negative',
          title: 'Your money grew in pesos, but lost buying power.',
          body: `The balance went up, yet under ${inflationLabel} prices rose faster. Your estimated real return was negative.`,
        }
      : {
          tone: 'negative',
          title: 'Your money lost value in pesos and in buying power.',
          body: `After tax the balance did not grow enough, and under ${inflationLabel} it buys less than what you put in.`,
        }
  }
  return {
    tone: 'neutral',
    title: 'Your money roughly kept pace with inflation.',
    body: `Under ${inflationLabel}, the final amount buys about the same as what you put in. It held its value but did not really grow.`,
  }
}
