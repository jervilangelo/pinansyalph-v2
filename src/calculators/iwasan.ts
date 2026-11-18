import { D, ZERO, centavos, type Dec } from './money'

/**
 * "Mga Dapat Iwasan": the arithmetic behind gambling, loan apps, credit
 * cards, installments and the savings they displace. Every function takes the
 * visitor's own numbers; nothing here is a statistic about anyone.
 */

const money = (x: Dec) => centavos(x).toNumber()
const pct2 = (x: Dec) => x.toDecimalPlaces(2).toNumber()

/* ------------------------------------------------------------------ */
/* Gambling: expected loss                                              */
/* ------------------------------------------------------------------ */

export interface GamblingInput {
  /** Total amount bet in one session (turnover, including re-bet winnings). */
  perSession: number
  sessionsPerWeek: number
  /** House edge as a percent, e.g. 2.7. */
  houseEdge: number
  weeks: number
}

export function gamblingProblem(g: GamblingInput): string | null {
  if (!Number.isFinite(g.perSession) || g.perSession <= 0 || g.perSession > 10_000_000) return 'Enter the amount bet per session, more than ₱0.'
  if (!Number.isFinite(g.sessionsPerWeek) || g.sessionsPerWeek <= 0 || g.sessionsPerWeek > 100) return 'Sessions a week should be more than 0 and at most 100.'
  if (!Number.isFinite(g.houseEdge) || g.houseEdge < 0 || g.houseEdge > 100) return 'House edge should be from 0% to 100%.'
  if (!Number.isInteger(g.weeks) || g.weeks < 1 || g.weeks > 52 * 50) return 'Weeks should be a whole number from 1 to 2,600.'
  return null
}

export interface GamblingResult {
  totalWagered: number
  expectedLoss: number
  /** Total bets minus the expected loss: what the average player gets back from the bets. */
  expectedReturned: number
  perWeek: number
  perMonth: number
  perYear: number
}

/** Expected loss = total wagered × house edge. A long-run average, not a prediction for one player. */
export function expectedLoss(g: GamblingInput): GamblingResult {
  const weekly = new D(g.perSession).times(g.sessionsPerWeek)
  const edge = new D(g.houseEdge).div(100)
  const total = weekly.times(g.weeks)
  const loss = total.times(edge)
  return {
    totalWagered: money(total),
    expectedLoss: money(loss),
    expectedReturned: money(total.minus(loss)),
    perWeek: money(weekly.times(edge)),
    perMonth: money(weekly.times(edge).times(52).div(12)),
    perYear: money(weekly.times(edge).times(52)),
  }
}

/** House edges that follow from a game's rules, so they can be shown without citing a statistic. */
export const EDGE_EXAMPLES: { label: string; edge: number; derivation: string }[] = [
  { label: 'Single-zero roulette', edge: 2.7, derivation: 'An even-money bet wins 18 of 37 pockets and loses 19: (19 − 18) ÷ 37 ≈ 2.70%.' },
  { label: 'Double-zero roulette', edge: 5.26, derivation: 'An even-money bet wins 18 of 38 pockets and loses 20: (20 − 18) ÷ 38 ≈ 5.26%.' },
  { label: 'A game keeping 10% of bets', edge: 10, derivation: 'Hypothetical: a game that pays back ₱90 for every ₱100 bet, on average.' },
]

/** Deterministic pseudo-random numbers (mulberry32), so a "variance" demo is the same on every visit. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Running balance of even-money bets of ₱1 with win probability p, for
 * several simulated players. An illustration of variance, not data.
 */
export function simulatePaths(players: number, bets: number, p: number, seed = 7): number[][] {
  const r = rng(seed)
  return Array.from({ length: players }, () => {
    let bal = 0
    const path = [0]
    for (let i = 0; i < bets; i++) {
      bal += r() < p ? 1 : -1
      path.push(bal)
    }
    return path
  })
}

/* ------------------------------------------------------------------ */
/* Loans: true cost                                                     */
/* ------------------------------------------------------------------ */

export type InterestMethod = 'add-on' | 'diminishing'

export interface LoanInput {
  /** The amount the app says you borrow. */
  principal: number
  /** Fees taken out before you receive the money. */
  deductedFees: number
  /** Monthly interest rate, percent. */
  monthlyRate: number
  method: InterestMethod
  /** Loan length in months. */
  months: number
  /** Number of equal payments over the loan. */
  installments: number
  /** Other disclosed charges added to what you repay. */
  otherCharges: number
  /** Late fees you expect to pay in total (0 if none). */
  lateFees: number
}

