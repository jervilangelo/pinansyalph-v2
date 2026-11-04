import { describe, expect, it } from 'vitest'
import { BankDataset, FuelDataset, InflationDataset, Mp2Dataset } from '../../types/data'
import inflation from '../inflation.json'
import fuel from '../fuel.json'
import mp2 from '../mp2.json'
import banks from '../banks.json'
import payroll from '../payroll.json'
import { PayrollRules } from '../../types/payroll'

describe('published datasets', () => {
  it('match their schemas', () => {
    expect(InflationDataset.safeParse(inflation).success).toBe(true)
    expect(FuelDataset.safeParse(fuel).success).toBe(true)
    expect(Mp2Dataset.safeParse(mp2).success).toBe(true)
    expect(BankDataset.safeParse(banks).success).toBe(true)
    expect(PayrollRules.safeParse(payroll).success).toBe(true)
  })

  it('keep the statistical period separate from the retrieval date', () => {
    expect(inflation.latestPeriod).toMatch(/^\d{4}-\d{2}$/)
    expect(inflation.retrievedAt).not.toContain(inflation.latestPeriod + '-01T')
  })

  it('never mark a promotional rate as the base rate', () => {
    for (const p of banks.products) {
      if (p.promo) expect(p.promo.rate).toBeGreaterThan(p.baseTiers[0].rate)
    }
  })

  it('record fuel weeks in order without duplicates', () => {
    const dates = fuel.adjustments.map((a) => a.effectiveDate)
    expect([...dates].sort()).toEqual(dates)
    expect(new Set(dates).size).toBe(dates.length)
  })
})
