import { z } from 'zod'

/**
 * Electricity tariffs as published by a distribution utility, one schedule per
 * billing month. Every rate is copied from the utility's own monthly schedule;
 * nothing is averaged or estimated.
 */

const rate = z.number().finite()

export const Tier = z.object({
  /** Upper bound in kWh for the whole month's consumption; null for "and above". */
  upTo: z.number().int().positive().nullable(),
  rate,
})

export const OfficialBill = z.object({
  kwh: z.number().int().positive(),
  lifeline: z.boolean(),
  total: z.number(),
})

export const ResidentialSchedule = z.object({
  /** Billing month, YYYY-MM. */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  category: z.literal('residential'),
  sources: z.object({ schedule: z.url(), bills: z.url() }),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Per-kWh charges, PHP. Negative values are refunds or credits. */
  perKwh: z.object({
    generation: rate,
    transmission: rate,
    ancillary: rate,
    systemLoss: rate,
    supply: rate,
    metering: rate,
    regResetAdj: rate,
    lifelineRateAdj: rate,
    seniorSubsidy: rate,
    rpt: rate,
    rptAdj: rate,
    fitAll: rate,
    geaAll: rate,
    /** Paid by non-lifeline customers to fund the lifeline discount. */
    lifelineSubsidy: rate,
    /** The utility's average local franchise tax adjustment; varies by LGU. */
    lftAdj: rate,
  }),
  /** Refunds ordered by ERC, per kWh (negative), in the order they appear on the bill. */
  refunds: z.array(z.object({ label: z.string(), rate })),
  /** Universal charges per kWh, each billed (and rounded) on its own: missionary electrification, environmental, stranded debts. */
  universalCharges: z.array(z.object({ label: z.string(), rate })).min(1),
  /** Distribution charge: the whole month's kWh at the rate of the tier it falls in. */
  distribution: z.array(Tier).min(1),
  /** Fixed charges per customer per month. */
  fixed: z.object({ supplyCustomer: rate, meteringCustomer: rate }),
  /** Effective VAT rates published with the schedule. */
  vat: z.object({ generation: rate, transmission: rate, ancillary: rate, systemLoss: rate, others: rate }),
  /** Local franchise tax rate assumed by the utility's own sample bills; the real rate depends on the LGU. */
  lftRate: rate,
  /** Energy tax on residential consumption above a threshold, by block. */
  energyTax: z.array(Tier),
  /** Lifeline discount for registered qualified households, by consumption. */
  lifelineDiscounts: z.array(z.object({ upTo: z.number().int().positive(), share: z.number().min(0).max(1) })),
  /** The utility's own worked bills, used to check the calculation to the centavo. */
  officialBills: z.array(OfficialBill).min(1),
})

export const Provider = z.object({
  id: z.string(),
  name: z.string(),
  long: z.string(),
  area: z.string(),
  ratesPage: z.url(),
  schedules: z.array(ResidentialSchedule).min(1),
})

export const ElectricityDataset = z.object({
  version: z.literal(1),
  retrievedAt: z.string(),
  providers: z.array(Provider).min(1),
})

export type Tier = z.infer<typeof Tier>
export type ResidentialSchedule = z.infer<typeof ResidentialSchedule>
export type Provider = z.infer<typeof Provider>
export type ElectricityDataset = z.infer<typeof ElectricityDataset>
