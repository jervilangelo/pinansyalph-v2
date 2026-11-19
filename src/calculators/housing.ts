/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import type { HousingArea, HousingDataset, HousingType } from '../types/housing'
import { D, type Dec, InputError, centavos } from './money'

/**
 * "Magkano Bahay Ngayon?" Lookups on BSP's published housing figures and a
 * standard loan amortization. Nothing here estimates a price: a figure is
 * either published for the area and type, or reported as unavailable.
 */

export interface MedianFigure {
  area: HousingArea
  type: HousingType
  pesos: number
  period: string
  source: string
  /** Bank housing loans granted in the quarter for this area and type (both types added for "all"). */
  loans: number | null
}

export function medianFor(data: HousingDataset, area: HousingArea, type: HousingType): MedianFigure | null {
  const v = data.medians.values.find((m) => m.area === area && m.type === type)
  if (!v) return null
  const count = (t: 'condominium' | 'house') => data.loans.values.find((l) => l.area === area && l.type === t)?.count
  const c = count('condominium')
  const h = count('house')
  const loans = type === 'all' ? (c != null && h != null ? c + h : null) : (count(type) ?? null)
  return { area, type, pesos: v.pesos, period: data.medians.period, source: data.medians.source, loans }
}

/** Price movement for an area and type; sub-areas only publish the all-types series. */
export function growthFor(data: HousingDataset, area: HousingArea, type: HousingType) {
  return data.growth.series.find((s) => s.area === area && s.type === type) ?? null
}

export interface PriceComparison {
  difference: Dec
  /** (asking − median) ÷ median × 100, to one decimal. */
  percent: number
}

export function compareToMedian(asking: number, median: number): PriceComparison {
  if (!Number.isFinite(asking) || asking <= 0) throw new InputError('Enter the asking price.')
  if (asking > 10_000_000_000) throw new InputError('That price looks too large. Check the amount.')
  if (!(median > 0)) throw new InputError('No median to compare with.')
  const difference = new D(asking).minus(median)
  return { difference, percent: difference.div(median).times(100).toDecimalPlaces(1).toNumber() }
}

// ── Loan amortization ───────────────────────────────────────────────────

export interface LoanInput {
  price: number
  /** Down payment as a percent of the price. */
  downPercent: number
  years: number
  /** Annual interest rate, percent. */
  annualRate: number
  grossMonthly: number
  takeHomeMonthly: number
  otherDebts: number
  /** Other upfront costs the buyer expects (fees, taxes, move-in), entered by the user. */
  otherUpfront: number
}

export interface LoanResult {
  downPayment: Dec
  principal: Dec
  monthly: Dec
  months: number
  totalPayments: Dec
  totalInterest: Dec
  /** Amortization ÷ gross monthly income, percent; null without income. */
  paymentToIncome: number | null
  /** (Amortization + other debts) ÷ gross monthly income, percent. */
  debtToIncome: number | null
  /** Take-home pay − amortization − other debts. */
  remaining: Dec | null
  upfront: Dec
}

/**
 * Fixed-rate amortization: M = P × r ÷ (1 − (1 + r)^−n), r = annual rate ÷ 12,
 * n = years × 12; with a 0% rate, M = P ÷ n. Real loans reprice when the fixing
 * period ends, so this is the payment while the entered rate holds.
 */
export function monthlyAmortization(principal: number, annualRate: number, years: number): Dec {
  if (!Number.isFinite(principal) || principal < 0) throw new InputError('The loan amount cannot be negative.')
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 30) throw new InputError('Interest rate should be from 0% to 30% a year.')
  if (!Number.isInteger(years) || years < 1 || years > 30) throw new InputError('Loan term should be a whole number of years from 1 to 30.')
  const n = years * 12
  const P = new D(principal)
  if (annualRate === 0) return centavos(P.div(n))
  const r = new D(annualRate).div(100).div(12)
  return centavos(P.times(r).div(new D(1).minus(r.plus(1).pow(-n))))
}

export function loanAffordability(x: LoanInput): LoanResult {
  if (!Number.isFinite(x.price) || x.price <= 0) throw new InputError('Enter the property price.')
  if (x.price > 1_000_000_000) throw new InputError('That price looks too large. Check the amount.')
  if (!Number.isFinite(x.downPercent) || x.downPercent < 0 || x.downPercent > 100) throw new InputError('Down payment should be from 0% to 100%.')
  for (const [v, name] of [
    [x.grossMonthly, 'Gross income'],
    [x.takeHomeMonthly, 'Take-home pay'],
    [x.otherDebts, 'Other debt payments'],
    [x.otherUpfront, 'Other upfront costs'],
  ] as const)
    if (!Number.isFinite(v) || v < 0) throw new InputError(`${name} cannot be negative.`)
  const downPayment = centavos(new D(x.price).times(x.downPercent).div(100))
  const principal = new D(x.price).minus(downPayment)
  const monthly = monthlyAmortization(principal.toNumber(), x.annualRate, x.years)
  const months = x.years * 12
  const totalPayments = monthly.times(months)
  const ratio = (v: Dec) => (x.grossMonthly > 0 ? v.div(x.grossMonthly).times(100).toDecimalPlaces(1).toNumber() : null)
  return {
    downPayment,
    principal,
    monthly,
    months,
    totalPayments,
    totalInterest: principal.isZero() ? new D(0) : totalPayments.minus(principal),
    paymentToIncome: ratio(monthly),
    debtToIncome: ratio(monthly.plus(x.otherDebts)),
    remaining: x.takeHomeMonthly > 0 ? new D(x.takeHomeMonthly).minus(monthly).minus(x.otherDebts) : null,
    upfront: downPayment.plus(x.otherUpfront),
  }
}
