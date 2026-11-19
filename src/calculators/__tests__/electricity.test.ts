/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import electricityJson from '../../data/electricity.json'
import { ElectricityDataset } from '../../types/electricity'
import { APPLIANCE_PRESETS, applianceKwh, estimateAppliances, kwhSaved, type Appliance } from '../appliances'
import { checkBill, compareBills, explanations, kwhFromReadings, residentialBill, tierFor } from '../electricity'
import { D, InputError } from '../money'

const data = ElectricityDataset.parse(electricityJson)
const meralco = data.providers.find((p) => p.id === 'meralco')!
const month = (m: string) => meralco.schedules.find((s) => s.month === m)!
const NOV = month('2026-11')
const OCT = month('2026-10')
const bill = (s = NOV, kwh = 200, lifeline = false) => residentialBill(s, kwh, { lifeline }).total.toNumber()

describe('Meralco residential bill, against Meralco’s own worked bills', () => {
  it('November 2026, 200 kWh: ₱3,110.19, the ₱15.5510/kWh Meralco announced', () => {
    const r = residentialBill(NOV, 200)
    expect(r.total.toFixed(2)).toBe('3110.19')
    expect(r.perKwh.toFixed(4)).toBe('15.5510')
  })

  it('October 2026, 200 kWh: ₱3,012.30 (₱15.0615/kWh)', () => {
    expect(bill(OCT)).toBe(3012.3)
  })

  it('reproduces every published worked bill: within 2 centavos up to 400 kWh, a few centavos above', () => {
    let exact = 0
    let total = 0
    for (const s of meralco.schedules)
      for (const b of s.officialBills) {
        const got = bill(s, b.kwh, b.lifeline)
        const diff = Math.abs(got - b.total)
        total++
        if (diff < 0.005) exact++
        if (b.kwh <= 400) expect(diff, `${s.month} ${b.kwh} kWh ${b.lifeline ? 'lifeline' : ''}`).toBeLessThan(0.025)
        else expect(diff, `${s.month} ${b.kwh} kWh`).toBeLessThanOrEqual(0.02 + b.total * 0.00001)
      }
    expect(total).toBe(meralco.schedules.length * 18)
    // About half match to the exact centavo; the rest differ by VAT rounding (Meralco publishes rounded VAT rates).
    expect(exact / total).toBeGreaterThan(0.5)
  })

  it('applies the lifeline discount to registered households: 100% to 50 kWh, 35% to 70, 20% to 100', () => {
    expect(bill(NOV, 50, true)).toBe(0)
    expect(bill(NOV, 70, true)).toBe(718.05)
    expect(bill(NOV, 100, true)).toBe(1253.62)
    // Above 100 kWh there is no lifeline discount, even if asked.
    expect(bill(NOV, 101, true)).toBe(bill(NOV, 101, false))
  })

  it('charges the whole month’s kWh at its distribution tier', () => {
    expect(tierFor(NOV.distribution, 200).rate).toBe(1.0404)
    expect(tierFor(NOV.distribution, 201).rate).toBe(1.3532)
    expect(tierFor(NOV.distribution, 401).rate).toBe(2.1627)
    const at201 = residentialBill(NOV, 201).lines.find((l) => l.key === 'distribution')!
    expect(at201.amount.toNumber()).toBe(271.99) // 201 × ₱1.3532
  })

  it('adds energy tax only above 650 kWh', () => {
    const tax = (kwh: number) => residentialBill(NOV, kwh).lines.find((l) => l.key === 'energyTax')?.amount.toNumber() ?? 0
    expect(tax(650)).toBe(0)
    expect(tax(700)).toBe(5)
    expect(tax(1500)).toBe(135)
    expect(tax(3000)).toBe(660)
  })

  it('groups lines like the bill and the groups add up to the total', () => {
    const r = residentialBill(NOV, 350)
    expect(r.groups.reduce((s, g) => s.plus(g.amount), new D(0)).toFixed(2)).toBe(r.total.toFixed(2))
    expect(r.groups[0].group).toBe('generation')
  })

  it('a higher local franchise tax raises the bill slightly', () => {
    expect(residentialBill(NOV, 200, { lftRate: 0.0075 }).total.gt(residentialBill(NOV, 200).total)).toBe(true)
  })

  it('rejects impossible consumption', () => {
    expect(() => residentialBill(NOV, 0)).toThrow(InputError)
    expect(() => residentialBill(NOV, 12.5)).toThrow(/whole/)
  })
})

describe('meter readings', () => {
  it('is present minus previous reading, times the multiplier', () => {
    expect(kwhFromReadings(12_345, 12_545)).toBe(200)
    expect(kwhFromReadings(1000.4, 1005.4, 40)).toBe(200)
  })
  it('explains a lower present reading instead of guessing a rollover', () => {
    expect(() => kwhFromReadings(9_990, 30)).toThrow(/lower/)
    expect(() => kwhFromReadings(100, 100)).toThrow(/same/)
    expect(() => kwhFromReadings(100, 200, 0)).toThrow(/Multiplier/)
  })
})

