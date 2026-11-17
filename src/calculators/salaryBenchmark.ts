import type { Benchmark, PayBasis, SalaryBenchmarkDataset, SurveyRound } from '../types/salary'
import { D, InputError } from './money'

/**
 * "Underpaid ba ko?" comparison engine.
 *
 * Compares what a visitor earns with a published PSA statistic, on the SAME
 * pay definition only. PSA's OWS "wage rate" is basic pay plus regular,
 * guaranteed cash allowances, before contributions and tax, so the visitor
 * gives basic pay and regular allowances separately and never take-home pay.
 *
 * It never invents a statistic: when the data has no figure for a
 * combination (occupation × region × industry), that candidate is skipped.
 */

/** Within ±5% of the benchmark counts as "near": survey averages are not precise to the peso. */
export const NEAR_BAND_PCT = 5
export const MAX_MONTHLY = 1_000_000

export type Band = 'below' | 'near' | 'above'

export interface PayComparison {
  user: number
  benchmark: number
  /** user − benchmark, in pesos. */
  difference: number
  /** ((user − benchmark) ÷ benchmark) × 100, rounded to 2 decimals. */
  percent: number
  band: Band
}

/** ((userSalary − benchmark) ÷ benchmark) × 100, with the ±NEAR_BAND_PCT band. */
export function comparePay(user: number, benchmark: number, nearBandPct = NEAR_BAND_PCT): PayComparison {
  if (!Number.isFinite(user) || user < 0) throw new InputError('Your pay must be a positive number.')
  if (!Number.isFinite(benchmark) || benchmark <= 0) throw new InputError('The benchmark must be a positive number.')
  const diff = new D(user).minus(benchmark)
  const exact = diff.div(benchmark).times(100)
  // The band uses the exact percentage; only the displayed figure is rounded.
  const band: Band = exact.abs().lte(nearBandPct) ? 'near' : exact.isNeg() ? 'below' : 'above'
  return { user, benchmark, difference: diff.toDecimalPlaces(2).toNumber(), percent: exact.toDecimalPlaces(2).toNumber(), band }
}

export interface PayInput {
  /** Basic monthly pay, before SSS, PhilHealth, Pag-IBIG and tax. */
  basic: number
  /** Regular, guaranteed monthly cash allowances (not reimbursements, overtime or bonuses). */
  allowances: number
}

export function validatePay(p: PayInput): void {
  if (!Number.isFinite(p.basic) || p.basic <= 0) throw new InputError('Enter your basic monthly pay.')
  if (p.basic > MAX_MONTHLY) throw new InputError('That is more than ₱1,000,000 a month. Check the amount.')
  if (!Number.isFinite(p.allowances) || p.allowances < 0) throw new InputError('Allowances cannot be negative.')
  if (p.allowances > MAX_MONTHLY) throw new InputError('Allowances look too large. Check the amount.')
}

/** The visitor's pay on a PSA definition. Net take-home pay is never one of them. */
export function userPayOn(basis: PayBasis, p: PayInput): number {
  if (basis === 'basic-pay') return p.basic
  if (basis === 'allowance') return p.allowances
  return new D(p.basic).plus(p.allowances).toNumber()
}

export type Scope = 'occupation-region' | 'occupation-industry' | 'occupation-national' | 'all-region' | 'all-industry' | 'all-national' | 'all-industry-median'

export interface Candidate {
  scope: Scope
  benchmark: Benchmark
  survey: SurveyRound
  /** Plain-language name of the comparison group. */
  group: string
  comparison: PayComparison
}

export interface Query {
  /** PSA benchmark occupation id, or null when the job has no PSA benchmark. */
  occupation: string | null
  /** Region id ("ph" = whole country). */
  region: string
  /** Major industry group id, or null if not chosen. */
  industry: string | null
  pay: PayInput
}