export function loanProblem(l: LoanInput): string | null {
  if (!Number.isFinite(l.principal) || l.principal <= 0 || l.principal > 100_000_000) return 'Enter the loan amount, more than ₱0.'
  if (!Number.isFinite(l.deductedFees) || l.deductedFees < 0) return 'Deducted fees cannot be negative.'
  if (l.deductedFees >= l.principal) return 'Deducted fees must be less than the loan amount.'
  if (!Number.isFinite(l.monthlyRate) || l.monthlyRate < 0 || l.monthlyRate > 100) return 'Monthly interest should be from 0% to 100%.'
  if (!Number.isFinite(l.months) || l.months <= 0 || l.months > 120) return 'Loan length should be more than 0 and at most 120 months.'
  if (!Number.isInteger(l.installments) || l.installments < 1 || l.installments > 520) return 'Number of payments should be a whole number from 1 to 520.'
  if (!Number.isFinite(l.otherCharges) || l.otherCharges < 0 || !Number.isFinite(l.lateFees) || l.lateFees < 0) return 'Charges cannot be negative.'
  return null
}

/** Per-period rate that makes the payments worth the cash received (bisection on the IRR). */
export function solveRate(cashReceived: number, payments: number[]): number | null {
  const pv = (r: number) => payments.reduce((s, p, i) => s + p / (1 + r) ** (i + 1), 0)
  if (payments.reduce((s, p) => s + p, 0) <= cashReceived) return 0
  let lo = 0
  let hi = 1
  while (pv(hi) > cashReceived && hi < 1e6) hi *= 2
  if (pv(hi) > cashReceived) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (pv(mid) > cashReceived) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export interface LoanResult {
  cashReceived: number
  /** Advertised amount − cash received. */
  shortfall: number
  interest: number
  installment: number
  totalRepayment: number
  /** Total repayment − cash received. */
  totalCost: number
  /** Total cost as a percent of the cash you actually received. */
  costPercent: number
  /** Effective interest rate per month on the cash received, with fees, from the payment schedule. */
  effectiveMonthly: number | null
  /** Effective annual rate, (1 + monthly)^12 − 1. */
  effectiveAnnual: number | null
}

export function loanCost(l: LoanInput): LoanResult {
  const P = new D(l.principal)
  const rate = new D(l.monthlyRate).div(100)
  const cash = P.minus(l.deductedFees)
  const periodMonths = l.months / l.installments
  let installment: Dec
  let interest: Dec
  if (l.method === 'add-on' || rate.isZero()) {
    interest = P.times(rate).times(l.months)
    installment = P.plus(interest).div(l.installments)
  } else {
    // Diminishing balance: a level payment amortising P at the monthly rate, per payment period.
    const rp = rate.plus(1).pow(periodMonths).minus(1)
    installment = P.times(rp).div(new D(1).minus(rp.plus(1).pow(-l.installments)))
    interest = installment.times(l.installments).minus(P)
  }
  const extras = new D(l.otherCharges).plus(l.lateFees)
  const total = installment.times(l.installments).plus(extras)
  // Extras are assumed paid with the last instalment, which understates the rate slightly.
  const flows = Array.from({ length: l.installments }, (_, i) => installment.toNumber() + (i === l.installments - 1 ? extras.toNumber() : 0))
  const perPeriod = solveRate(cash.toNumber(), flows)
  const monthly = perPeriod == null ? null : (1 + perPeriod) ** (1 / periodMonths) - 1
  return {
    cashReceived: money(cash),
    shortfall: money(P.minus(cash)),
    interest: money(interest),
    installment: money(installment),
    totalRepayment: money(total),
    totalCost: money(total.minus(cash)),
    costPercent: pct2(total.minus(cash).div(cash).times(100)),
    effectiveMonthly: monthly == null ? null : Math.round(monthly * 10000) / 100,
    effectiveAnnual: monthly == null ? null : Math.round(((1 + monthly) ** 12 - 1) * 10000) / 100,
  }
}

/* ------------------------------------------------------------------ */
/* Borrowing again to repay                                             */
/* ------------------------------------------------------------------ */

export interface CycleInput {
  /** First loan's advertised amount. */
  principal: number
  /** Fees deducted from each loan, percent of the loan. */
  feePercent: number
  /** Add-on interest per month, percent. */
  monthlyRate: number
  /** Months until each loan is due. */
  months: number
  /** How many times you borrow again to pay the amount due. */
  cycles: number
  /** Cash of your own you put toward each due date before borrowing the rest. */
  ownPayment: number
}

export interface CycleRound {
  round: number
  borrowed: number
  fees: number
  cashReceived: number
  amountDue: number
  /** Your own money paid at this due date. */
  paidOwn: number
}

export interface CycleResult {
  rounds: CycleRound[]
  /** What is owed after the last round. */
  finalDue: number
  /** Your own money paid along the way. */
  totalOwnPaid: number
  /** All fees and interest charged across every loan. */
  totalCost: number
  /** Cash in hand from the first loan, the only money you got to spend. */
  firstCash: number
  /** True if borrowing again was never needed. */
  clearedEarly: boolean
}

export function cycleProblem(c: CycleInput): string | null {
  if (!Number.isFinite(c.principal) || c.principal <= 0) return 'Enter the first loan amount.'
  if (!Number.isFinite(c.feePercent) || c.feePercent < 0 || c.feePercent >= 100) return 'Fees should be from 0% to less than 100%.'
  if (!Number.isFinite(c.monthlyRate) || c.monthlyRate < 0 || c.monthlyRate > 100) return 'Interest should be from 0% to 100% a month.'
  if (!Number.isFinite(c.months) || c.months <= 0 || c.months > 24) return 'Months should be more than 0 and at most 24.'
  if (!Number.isInteger(c.cycles) || c.cycles < 0 || c.cycles > 12) return 'Times borrowing again should be from 0 to 12.'
  if (!Number.isFinite(c.ownPayment) || c.ownPayment < 0) return 'Your own payment cannot be negative.'
  return null
}

/**
 * Each round: borrow, owe principal plus add-on interest at the due date, pay
 * what you can from your own money, and borrow just enough (after its
 * deducted fees) to cover the rest.
 */
export function debtCycle(c: CycleInput): CycleResult {
  const fee = new D(c.feePercent).div(100)
  const growth = new D(c.monthlyRate).div(100).times(c.months).plus(1)
  const rounds: CycleRound[] = []
  let borrowed = new D(c.principal)
  let ownTotal = ZERO
  let cost = ZERO
  let due = ZERO
  let cleared = false
  for (let i = 0; i <= c.cycles; i++) {
    const fees = borrowed.times(fee)
    due = borrowed.times(growth)
    cost = cost.plus(fees).plus(due.minus(borrowed))
    const own = D.min(new D(c.ownPayment), due)
    ownTotal = ownTotal.plus(own)
    rounds.push({ round: i + 1, borrowed: money(borrowed), fees: money(fees), cashReceived: money(borrowed.minus(fees)), amountDue: money(due), paidOwn: money(own) })
    const rest = due.minus(own)
    if (rest.lte(0)) {
      due = ZERO
      cleared = true
      break
    }
    due = rest
    if (i < c.cycles) borrowed = rest.div(new D(1).minus(fee))
  }
  return {
    rounds,
    finalDue: money(due),
    totalOwnPaid: money(ownTotal),
    totalCost: money(cost),
    firstCash: rounds[0].cashReceived,
    clearedEarly: cleared,
  }
}

/* ------------------------------------------------------------------ */
/* Credit cards: minimum payment                                        */
/* ------------------------------------------------------------------ */

export interface CardInput {
  balance: number
  /** Monthly finance charge, percent. */
  monthlyRate: number
  /** Minimum due as a percent of the balance. */
  minPercent: number
  /** Minimum due floor in pesos. */
  minAmount: number
  /** New purchases added each month. */
  newSpending: number
}

export type CardStrategy = { kind: 'minimum' } | { kind: 'fixed'; amount: number }

export interface CardMonth {
  month: number
  opening: number
  interest: number
  payment: number
  closing: number
}

export interface CardResult {
  /** null when the balance never reaches zero within the limit. */
  months: number | null
  totalInterest: number
  totalPaid: number
  schedule: CardMonth[]
  /** True when the payment never exceeds the month's finance charge plus new spending. */
  neverPaysOff: boolean
}

export const CARD_LIMIT_MONTHS = 600

export function cardProblem(c: CardInput): string | null {
  if (!Number.isFinite(c.balance) || c.balance <= 0 || c.balance > 100_000_000) return 'Enter the outstanding balance, more than ₱0.'
  if (!Number.isFinite(c.monthlyRate) || c.monthlyRate < 0 || c.monthlyRate > 10) return 'Monthly finance charge should be from 0% to 10%.'
  if (!Number.isFinite(c.minPercent) || c.minPercent <= 0 || c.minPercent > 100) return 'Minimum payment percent should be more than 0% and at most 100%.'
  if (!Number.isFinite(c.minAmount) || c.minAmount < 0) return 'Minimum amount cannot be negative.'
  if (!Number.isFinite(c.newSpending) || c.newSpending < 0) return 'New spending cannot be negative.'
  return null
}

/**
 * Month by month: finance charge on the balance carried, then new spending,
 * then the payment. A simplification: issuers compute charges on average
 * daily balances and may treat new purchases differently.
 */
export function cardRepayment(c: CardInput, s: CardStrategy, limit = CARD_LIMIT_MONTHS): CardResult {
  const r = new D(c.monthlyRate).div(100)
  let bal = new D(c.balance)
  let interestTotal = ZERO
  let paidTotal = ZERO
  const schedule: CardMonth[] = []
  for (let m = 1; m <= limit; m++) {
    const opening = bal
    const interest = centavos(bal.times(r))
    const owed = bal.plus(interest).plus(c.newSpending)
    const due = s.kind === 'minimum' ? D.max(centavos(owed.times(c.minPercent).div(100)), new D(c.minAmount)) : new D(s.amount)
    const payment = D.min(due, owed)
    bal = owed.minus(payment)
    interestTotal = interestTotal.plus(interest)
    paidTotal = paidTotal.plus(payment)
    schedule.push({ month: m, opening: money(opening), interest: money(interest), payment: money(payment), closing: money(bal) })
    if (bal.lte(0.005)) return { months: m, totalInterest: money(interestTotal), totalPaid: money(paidTotal), schedule, neverPaysOff: false }
    if (m > 1 && bal.gte(opening) && payment.lte(interest.plus(c.newSpending))) {
      return { months: null, totalInterest: money(interestTotal), totalPaid: money(paidTotal), schedule, neverPaysOff: true }
    }
  }
  return { months: null, totalInterest: money(interestTotal), totalPaid: money(paidTotal), schedule, neverPaysOff: false }
}

/* ------------------------------------------------------------------ */
/* Installments                                                         */
/* ------------------------------------------------------------------ */

export interface Installment {
  id: string
  name: string
  monthly: number
  monthsLeft: number
}

export interface InstallmentResult {
  totalMonthly: number
  /** Percent of take-home pay, or null without an income. */
  percentOfIncome: number | null
  remainingIncome: number | null
  totalRemaining: number
  /** Total due in each of the next 12 months, as plans end. */
  nextMonths: number[]
}

export function installmentLoad(list: Installment[], income: number): InstallmentResult {
  const totalMonthly = list.reduce((s, i) => s.plus(i.monthly), ZERO)
  const totalRemaining = list.reduce((s, i) => s.plus(new D(i.monthly).times(i.monthsLeft)), ZERO)
  const nextMonths = Array.from({ length: 12 }, (_, m) => money(list.filter((i) => i.monthsLeft > m).reduce((s, i) => s.plus(i.monthly), ZERO)))
  const has = Number.isFinite(income) && income > 0
  return {
    totalMonthly: money(totalMonthly),
    percentOfIncome: has ? pct2(totalMonthly.div(income).times(100)) : null,
    remainingIncome: has ? money(new D(income).minus(totalMonthly)) : null,
    totalRemaining: money(totalRemaining),
    nextMonths,
  }
}

export interface CashVsInstallment {
  /** Monthly × months + fees. */
  installmentTotal: number
  /** Installment total − cash price. */
  extraCost: number
  /** Months of saving the same monthly amount to pay cash. */
  monthsToSave: number
}

export function cashVsInstallment(cashPrice: number, monthly: number, months: number, fees: number): CashVsInstallment {
  const total = new D(monthly).times(months).plus(fees)
  return {
    installmentTotal: money(total),
    extraCost: money(total.minus(cashPrice)),
    monthsToSave: monthly > 0 ? Math.ceil(cashPrice / monthly) : 0,
  }
}

/* ------------------------------------------------------------------ */
/* Savings: "Kung inipon mo sana"                                       */
/* ------------------------------------------------------------------ */

export type Frequency = 'daily' | 'weekly' | 'monthly'
export const PER_YEAR: Record<Frequency, number> = { daily: 365, weekly: 52, monthly: 12 }

export interface SavingsResult {
  contributions: number
  growth: number
  futureValue: number
}

/**
 * Future value of equal contributions at the end of each period, with the
 * annual return converted to an equivalent per-period rate: (1 + r)^(1/k) − 1.
 * A 0% return is plain addition.
 */
export function futureValue(amount: number, frequency: Frequency, years: number, annualReturn: number): SavingsResult {
  const k = PER_YEAR[frequency]
  const n = Math.round(years * k)
  const pmt = new D(amount)
  const contributions = pmt.times(n)
  if (annualReturn === 0 || n === 0) return { contributions: money(contributions), growth: 0, futureValue: money(contributions) }
  const rp = new D(annualReturn).div(100).plus(1).pow(new D(1).div(k)).minus(1)
  const fv = pmt.times(rp.plus(1).pow(n).minus(1)).div(rp)
  return { contributions: money(contributions), growth: money(fv.minus(contributions)), futureValue: money(fv) }
}