describe('bill check', () => {
  it('matches when the bill equals the published rates', () => {
    const c = checkBill(NOV, 200, 3110.19)
    expect(c.band).toBe('match')
    expect(c.difference.toNumber()).toBe(0)
    expect(explanations(c)[0]).toMatch(/matches/)
  })

  it('treats a different city franchise tax as a match, not an error', () => {
    const c = checkBill(NOV, 200, residentialBill(NOV, 200, { lftRate: 0.0075 }).total.toNumber())
    expect(c.band).toBe('match')
  })

  it('flags a higher bill with ordinary explanations first, never a verdict', () => {
    const c = checkBill(NOV, 200, 3610.19)
    expect(c.band).toBe('higher')
    expect(c.difference.toNumber()).toBe(500)
    expect(c.percent).toBeCloseTo(16.08, 2)
    const why = explanations(c, { days: 36 }).join(' ')
    expect(why).toMatch(/unpaid balance/)
    expect(why).toMatch(/36 days/)
    expect(why).not.toMatch(/overcharg|wrong|incorrect/i)
  })

  it('calls a small difference close', () => {
    expect(checkBill(NOV, 200, 3110.19 + 60).band).toBe('close')
  })
})

describe('compare two bills', () => {
  it('splits the change into usage and rate, adding up exactly', () => {
    const c = compareBills({ kwh: 200, amount: 3012.3 }, { kwh: 250, amount: 3900 })
    expect(c.kwhChange).toBe(50)
    expect(c.amountChange.toNumber()).toBeCloseTo(887.7, 2)
    expect(c.fromUsage.toNumber()).toBe(753.08) // 50 kWh × ₱15.0615
    expect(c.fromUsage.plus(c.fromRate).toFixed(2)).toBe(c.amountChange.toFixed(2))
  })
  it('shows a pure rate change when kWh is unchanged', () => {
    const c = compareBills({ kwh: 200, amount: 3012.3 }, { kwh: 200, amount: 3110.19 })
    expect(c.fromUsage.toNumber()).toBe(0)
    expect(c.fromRate.toNumber()).toBeCloseTo(97.89, 2)
  })
  it('validates', () => {
    expect(() => compareBills({ kwh: 0, amount: 1 }, { kwh: 1, amount: 1 })).toThrow(/kWh/)
  })
})

describe('appliances', () => {
  const a = (patch: Partial<Appliance>): Appliance => ({ id: 'x', name: 'Test', watts: 1000, quantity: 1, hoursPerDay: 2, daysPerMonth: 30, runningShare: 1, ...patch })

  it('is watts × quantity × hours × days × running share ÷ 1,000', () => {
    expect(applianceKwh(a({})).toNumber()).toBe(60)
    expect(applianceKwh(a({ quantity: 2, runningShare: 0.5 })).toNumber()).toBe(60)
  })

  it('splits the cost at the average rate and the shares add up', () => {
    const r = estimateAppliances([a({ id: '1' }), a({ id: '2', watts: 500 })], new D('15.5510'))
    expect(r.totalKwh.toNumber()).toBe(90)
    expect(r.items[0].cost.toNumber()).toBe(933.06)
    expect(r.items[0].share + r.items[1].share).toBeCloseTo(1, 10)
  })

  it('presets are editable estimates within sane ranges', () => {
    for (const p of APPLIANCE_PRESETS) {
      expect(p.runningShare).toBeGreaterThan(0)
      expect(p.runningShare).toBeLessThanOrEqual(1)
      expect(applianceKwh({ id: p.key, name: p.name, watts: p.watts, quantity: 1, hoursPerDay: p.hoursPerDay, daysPerMonth: p.daysPerMonth, runningShare: p.runningShare }).toNumber()).toBeGreaterThan(0)
    }
  })

  it('validates inputs', () => {
    expect(() => applianceKwh(a({ hoursPerDay: 25 }))).toThrow(/hours/)
    expect(() => applianceKwh(a({ watts: 0 }))).toThrow(/watts/)
  })
})

describe('savings', () => {
  const list: Appliance[] = [{ id: 'ac', name: 'Aircon', watts: 900, quantity: 1, hoursPerDay: 8, daysPerMonth: 30, runningShare: 0.85 }]

  it('fewer hours save the difference in kWh', () => {
    expect(kwhSaved(list, { kind: 'hours', applianceId: 'ac', hoursPerDay: 6 }).toNumber()).toBe(45.9)
  })

  it('switching to an inverter saves through the running share', () => {
    expect(kwhSaved(list, { kind: 'replace', applianceId: 'ac', watts: 900, runningShare: 0.5 }).toNumber()).toBe(75.6)
  })

  it('a daily cut is kWh a day × days', () => {
    expect(kwhSaved(list, { kind: 'daily', kwhPerDay: 1.5, days: 30 }).toNumber()).toBe(45)
  })

  it('the bill saving comes from the tariff, so crossing a tier saves more than the average rate', () => {
    const saved = residentialBill(NOV, 220).total.minus(residentialBill(NOV, 200).total)
    expect(saved.div(20).toNumber()).toBeGreaterThan(residentialBill(NOV, 220).perKwh.toNumber())
  })
})

describe('dataset', () => {
  it('keeps months newest first, each with its sources and Meralco’s worked bills', () => {
    const months = meralco.schedules.map((s) => s.month)
    expect([...months].sort().reverse()).toEqual(months)
    for (const s of meralco.schedules) {
      expect(s.sources.schedule).toMatch(/^https:\/\//)
      expect(s.officialBills.length).toBe(18)
      expect(s.universalCharges.length).toBe(4)
    }
    expect(months[0]).toBe('2026-11')
  })
})