export interface Lookup {
  /** The comparison to lead with: occupation-specific when one exists. */
  primary: Candidate | null
  /** Other published figures that also apply, most specific first. */
  others: Candidate[]
  /** True when PSA has an occupation benchmark for the chosen job. */
  occupationCovered: boolean
}

function find(data: SalaryBenchmarkDataset, f: Partial<Benchmark>): Benchmark | undefined {
  // Latest survey round first, so a newer round always wins over an older one.
  const order = [...data.surveys].sort((a, b) => b.year - a.year).map((s) => s.id)
  return data.benchmarks
    .filter((b) => (Object.keys(f) as (keyof Benchmark)[]).every((k) => b[k] === f[k]))
    .sort((a, b) => order.indexOf(a.survey) - order.indexOf(b.survey))[0]
}

/** Every published PSA figure that applies to the query, most specific first. */
export function lookupBenchmarks(data: SalaryBenchmarkDataset, q: Query): Lookup {
  validatePay(q.pay)
  const occName = (id: string) => data.occupations.find((o) => o.id === id)?.psaLabel ?? id
  const regionName = (id: string) => data.regions.find((r) => r.id === id)?.short ?? id
  const industryName = (id: string) => data.industries.find((i) => i.id === id)?.name ?? id
  const survey = (id: string) => {
    const s = data.surveys.find((x) => x.id === id)
    if (!s) throw new Error(`Benchmark refers to unknown survey ${id}`)
    return s
  }

  const out: Candidate[] = []
  const add = (scope: Scope, b: Benchmark | undefined, group: string) => {
    if (!b) return
    out.push({ scope, benchmark: b, survey: survey(b.survey), group, comparison: comparePay(userPayOn(b.basis, q.pay), b.value) })
  }

  const occ = q.occupation
  const hasRegion = q.region !== 'ph'
  if (occ) {
    if (hasRegion) add('occupation-region', find(data, { occupation: occ, region: q.region, industry: 'all', measure: 'average', basis: 'wage-rate' }), `${occName(occ)} in ${regionName(q.region)}`)
    if (q.industry) add('occupation-industry', find(data, { occupation: occ, region: 'ph', industry: q.industry, measure: 'average', basis: 'wage-rate' }), `${occName(occ)} in ${industryName(q.industry)}`)
    add('occupation-national', find(data, { occupation: occ, region: 'ph', industry: 'all', measure: 'average', basis: 'wage-rate' }), `${occName(occ)}, whole country`)
  }
  if (hasRegion) add('all-region', find(data, { occupation: 'all-workers', region: q.region, industry: 'all', measure: 'average', basis: 'wage-rate' }), `All workers in ${regionName(q.region)}`)
  if (q.industry) add('all-industry', find(data, { occupation: 'all-workers', region: 'ph', industry: q.industry, measure: 'average', basis: 'wage-rate' }), `All workers in ${industryName(q.industry)}`)
  add('all-national', find(data, { occupation: 'all-workers', region: 'ph', industry: 'all', measure: 'average', basis: 'wage-rate' }), 'All workers, whole country')
  if (q.industry) add('all-industry-median', find(data, { occupation: 'all-workers', region: 'ph', industry: q.industry, measure: 'median', basis: 'basic-pay' }), `Median basic pay, ${industryName(q.industry)}`)

  const occupationCovered = out.some((c) => c.scope.startsWith('occupation'))
  const [primary = null, ...others] = out
  return { primary, others, occupationCovered }
}

/** Short Taglish reading of a comparison. Never a legal finding. */
export function verdict(c: PayComparison): { title: string; body: string } {
  if (c.band === 'near') return { title: 'Malapit ang sweldo mo sa benchmark.', body: 'Your pay is within 5% of the published average for this group.' }
  if (c.band === 'below') return { title: 'Mas mababa ang sweldo mo kaysa sa benchmark.', body: 'Your pay is below the published average for this group. That is a market comparison, not a finding that you are underpaid by law.' }
  return { title: 'Mas mataas ang sweldo mo kaysa sa benchmark.', body: 'Your pay is above the published average for this group.' }
}
