import { z } from 'zod'

/**
 * Data contracts shared by the website and the ingestion scripts.
 *
 * Every external figure carries its provenance: where it came from, which
 * statistical period it describes (referenceDate) and when we fetched it
 * (retrievedAt). The two dates are never interchangeable.
 */

export const VerificationStatus = z.enum([
  /** Retrieved automatically from the primary source and validated. */
  'verified',
  /** Read from the primary source by a person (official page or PDF). */
  'verified-manual',
  /** Reported by reputable secondary sources; primary page not machine-readable. */
  'verified-secondary',
  /** Was verified once but is older than its freshness window. */
  'stale',
  /** Automated check found a mismatch; a human must confirm before publishing. */
  'needs-review',
])
export type VerificationStatus = z.infer<typeof VerificationStatus>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
const isoMonth = z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM')
const isoDateTime = z.string().datetime({ offset: true })

export const Provenance = z.object({
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: isoDateTime,
  status: VerificationStatus,
})
export type Provenance = z.infer<typeof Provenance>

/* ------------------------------------------------------------------ */
/* Inflation (PSA)                                                     */
/* ------------------------------------------------------------------ */

export const InflationSeriesKey = z.enum(['headline', 'core', 'food', 'transport'])
export type InflationSeriesKey = z.infer<typeof InflationSeriesKey>

export const MonthlyObservation = z.object({
  /** Statistical reference month, e.g. "2026-09". */
  period: isoMonth,
  /** Year-on-year change in percent. */
  value: z.number().min(-30).max(60),
})
export type MonthlyObservation = z.infer<typeof MonthlyObservation>

export const AnnualObservation = z.object({
  year: z.number().int().min(1990).max(2100),
  value: z.number().min(-30).max(60),
})
export type AnnualObservation = z.infer<typeof AnnualObservation>

export const InflationDataset = Provenance.extend({
  unit: z.literal('percent, year-on-year'),
  baseYear: z.literal(2018),
  /** Latest month that has a published value across all series. */
  latestPeriod: isoMonth,
  series: z.object({
    headline: z.array(MonthlyObservation).min(12),
    core: z.array(MonthlyObservation).min(12),
    food: z.array(MonthlyObservation).min(12),
    transport: z.array(MonthlyObservation).min(12),
  }),
  /** PSA-published annual averages ("Ave" column) of headline inflation. */
  annualHeadline: z.array(AnnualObservation).min(3),
  /** Purchasing power of the peso, 2018 = 1.00. */
  purchasingPower: z.array(z.object({ period: isoMonth, value: z.number().positive().max(2) })).min(12),
  tables: z.record(z.string(), z.string()),
  notes: z.array(z.string()),
})
export type InflationDataset = z.infer<typeof InflationDataset>

/* ------------------------------------------------------------------ */
/* Fuel price adjustments (DOE Oil Monitor)                            */
/* ------------------------------------------------------------------ */

export const FuelKey = z.enum(['gasoline', 'diesel', 'kerosene'])
export type FuelKey = z.infer<typeof FuelKey>

/**
 * DOE reports most weekly adjustments as a range across oil companies
 * ("Php 4.10/L to Php 4.70/L"). Both ends are signed: a decrease of
 * 0.24–0.50 is stored as { min: -0.5, max: -0.24 }.
 */
export const PesoRange = z
  .object({ min: z.number().min(-30).max(30), max: z.number().min(-30).max(30) })
  .refine((r) => r.min <= r.max, 'min must be <= max')
export type PesoRange = z.infer<typeof PesoRange>

export const FuelAdjustment = z.object({
  /** Date the adjustment took effect (the "As of" date of the Oil Monitor). */
  effectiveDate: isoDate,
  /** Signed change in pesos per liter. Positive = increase. */
  gasoline: PesoRange,
  diesel: PesoRange,
  kerosene: PesoRange,
  /** Year-to-date net change reported in the same Oil Monitor, if stated. */
  ytdNet: z
    .object({
      gasoline: z.number().min(-200).max(200),
      diesel: z.number().min(-200).max(200),
      kerosene: z.number().min(-200).max(200),
    })
    .nullable(),
  sourceUrl: z.string().url(),
})
export type FuelAdjustment = z.infer<typeof FuelAdjustment>

export const FuelDataset = Provenance.extend({
  unit: z.literal('PHP per liter'),
  coverage: z.string(),
  adjustments: z.array(FuelAdjustment).min(1),
  notes: z.array(z.string()),
})
export type FuelDataset = z.infer<typeof FuelDataset>

