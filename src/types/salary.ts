/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { z } from 'zod'

/**
 * Data contracts for "Underpaid ba ko?".
 *
 * Every figure is a published PSA statistic, stored as OpenSTAT publishes it
 * (rounded to whole pesos, so basic pay + allowance can differ from the wage
 * rate by ₱1). Nothing is derived: no percentiles from averages,
 * no sample sizes that PSA did not publish, no regional figure guessed from
 * a national one. A missing statistic stays missing (the benchmark simply
 * does not exist in the file).
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
const isoDateTime = z.string().datetime({ offset: true })
const slug = z.string().regex(/^[a-z0-9-]+$/, 'expected a lowercase slug')

/**
 * What a peso figure measures, in PSA's own definitions (OWS technical notes):
 * - basic-pay: pay for normal working time before SSS/PhilHealth/Pag-IBIG and
 *   tax; excludes overtime, night differential, premium pay, commissions, tips.
 * - allowance: regular, guaranteed cash allowances; excludes reimbursements,
 *   uniforms, bonuses, family allowances.
 * - wage-rate: basic pay + regular allowances.
 */
export const PayBasis = z.enum(['basic-pay', 'allowance', 'wage-rate'])
export type PayBasis = z.infer<typeof PayBasis>

export const Measure = z.enum(['average', 'median'])
export type Measure = z.infer<typeof Measure>

export const SurveyRound = z.object({
  id: slug,
  label: z.string().min(1),
  /** The month or year the wages describe, as PSA states it. */
  referencePeriod: z.string().min(4),
  year: z.number().int().min(2000).max(2100),
  /** Who the survey covers. Rounds with different coverage are not comparable. */
  coverage: z.string().min(1),
  notes: z.array(z.string()),
})
export type SurveyRound = z.infer<typeof SurveyRound>

export const SourceTable = z.object({
  /** OpenSTAT table id, e.g. "0021B3E2002". */
  id: z.string().min(1),
  title: z.string().min(1),
  /** Where a person finds it: OpenSTAT folder path. */
  path: z.string().min(1),
  /** Machine-readable endpoint the data was retrieved from. */
  apiUrl: z.string().url(),
  /** PSA's own "last updated" stamp for the table. */
  updated: isoDate,
  survey: slug,
})
export type SourceTable = z.infer<typeof SourceTable>

export const Region = z.object({ id: slug, name: z.string(), short: z.string() })
export const Industry = z.object({ id: slug, name: z.string() })

export const Benchmark = z.object({
  /** "all-workers" or a PSA benchmark occupation id. */
  occupation: slug,
  survey: slug,
  table: z.string().min(1),
  /** "ph" for the national figure. */
  region: slug,
  /** "all" when the figure is not broken down by industry. */
  industry: slug,
  measure: Measure,
  basis: PayBasis,
  /** Monthly pesos, as published by OpenSTAT (whole pesos). */
  value: z.number().positive().max(1_000_000),
  /** PSA does not publish sample sizes in these tables; kept for future sources. */
  sampleSize: z.number().int().positive().nullable(),
})
export type Benchmark = z.infer<typeof Benchmark>

export const SalaryBenchmarkDataset = z.object({
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: isoDateTime,
  status: z.enum(['verified', 'verified-manual', 'stale', 'needs-review']),
  /** Workers the statistics describe. */
  population: z.string().min(1),
  definitions: z.object({ basicPay: z.string(), allowance: z.string(), wageRate: z.string(), median: z.string() }),
  surveys: z.array(SurveyRound).min(1),
  tables: z.array(SourceTable).min(1),
  regions: z.array(Region).min(2),
  industries: z.array(Industry).min(2),
  /** PSA benchmark occupations present in the data, with PSA's label. */
  occupations: z.array(z.object({ id: slug, psaLabel: z.string() })).min(1),
  benchmarks: z.array(Benchmark).min(10),
})
export type SalaryBenchmarkDataset = z.infer<typeof SalaryBenchmarkDataset>

/* ------------------------------------------------------------------ */
/* Future: community-reported salaries (not collected yet)            */
/* ------------------------------------------------------------------ */

/**
 * Shape reserved for anonymous, community-reported salaries. Nothing collects
 * these today (see docs/COMMUNITY-SALARY-DATA.md). If ever added, they live in
 * a separate dataset with source "community" and are never merged into, or
 * averaged with, PSA benchmarks. Only aggregates with a minimum group size
 * would be published; individual submissions never would.
 */
export const CommunitySubmission = z.object({
  source: z.literal('community'),
  occupation: z.string().min(2).max(80),
  industry: slug.nullable(),
  region: slug,
  experience: z.enum(['entry', 'mid', 'senior']),
  arrangement: z.enum(['onsite', 'hybrid', 'remote']),
  basis: PayBasis,
  monthlyAmount: z.number().positive().max(1_000_000),
  /** Month the pay applies to, YYYY-MM. */
  period: z.string().regex(/^\d{4}-\d{2}$/),
})
export type CommunitySubmission = z.infer<typeof CommunitySubmission>
