import { describe, expect, it } from 'vitest'
import dataJson from '../../data/salary-benchmarks.json'
import { JOB_TITLES, PSA_OCCUPATIONS, jobTitleById, searchJobTitles } from '../../data/salaryOccupations'
import { SalaryBenchmarkDataset } from '../../types/salary'
import { InputError } from '../money'
import { NEAR_BAND_PCT, comparePay, lookupBenchmarks, userPayOn, validatePay, verdict } from '../salaryBenchmark'

const data = SalaryBenchmarkDataset.parse(dataJson)
const pay = (basic: number, allowances = 0) => ({ basic, allowances })

describe('comparePay', () => {
  it('matches the worked example: ₱25,000 against a ₱30,000 average is ₱5,000 or 16.67% below', () => {
    const c = comparePay(25_000, 30_000)
    expect(c.difference).toBe(-5_000)
    expect(c.percent).toBe(-16.67)
    expect(c.band).toBe('below')
  })

  it('uses ((user − benchmark) ÷ benchmark) × 100', () => {
    expect(comparePay(33_000, 30_000).percent).toBe(10)
    expect(comparePay(19_721, 19_721).percent).toBe(0)
    expect(comparePay(1, 3).percent).toBe(-66.67)
  })

  it(`treats anything within ±${NEAR_BAND_PCT}% as near, and just outside as below or above`, () => {
    expect(comparePay(28_500, 30_000).band).toBe('near') // −5.00%
    expect(comparePay(31_500, 30_000).band).toBe('near') // +5.00%
    expect(comparePay(28_499, 30_000).band).toBe('below')
    expect(comparePay(31_502, 30_000).band).toBe('above')
  })

  it('is exact with centavos', () => {
    expect(comparePay(20_309.03, 21_543.65).difference).toBe(-1234.62)
  })

  it('rejects nonsense', () => {
    expect(() => comparePay(-1, 100)).toThrow(InputError)
    expect(() => comparePay(100, 0)).toThrow(InputError)
    expect(() => comparePay(Number.NaN, 100)).toThrow(InputError)
  })

  it('gives responsible wording and never a legal finding', () => {
    expect(verdict(comparePay(10_000, 20_000)).title).toMatch(/Mas mababa/)
    expect(verdict(comparePay(10_000, 20_000)).body).toMatch(/not a finding/)
    expect(verdict(comparePay(20_000, 20_000)).title).toMatch(/Malapit/)
    expect(verdict(comparePay(40_000, 20_000)).title).toMatch(/Mas mataas/)
  })
})

describe('pay definitions', () => {
  it('compares the wage rate as basic pay plus regular allowances, never take-home pay', () => {
    expect(userPayOn('wage-rate', pay(18_000, 1_500))).toBe(19_500)
    expect(userPayOn('basic-pay', pay(18_000, 1_500))).toBe(18_000)
    expect(userPayOn('allowance', pay(18_000, 1_500))).toBe(1_500)
  })

  it('validates the pay inputs', () => {
    expect(() => validatePay(pay(0))).toThrow(/basic monthly pay/)
    expect(() => validatePay(pay(20_000, -1))).toThrow(/negative/)
    expect(() => validatePay(pay(2_000_000))).toThrow(/₱1,000,000/)
    expect(() => validatePay(pay(20_000, 0))).not.toThrow()
  })

  it('compares the median only on basic pay, its published definition', () => {
    const l = lookupBenchmarks(data, { occupation: null, region: 'ph', industry: 'manufacturing', pay: pay(15_000, 5_000) })
    const median = [l.primary, ...l.others].find((c) => c?.scope === 'all-industry-median')!
    expect(median.benchmark.basis).toBe('basic-pay')
    expect(median.comparison.user).toBe(15_000)
  })
})

describe('lookupBenchmarks', () => {
  it('leads with the occupation in the chosen region (2024 OWS) when PSA publishes it', () => {
    const l = lookupBenchmarks(data, { occupation: 'general-office-clerks', region: 'ncr', industry: null, pay: pay(20_000) })
    expect(l.occupationCovered).toBe(true)
    expect(l.primary?.scope).toBe('occupation-region')
    expect(l.primary?.benchmark.region).toBe('ncr')
    expect(l.primary?.survey.referencePeriod).toBe('August 2024')
  })

  it('reproduces PSA headline figures exactly', () => {
    const elem = lookupBenchmarks(data, { occupation: 'elementary-occupations', region: 'ph', industry: null, pay: pay(13_000) })
    expect(elem.primary?.benchmark.value).toBe(13_506)
    const clerks = lookupBenchmarks(data, { occupation: 'general-office-clerks', region: 'ph', industry: null, pay: pay(13_000) })
    expect(clerks.primary?.benchmark.value).toBe(19_721)
    const ncr = lookupBenchmarks(data, { occupation: 'elementary-occupations', region: 'ncr', industry: null, pay: pay(13_000) })
    expect(ncr.primary?.benchmark.value).toBe(15_991)
    const barmm = lookupBenchmarks(data, { occupation: 'elementary-occupations', region: 'barmm', industry: null, pay: pay(13_000) })
    expect(barmm.primary?.benchmark.value).toBe(9_770)
  })

  it('adds the industry figure for the occupation as a second comparison', () => {
    const l = lookupBenchmarks(data, { occupation: 'general-office-clerks', region: 'calabarzon', industry: 'manufacturing', pay: pay(20_000) })
    expect(l.primary?.scope).toBe('occupation-region')
    expect(l.others.map((c) => c.scope)).toContain('occupation-industry')
  })

  it('never builds an occupation × region × industry figure PSA did not publish', () => {
    const l = lookupBenchmarks(data, { occupation: 'general-office-clerks', region: 'calabarzon', industry: 'manufacturing', pay: pay(20_000) })
    for (const c of [l.primary!, ...l.others]) {
      expect(c.benchmark.region === 'ph' || c.benchmark.industry === 'all').toBe(true)
    }
  })

  it('falls back to the national figure when only 2022 data exists for the occupation', () => {
    const l = lookupBenchmarks(data, { occupation: 'accounting-bookkeeping-clerks', region: 'ncr', industry: null, pay: pay(20_000) })
    expect(l.primary?.scope).toBe('occupation-national')
    expect(l.primary?.survey.year).toBe(2022)
  })

  it('without an occupation benchmark, says so and offers the all-worker figures', () => {
    const l = lookupBenchmarks(data, { occupation: null, region: 'davao', industry: 'information-communications', pay: pay(25_000) })
    expect(l.occupationCovered).toBe(false)
    expect(l.primary?.scope).toBe('all-region')
    expect(l.others.map((c) => c.scope)).toEqual(['all-industry', 'all-national', 'all-industry-median'])
  })

  it('skips combinations with no published figure instead of inventing one', () => {
    // The 2022 median series has no "Human health … except public health" major group.
    const l = lookupBenchmarks(data, { occupation: null, region: 'ph', industry: 'human-health-social-work-activities', pay: pay(25_000) })
    expect([l.primary!, ...l.others].some((c) => c.scope === 'all-industry-median')).toBe(false)
  })

  it('rejects invalid pay before looking anything up', () => {
    expect(() => lookupBenchmarks(data, { occupation: null, region: 'ph', industry: null, pay: pay(0) })).toThrow(InputError)
  })
})

