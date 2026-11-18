import { residentialBill } from '../calculators/electricity'
import type { ElectricityDataset } from '../types/electricity'
import electricityJson from './electricity.json'

/**
 * Indicative residential rates per kWh, for estimating appliance costs.
 * An indicative rate is never the visitor's exact rate: bills vary with
 * consumption, lifeline discounts, local taxes and the billing month.
 * Commercial and industrial rates are not included.
 */
export interface IndicativeRate {
  id: string
  utility: string
  area: string
  /** ₱ per kWh, all charges included, for a typical home. */
  perKwh: number
  /** How the figure was obtained. */
  basis: string
  billingPeriod: string
  verifiedOn: string
  sourceUrl: string
}

const meralco = (electricityJson as ElectricityDataset).providers.find((p) => p.id === 'meralco')!.schedules[0]
const TYPICAL_KWH = 200
const meralcoRate = residentialBill(meralco, TYPICAL_KWH).perKwh.toDecimalPlaces(2).toNumber()
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export const INDICATIVE_RATES: IndicativeRate[] = [
  {
    id: 'meralco',
    utility: 'Meralco',
    area: 'Metro Manila and nearby provinces',
    perKwh: meralcoRate,
    basis: `Total residential bill for ${TYPICAL_KWH} kWh ÷ ${TYPICAL_KWH}, computed from Meralco’s published rate schedule (the same one the Kuryente bill checker uses).`,
    billingPeriod: `${monthName(meralco.month)} billing`,
    verifiedOn: meralco.verifiedOn,
    sourceUrl: meralco.sources.schedule,
  },
  {
    id: 'veco',
    utility: 'Visayan Electric',
    area: 'Metro Cebu',
    perKwh: 14.89,
    basis: 'Overall residential rate for a home using 200 kWh a month, as announced by Visayan Electric.',
    billingPeriod: 'September 2026 billing',
    verifiedOn: '2026-11-18',
    sourceUrl: 'https://www.visayanelectric.com/post/visayan-electric-announces-rate-reduction-for-september-welcomes-rate-intervention-measures-from-th',
  },
]

/** Utilities looked for but without a recent published rate we could verify. */
export const RATES_NOT_INCLUDED = 'Davao Light and other utilities: no 2026 residential rate could be confirmed on their official pages. Use the rate on your own bill.'
