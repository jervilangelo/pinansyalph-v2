import type { BankProduct, RateTier } from '../types/data'
import { D, type Dec, InputError, ZERO, assertAmount, assertRate, assertYears, centavos } from './money'
import { analyseReal, priceIndex, type Flow, type RealAnalysis } from './inflation'

/**
 * Bank savings projection.
 *
 * Rules applied (see docs/METHODOLOGY.md):
 *  - Monthly deposits are made at the start of each month and earn interest
 *    for that whole month.
 *  - Interest for a month = balance × rate × days ÷ basis, where basis is the
 *    bank's disclosed day count (360 for CIMB) or 365 otherwise, and days is
 *    the actual length of the calendar month.
 *  - Daily crediting compounds daily on the after-tax amount (banks withhold
 *    tax each time they credit). Monthly crediting adds net interest once a
 *    month. When a bank does not state its crediting frequency, monthly is
 *    assumed and the UI says so.
 *  - Tiered rates are marginal: each slice of the balance earns its tier's rate.
 *  - A promotional rate applies only if the user opts in, only to the
 *    promo's balance cap, and only until its end date. After that the base
 *    rate applies.
 *  - Final withholding tax (20% under RA 12214) is deducted from every
 *    interest credit and rounded to centavos.
 *  - Time deposits take one placement (initial amount). Each matured term is
 *    renewed at the same rate with the after-tax interest added; months left
 *    over after the last full term earn nothing.
 */

export type SavingsProduct = Pick<
  BankProduct,
  'baseTiers' | 'promo' | 'crediting' | 'dayCount' | 'kind' | 'termMonths' | 'conditionalBonus' | 'withholdingTaxPct'
>

export interface SavingsInput {
  initial: number
  monthly: number
  years: number
  product: SavingsProduct
  /** Replace all base and promo rates with one flat rate, percent p.a. */
  rateOverridePct?: number | null
  applyPromo?: boolean
  includeConditionalBonus?: boolean
  /** Override the tax rate, percent. Defaults to the product's withholding tax. */
  taxPct?: number
  inflationPct: number | number[]
  /** First day of the projection (ISO date). Determines promo expiry and month lengths. */
  startDate?: string
}

export interface SavingsYearRow {
  year: number
  deposited: Dec
  grossInterest: Dec
  tax: Dec
  netInterest: Dec
  balance: Dec
  realBalance: Dec
}

export interface SavingsResult {
  rows: SavingsYearRow[]
  totalDeposited: Dec
  grossInterest: Dec
  tax: Dec
  netInterest: Dec
  finalBalance: Dec
  real: RealAnalysis
  /** Notes the UI must show because an assumption was made. */
  assumptions: string[]
  /** Month index at which the promo stopped applying, if it did. */
  promoEndedAtMonth: number | null
  /** Per-credit log (monthly for savings, per term for time deposits). */
  credits: { month: number; gross: Dec; tax: Dec; balance: Dec }[]
}

/** Interest rate (percent) that applies to a balance under marginal tiers: returns the money-weighted rate. */
export function tieredInterestPerYear(balance: Dec, tiers: RateTier[]): Dec {
  let remaining = balance
  let lower = ZERO
  let interest = ZERO
  for (const tier of tiers) {
    if (remaining.lte(0)) break
    const span = tier.upTo === null ? remaining : D.min(remaining, new D(tier.upTo).minus(lower))
    if (span.gt(0)) {
      interest = interest.plus(span.times(tier.rate).div(100))
      remaining = remaining.minus(span)
    }
    if (tier.upTo !== null) lower = new D(tier.upTo)
  }
  return interest // annual interest in pesos at this balance
}

function addMonths(date: Date, n: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, date.getUTCDate()))
}