describe('job titles', () => {
  it('finds common titles and aliases', () => {
    expect(searchJobTitles('bookkeeper')[0].id).toBe('bookkeeper')
    expect(searchJobTitles('csr')[0].id).toBe('csr')
    expect(searchJobTitles('call center').map((t) => t.id)).toContain('csr')
    expect(searchJobTitles('IT Support')[0].id).toBe('it-support')
    expect(searchJobTitles('janitress')[0].id).toBe('janitor')
    expect(searchJobTitles('')).toEqual([])
    expect(searchJobTitles('astronaut')).toEqual([])
  })

  it('does not treat an Accountant as an accounting clerk', () => {
    const accountant = jobTitleById('accountant')!
    expect(accountant.benchmark).toBeNull()
    expect(accountant.related).toBe('accounting-bookkeeping-clerks')
  })

  it('lists titles PSA does not cover with no benchmark', () => {
    for (const id of ['it-support', 'hr-specialist', 'csr', 'software-developer']) expect(jobTitleById(id)!.benchmark).toBeNull()
  })

  it('only maps to occupations the dataset actually has', () => {
    const inData = new Set(data.occupations.map((o) => o.id))
    for (const t of JOB_TITLES) {
      if (t.benchmark) expect(inData.has(t.benchmark), t.id).toBe(true)
      if (t.related) expect(inData.has(t.related), t.id).toBe(true)
    }
    for (const id of Object.keys(PSA_OCCUPATIONS)) expect(inData.has(id), id).toBe(true)
  })

  it('suggests only industries that exist', () => {
    const ids = new Set(data.industries.map((i) => i.id))
    for (const t of JOB_TITLES) if (t.typicalIndustry) expect(ids.has(t.typicalIndustry), t.id).toBe(true)
  })

  it('has unique ids', () => {
    expect(new Set(JOB_TITLES.map((t) => t.id)).size).toBe(JOB_TITLES.length)
  })
})

describe('salary dataset', () => {
  it('validates against its schema', () => {
    expect(SalaryBenchmarkDataset.safeParse(dataJson).success).toBe(true)
  })

  it('has one figure per occupation, survey, place, industry, measure and basis', () => {
    const keys = data.benchmarks.map((b) => [b.occupation, b.survey, b.region, b.industry, b.measure, b.basis].join('|'))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('references only known regions, industries, surveys and tables', () => {
    const regions = new Set(data.regions.map((r) => r.id))
    const industries = new Set([...data.industries.map((i) => i.id), 'all'])
    const surveys = new Set(data.surveys.map((s) => s.id))
    const tables = new Set(data.tables.map((t) => t.id))
    for (const b of data.benchmarks) {
      expect(regions.has(b.region), b.region).toBe(true)
      expect(industries.has(b.industry), b.industry).toBe(true)
      expect(surveys.has(b.survey), b.survey).toBe(true)
      expect(tables.has(b.table), b.table).toBe(true)
    }
  })

  it('keeps the arithmetic PSA publishes: wage rate = basic pay + allowance (within PSA’s ₱1 display rounding)', () => {
    for (const r of data.regions) {
      const get = (basis: string) => data.benchmarks.find((b) => b.occupation === 'all-workers' && b.survey === 'ows-2024' && b.region === r.id && b.industry === 'all' && b.basis === basis)!.value
      expect(Math.abs(get('basic-pay') + get('allowance') - get('wage-rate')), r.id).toBeLessThanOrEqual(1)
    }
  })

  it('publishes no sample sizes or percentiles that PSA did not', () => {
    expect(data.benchmarks.every((b) => b.sampleSize === null)).toBe(true)
    expect(data.benchmarks.every((b) => b.measure === 'average' || b.measure === 'median')).toBe(true)
  })

  it('covers every region for both 2024 benchmark occupations', () => {
    for (const occ of ['general-office-clerks', 'elementary-occupations']) {
      const regions = new Set(data.benchmarks.filter((b) => b.occupation === occ && b.industry === 'all').map((b) => b.region))
      expect(regions.size, occ).toBe(18)
    }
  })
})
