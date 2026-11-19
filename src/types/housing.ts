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
 * Philippine housing prices from official publications only. Every figure
 * points to a source in `sources`; nothing is modelled or interpolated.
 */

export const AREA_IDS = ['philippines', 'ncr', 'aoncr', 'balance-gma', 'metro-cebu', 'metro-mindanao', 'other-areas'] as const
export const HousingArea = z.enum(AREA_IDS)
export const HousingType = z.enum(['all', 'condominium', 'house'])

export const Source = z.object({
  id: z.string(),
  organization: z.string(),
  title: z.string(),
  url: z.url(),
  category: z.enum(['median-price', 'price-index', 'loan-count', 'methodology', 'loan-rate']),
  coverage: z.string(),
  /** When the publication came out, as precisely as known (YYYY-MM or YYYY-MM-DD). */
  published: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  /** The period the figures describe, e.g. "Q2 2026". */
  period: z.string(),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: z.string(),
  reuse: z.string(),
  limitations: z.array(z.string()),
})

const pct = z.number().min(-100).max(500)

export const HousingDataset = z.object({
  version: z.literal(1),
  compiledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sources: z.array(Source).min(1),
  areas: z.array(z.object({ id: HousingArea, name: z.string(), coverage: z.string(), parent: HousingArea.nullable() })),
  /** Median price in pesos per area and housing type, for one quarter. */
  medians: z.object({
    period: z.string(),
    source: z.string(),
    values: z.array(z.object({ area: HousingArea, type: HousingType, pesos: z.number().int().positive() })),
  }),
  /** Number of bank housing loans granted in the quarter, per area and type: how many homes the medians describe. */
  loans: z.object({
    period: z.string(),
    source: z.string(),
    values: z.array(z.object({ area: HousingArea, type: z.enum(['condominium', 'house']), count: z.number().int().nonnegative() })),
  }),
  /** Percent change of the Residential Property Price Index. */
  growth: z.object({
    source: z.string(),
    yoyQuarters: z.array(z.string()),
    qoqQuarters: z.array(z.string()),
    series: z.array(z.object({ area: HousingArea, type: HousingType, yoy: z.array(pct), qoq: z.array(pct) })),
  }),
  loanRates: z.array(z.object({ id: z.string(), label: z.string(), annualRate: z.number().positive().max(30), note: z.string(), source: z.string() })),
  excluded: z.array(z.object({ name: z.string(), url: z.url().optional(), reason: z.string() })),
})

export type HousingArea = z.infer<typeof HousingArea>
export type HousingType = z.infer<typeof HousingType>
export type HousingDataset = z.infer<typeof HousingDataset>
export type HousingSource = z.infer<typeof Source>
