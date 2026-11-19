/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

/**
 * Expressway toll data. Fares are the Toll Regulatory Board (TRB) approved,
 * VAT-inclusive rates in whole pesos for an entry and exit plaza pair.
 */

export type VehicleClass = 1 | 2 | 3
export type Rfid = 'Easytrip' | 'Autosweep'

/**
 * How far a matrix has been checked:
 * - cross-checked: key fares match independent reports of the TRB approval
 * - single-source: one transcription of the TRB matrix, not yet cross-checked
 * - provisional: TRB approved the rates as provisional
 */
export type TollConfidence = 'cross-checked' | 'single-source' | 'provisional'

export interface TollPlaza {
  /** Unique within its expressway. */
  id: string
  name: string
  /** Places and landmarks people search for: "baguio", "subic", "nuvali". */
  keywords?: string[]
}

export interface Expressway {
  id: string
  name: string
  long: string
  operator: string
  rfid: Rfid
  /** ISO date the matrix took effect. */
  effective: string
  basis: string
  confidence: TollConfidence
  note?: string
  /** In road order. */
  plazas: TollPlaza[]
  /** fares[class][i][j]: toll from plazas[i] to plazas[j]; null when no fare is published for that pair. */
  fares: Record<'1' | '2' | '3', (number | null)[][]>
}

export interface PlazaRef {
  expressway: string
  plaza: string
}

/** Where two expressways meet: leave `a` at a.plaza, continue on `b` from b.plaza. */
export interface Connection {
  a: PlazaRef
  b: PlazaRef
  note: string
}

export interface TollCheck {
  expressway: string
  from: string
  to: string
  /** Class 1, 2, 3; null when the source did not give that class. */
  fares: (number | null)[]
  source: string
  url: string
}

export interface TollDataset {
  version: number
  compiledOn: string
  currency: 'PHP'
  basis: string
  provenance: string
  sources: { label: string; url: string }[]
  classes: { id: VehicleClass; label: string; description: string }[]
  expressways: Expressway[]
  connections: Connection[]
  checks: TollCheck[]
  notIncluded: { name: string; reason: string }[]
}