/* ------------------------------------------------------------------ */
/* Pag-IBIG MP2 dividend rates                                         */
/* ------------------------------------------------------------------ */

export const Mp2Rate = z.object({
  /** Calendar year the dividend applies to. */
  year: z.number().int().min(2010).max(2100),
  /** Declared annual dividend rate in percent. */
  rate: z.number().min(0).max(20),
  /** When Pag-IBIG announced it (usually Feb–Mar of the following year), if known. */
  declaredOn: isoDate.nullable(),
  sourceUrl: z.string().url(),
  status: VerificationStatus,
})
export type Mp2Rate = z.infer<typeof Mp2Rate>

export const Mp2Dataset = Provenance.extend({
  unit: z.literal('percent per annum'),
  rates: z.array(Mp2Rate).min(3),
  program: z.object({
    maturityYears: z.number().int().positive(),
    minimumRemittance: z.number().positive(),
    taxExempt: z.boolean(),
    earlyWithdrawalDividendForfeiturePct: z.number().min(0).max(100),
    notes: z.array(z.string()),
  }),
})
export type Mp2Dataset = z.infer<typeof Mp2Dataset>

/* ------------------------------------------------------------------ */
/* Bank savings products                                               */
/* ------------------------------------------------------------------ */

export const ProductKind = z.enum(['savings', 'goal-savings', 'time-deposit'])
export type ProductKind = z.infer<typeof ProductKind>

export const RateTier = z.object({
  /** Upper bound of the balance this tier covers (inclusive). null = no upper bound. */
  upTo: z.number().positive().nullable(),
  rate: z.number().min(0).max(30),
})
export type RateTier = z.infer<typeof RateTier>

export const Promo = z.object({
  name: z.string(),
  /** Maximum promotional rate, percent p.a. */
  rate: z.number().min(0).max(30),
  /** Balance cap for the promotional rate; the rest earns the base tiers. */
  cap: z.number().positive().nullable(),
  conditions: z.array(z.string()).min(1),
  startsOn: isoDate.nullable(),
  endsOn: isoDate.nullable(),
})
export type Promo = z.infer<typeof Promo>

export const BankProduct = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  bank: z.string(),
  product: z.string(),
  kind: ProductKind,
  /** Base (non-promotional) rate tiers. Marginal: each tier applies to the slice of balance in it. */
  baseTiers: z.array(RateTier).min(1),
  promo: Promo.nullable(),
  /** null = the bank does not state it; the calculator then assumes monthly crediting and says so. */
  crediting: z.enum(['daily', 'monthly', 'at-maturity']).nullable(),
  /** Day-count basis the bank discloses for interest computation. */
  dayCount: z.union([z.literal(360), z.literal(365)]).nullable(),
  /** Time deposits only: term in months. */
  termMonths: z.number().int().positive().nullable(),
  /** Bonus rate paid only if conditions are met (e.g. Tonik TD +1%). Not applied by default. */
  conditionalBonus: z.object({ rate: z.number(), condition: z.string() }).nullable(),
  withholdingTaxPct: z.number().min(0).max(100),
  liquidity: z.string(),
  notes: z.array(z.string()),
  sourceUrl: z.string().url(),
  /** Date stated on the bank's page/document for these terms, if any. */
  effectiveDate: isoDate.nullable(),
  /** Date a person last confirmed these terms against the official source. */
  verifiedOn: isoDate,
  status: VerificationStatus,
  /**
   * Exact text that must appear on the official source for the automated
   * check to consider the stored rate still current (e.g. "2.30% per annum").
   */
  evidence: z.string().min(3),
  /** Result of the latest automated check. Never changes the rate itself. */
  lastCheck: z
    .object({
      at: isoDateTime,
      result: z.enum(['match', 'mismatch', 'unreachable']),
      note: z.string(),
    })
    .nullable(),
})
export type BankProduct = z.infer<typeof BankProduct>

export const BankDataset = z.object({
  unit: z.literal('percent per annum, gross'),
  retrievedAt: isoDateTime,
  /** Days after verifiedOn when a product should be flagged as potentially outdated. */
  freshnessDays: z.number().int().positive(),
  products: z.array(BankProduct).min(1),
  excluded: z.array(z.object({ bank: z.string(), reason: z.string() })),
  tax: z.object({
    rule: z.string(),
    ratePct: z.number(),
    sourceUrl: z.string().url(),
    notes: z.array(z.string()),
  }),
})
export type BankDataset = z.infer<typeof BankDataset>