function daysInMonthAt(start: Date, monthIndex: number): number {
  const a = addMonths(start, monthIndex)
  const b = addMonths(start, monthIndex + 1)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function validateSavings(input: SavingsInput): void {
  assertAmount(input.initial, 'Initial deposit')
  assertAmount(input.monthly, 'Monthly deposit')
  assertYears(input.years)
  if (input.rateOverridePct != null) {
    assertRate(input.rateOverridePct, 'Interest rate', 30)
    if (input.rateOverridePct < 0) throw new InputError('Interest rate cannot be negative.')
  }
  if (input.taxPct != null && (input.taxPct < 0 || input.taxPct > 100)) {
    throw new InputError('Tax rate must be between 0% and 100%.')
  }
  if (!input.product.baseTiers.length) throw new InputError('This product has no rate data. Enter a rate manually.')
}

export function calculateSavings(input: SavingsInput): SavingsResult {
  validateSavings(input)
  const p = input.product
  const months = input.years * 12
  const index = priceIndex(input.inflationPct, months)
  const start = new Date(`${input.startDate ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) throw new InputError('Invalid start date.')
  const taxRate = new D(input.taxPct ?? p.withholdingTaxPct).div(100)
  const basis = p.dayCount ?? 365
  const assumptions: string[] = []

  const override = input.rateOverridePct ?? null
  const baseTiers: RateTier[] = override !== null ? [{ upTo: null, rate: override }] : p.baseTiers
  const promo = override === null && input.applyPromo && p.promo ? p.promo : null
  const promoEnd = promo?.endsOn ? new Date(`${promo.endsOn}T23:59:59Z`) : null
  let promoEndedAtMonth: number | null = null

  if (p.crediting === null) assumptions.push('The bank does not state how often it credits interest; monthly crediting is assumed.')
  if (override !== null) assumptions.push(`Using your rate of ${override}% p.a. instead of the bank's published rates.`)
  if (promo) assumptions.push(`Promo rate of up to ${promo.rate}% applied to the first ₱${promo.cap?.toLocaleString('en-PH') ?? '—'} until ${promo.endsOn ?? 'no stated end'}, only if every condition is met.`)
  if (input.applyPromo && promoEnd && promoEnd < start) assumptions.push('The selected promo has already ended, so only the base rate applies.')

  let balance = ZERO
  let deposited = ZERO
  let gross = ZERO
  let tax = ZERO
  const contributions: Flow[] = []
  const rows: SavingsYearRow[] = []
  let yGross = ZERO
  let yTax = ZERO
  const credits: SavingsResult['credits'] = []

  const annualInterestAt = (bal: Dec, monthIdx: number): Dec => {
    const monthStart = addMonths(start, monthIdx)
    const promoActive = promo && (!promoEnd || monthStart <= promoEnd)
    if (promo && !promoActive && promoEndedAtMonth === null) promoEndedAtMonth = monthIdx
    if (!promoActive || !promo) return tieredInterestPerYear(bal, baseTiers)
    const capped = promo.cap === null ? bal : D.min(bal, promo.cap)
    const rest = bal.minus(capped)
    // Promo applies to the capped slice; the rest earns base tiers on the slice above the cap.
    const restInterest = tieredInterestPerYear(bal, baseTiers).minus(tieredInterestPerYear(capped, baseTiers))
    return capped.times(promo.rate).div(100).plus(rest.gt(0) ? restInterest : ZERO)
  }

  if (p.kind === 'time-deposit') {
    const term = p.termMonths ?? 12
    if (input.monthly > 0) assumptions.push('Time deposits accept one placement, so monthly deposits are not added.')
    const bonus = input.includeConditionalBonus && p.conditionalBonus && override === null ? p.conditionalBonus.rate : 0
    if (bonus) assumptions.push(`Includes the conditional +${bonus}% bonus, paid only if its condition is met for the whole term.`)
    balance = new D(input.initial)
    deposited = balance
    if (balance.gt(0)) contributions.push({ month: 0, amount: balance })
    const fullTerms = Math.floor(months / term)
    if (months % term !== 0) assumptions.push(`The last ${months % term} month(s) do not complete a ${term}-month term and earn no interest.`)
    if (fullTerms > 1) assumptions.push('Each matured placement is assumed to be renewed at today\'s rate.')
    let t = 0
    for (let k = 0; k < fullTerms; k++) {
      const rate = tieredInterestPerYear(balance, baseTiers).plus(balance.times(bonus).div(100))
      const g = centavos(rate.times(term).div(12))
      const tx = centavos(g.times(taxRate))
      gross = gross.plus(g)
      tax = tax.plus(tx)
      yGross = yGross.plus(g)
      yTax = yTax.plus(tx)
      t += term
      balance = balance.plus(g).minus(tx)
      credits.push({ month: t, gross: g, tax: tx, balance })
      // Emit yearly rows for every year boundary crossed by this term
      while (rows.length < Math.floor(t / 12)) pushRow(rows.length + 1)
    }
    while (rows.length < input.years) pushRow(rows.length + 1)
  } else {
    for (let t = 0; t < months; t++) {
      let deposit = ZERO
      if (t === 0 && input.initial > 0) deposit = deposit.plus(input.initial)
      if (input.monthly > 0) deposit = deposit.plus(input.monthly)
      if (deposit.gt(0)) {
        balance = balance.plus(deposit)
        deposited = deposited.plus(deposit)
        contributions.push({ month: t, amount: deposit })
      }
      const days = daysInMonthAt(start, t)
      const annual = annualInterestAt(balance, t)
      let g: Dec
      let tx: Dec
      if (p.crediting === 'daily') {
        // Credited every day net of tax, so the month compounds daily on the net rate.
        const effRate = balance.isZero() ? ZERO : annual.div(balance)
        const netDaily = effRate.times(new D(1).minus(taxRate)).div(basis)
        const net = centavos(balance.times(new D(1).plus(netDaily).pow(days).minus(1)))
        g = taxRate.eq(1) ? centavos(annual.times(days).div(basis)) : centavos(net.div(new D(1).minus(taxRate)))
        tx = g.minus(net)
      } else {
        g = centavos(annual.times(days).div(basis))
        tx = centavos(g.times(taxRate))
      }
      gross = gross.plus(g)
      tax = tax.plus(tx)
      yGross = yGross.plus(g)
      yTax = yTax.plus(tx)
      balance = balance.plus(g).minus(tx)
      credits.push({ month: t + 1, gross: g, tax: tx, balance })
      if ((t + 1) % 12 === 0) pushRow((t + 1) / 12)
    }
  }

  function pushRow(year: number) {
    rows.push({
      year,
      deposited,
      grossInterest: yGross,
      tax: yTax,
      netInterest: yGross.minus(yTax),
      balance,
      realBalance: balance.div(index[Math.min(year * 12, months)]),
    })
    yGross = ZERO
    yTax = ZERO
  }

  return {
    rows,
    totalDeposited: deposited,
    grossInterest: gross,
    tax,
    netInterest: gross.minus(tax),
    finalBalance: balance,
    real: analyseReal(contributions, [], balance, months, index),
    assumptions,
    promoEndedAtMonth,
    credits,
  }
}
