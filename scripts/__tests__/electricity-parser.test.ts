import { describe, expect, it } from 'vitest'
import { headerCols, parseUniversalCharges, parseVat, toleranceFor } from '../update-electricity-rates.ts'

const HEADER_OCT = 'Consumption Charge Charge Charge Charge Charge Charge Charge Charge Cust Charge (Refund)/Collect 1 (Refund)/Collect 2 Fees Adj Adjustment Subsidy Charge Adj. Charge Adj. VAT Tax Charge (Renewable) (Renewable) Discount Subsidy Bill'
const HEADER_NOV = 'Consumption Charge Charge Charge Charge Charge Charge Charge Charge Cust Charge (Refund)/Collect 1 (Refund)/Collect 2 (Refund)/Collect 3 Fees Adj Subsidy Charge Adj. Charge Adj. VAT Tax Charge (Renewable) (Renewable) Discount Subsidy Bill'

describe('Meralco bills table columns', () => {
  it('reads the number of refunds and the lifeline rate adjustment from the header', () => {
    const oct = headerCols(HEADER_OCT)
    expect(oct.filter((c) => c.startsWith('refund'))).toHaveLength(2)
    expect(oct).toContain('lifelineRateAdj')
    const nov = headerCols(HEADER_NOV)
    expect(nov.filter((c) => c.startsWith('refund'))).toHaveLength(3)
    expect(nov).not.toContain('lifelineRateAdj')
    expect(nov.at(-1)).toBe('total')
  })
  it('refuses text that is not a bills table', () => {
    expect(() => headerCols('hello')).toThrow(/header/)
  })
})

describe('schedule details', () => {
  it('reads VAT rates; system loss is zero when not listed', () => {
    const v = parseVat('Generation 8.33%\nTransmission 11.99%\nAncillary Service 9.09%\nOther Charges 12.00%')
    expect(v).toEqual({ generation: 0.0833, transmission: 0.1199, ancillary: 0.0909, systemLoss: 0, others: 0.12 })
    expect(() => parseVat('nothing here')).toThrow(/VAT/)
  })
  it('finds the four universal charges that add up to the total and precede FIT-All', () => {
    const uc = parseUniversalCharges('Residential 10.2005 0.0067 0.0015 0.3296 0.0101 0.0025 0.0428 0.3359 0.0000', 0.385, 0.3359)
    expect(uc.map((u) => u.rate)).toEqual([0.3296, 0.0101, 0.0025, 0.0428])
    expect(() => parseUniversalCharges('0.1 0.2', 0.385, 0.3359)).toThrow(/not found/)
  })
  it('allows a few centavos on very large bills only', () => {
    expect(toleranceFor(3110.19)).toBeCloseTo(0.0511, 4)
    expect(toleranceFor(84806.77)).toBeLessThan(0.9)
  })
})
