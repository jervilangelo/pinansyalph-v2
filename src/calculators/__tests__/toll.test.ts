import { describe, expect, it } from 'vitest'
import tollJson from '../../data/tolls.json'
import type { PlazaRef, TollDataset, VehicleClass } from '../../types/toll'
import { InputError } from '../money'
import { computeRoundTrip, computeToll, findRoute, fuelCost, searchPlazas } from '../toll'

const data = tollJson as TollDataset
const p = (expressway: string, plaza: string): PlazaRef => ({ expressway, plaza })
const total = (a: PlazaRef, b: PlazaRef, cls: VehicleClass = 1) => {
  const r = computeToll(data, a, b, cls)
  if (!r.ok) throw new Error(r.message)
  return r
}
/** A single-road fare straight from the matrix, for building multi-road expectations. */
const fare = (x: string, from: string, to: string, cls: VehicleClass = 1) => {
  const e = data.expressways.find((y) => y.id === x)!
  return e.fares[String(cls) as '1'][e.plazas.findIndex((q) => q.id === from)][e.plazas.findIndex((q) => q.id === to)]
}

const BALINTAWAK = p('nlex-sctex', 'balintawak')

describe('NLEX–SCTEX (one integrated system)', () => {
  it('Balintawak → Sta. Ines matches the TRB rates reported for 20 January 2026', () => {
    expect(total(BALINTAWAK, p('nlex-sctex', 'sta-ines'), 1).total).toBe(440)
    expect(total(BALINTAWAK, p('nlex-sctex', 'sta-ines'), 2).total).toBe(1099)
    expect(total(BALINTAWAK, p('nlex-sctex', 'sta-ines'), 3).total).toBe(1319)
  })

  it('charges the open-system flat rate from Balintawak to Marilao', () => {
    expect(total(BALINTAWAK, p('nlex-sctex', 'marilao')).total).toBe(85)
    expect(total(p('nlex-sctex', 'mindanao-avenue'), p('nlex-sctex', 'marilao')).total).toBe(85)
  })

  it('charges NLEX to SCTEX once, as one leg, not NLEX plus SCTEX', () => {
    const r = total(BALINTAWAK, p('nlex-sctex', 'tarlac'))
    expect(r.total).toBe(670)
    expect(r.legs).toHaveLength(1)
    expect(total(BALINTAWAK, p('nlex-sctex', 'tipo-subic')).total).toBe(857)
  })

  it('gives the same fare in reverse', () => {
    expect(total(p('nlex-sctex', 'sta-ines'), BALINTAWAK).total).toBe(440)
    expect(total(p('nlex-sctex', 'clark-north'), p('nlex-sctex', 'bocaue')).total).toBe(total(p('nlex-sctex', 'bocaue'), p('nlex-sctex', 'clark-north')).total)
  })
})

describe('across expressways', () => {
  it('NLEX → SCTEX → TPLEX: Balintawak to Rosario is NLEX–SCTEX to Tarlac plus TPLEX La Paz to Rosario', () => {
    const r = total(BALINTAWAK, p('tplex', 'rosario'))
    expect(r.legs.map((l) => l.expressway.id)).toEqual(['nlex-sctex', 'tplex'])
    expect(r.legs.map((l) => l.fare)).toEqual([670, 311])
    expect(r.total).toBe(981)
    for (const c of [2, 3] as const) expect(total(BALINTAWAK, p('tplex', 'rosario'), c).total).toBe(fare('nlex-sctex', 'balintawak', 'tarlac', c)! + fare('tplex', 'la-paz', 'rosario', c)!)
  })

  it('SLEX → STAR: Alabang to Batangas City is SLEX to Sto. Tomas plus STAR to Batangas', () => {
    const r = total(p('skyway-slex', 'alabang'), p('star', 'batangas-city'))
    expect(r.legs.map((l) => [l.from.name, l.to.name])).toEqual([
      ['Alabang', 'Sto. Tomas'],
      ['Sto. Tomas', 'Batangas City'],
    ])
    expect(r.legs[1].fare).toBe(121)
    expect(r.total).toBe(fare('skyway-slex', 'alabang', 'sto-tomas')! + 121)
  })

  it('Skyway → SLEX is one integrated leg', () => {
    const r = total(p('skyway-slex', 'skyway-elevated-buendia'), p('skyway-slex', 'calamba'))
    expect(r.legs).toHaveLength(1)
    expect(r.total).toBe(fare('skyway-slex', 'skyway-elevated-buendia', 'calamba'))
    expect(total(p('skyway-slex', 'alabang'), p('skyway-slex', 'calamba'), 2).total).toBe(274)
  })

  it('Skyway Stage 3 → NLEX: Buendia to Dau is Stage 3 to Balintawak plus NLEX', () => {
    const r = total(p('skyway-3', 'buendia'), p('nlex-sctex', 'dau'))
    expect(r.legs.map((l) => l.fare)).toEqual([264, 411])
    expect(r.byRfid).toEqual([
      { rfid: 'Autosweep', total: 264, expressways: ['Skyway Stage 3'] },
      { rfid: 'Easytrip', total: 411, expressways: ['NLEX–SCTEX'] },
    ])
  })

  it('a long chain: TPLEX to STAR crosses five roads with one fare each', () => {
    const r = total(p('tplex', 'rosario'), p('star', 'batangas-city'))
    expect(r.route.map((x) => x.id)).toEqual(['tplex', 'nlex-sctex', 'skyway-3', 'skyway-slex', 'star'])
    expect(r.total).toBe(r.legs.reduce((s, l) => s + l.fare, 0))
    expect(new Set(r.legs.map((l) => l.expressway.id)).size).toBe(r.legs.length)
  })

  it('skips a road when the trip starts exactly at the junction', () => {
    const r = total(p('nlex-sctex', 'tarlac'), p('tplex', 'rosario'))
    expect(r.legs).toHaveLength(1)
    expect(r.total).toBe(311)
  })

  it('SLEX → CALAX meets at Mamplasan', () => {
    const r = total(p('skyway-slex', 'alabang'), p('calax', 'silang-aguinaldo'))
    expect(r.legs.map((l) => l.to.name)).toEqual(['Mamplasan', 'Silang (Aguinaldo)'])
  })
})

describe('matches ExpresswayPH’s published route guides (Class 1, checked 18 Nov 2026)', () => {
  // https://expresswayph.com/guides/<route>: figures read from the public pages, not their API.
  const cases: [string, PlazaRef, PlazaRef, number][] = [
    ['balintawak-to-batangas', BALINTAWAK, p('star', 'batangas-city'), 723],
    ['balintawak-to-calamba', BALINTAWAK, p('skyway-slex', 'calamba'), 565],
    ['skyway-to-calamba', p('skyway-slex', 'skyway-elevated-buendia'), p('skyway-slex', 'calamba'), 301],
    ['magallanes-skyway-to-alabang', p('skyway-slex', 'magallanes-skyway'), p('skyway-slex', 'alabang'), 164],
    ['alabang-to-calamba', p('skyway-slex', 'alabang'), p('skyway-slex', 'calamba'), 137],
    ['quezon-avenue-to-alabang', p('skyway-3', 'quezon-avenue'), p('skyway-slex', 'alabang'), 428],
  ]
  it.each(cases)('%s', (_name, a, b, expected) => {
    expect(total(a, b).total).toBe(expected)
  })
})

describe('invalid trips', () => {
  it('rejects the same plaza', () => {
    const r = computeToll(data, BALINTAWAK, BALINTAWAK, 1)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('same')
  })

  it('rejects roads that are not connected in the data', () => {
    const r = computeToll(data, BALINTAWAK, p('cavitex', 'kawit'), 1)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no-route')
  })

  it('rejects a plaza pair with no published fare and names it', () => {
    const r = computeToll(data, p('cavitex', 'merville-c5-link'), p('cavitex', 'kawit'), 1)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('no-fare')
      expect(r.message).toMatch(/Merville/)
    }
  })

  it('rejects unknown plazas', () => {
    const r = computeToll(data, p('nlex-sctex', 'nowhere'), BALINTAWAK, 1)
    expect(r.ok).toBe(false)
  })
})

describe('round trip', () => {
  it('adds the return, computed in the other direction', () => {
    const r = computeRoundTrip(data, BALINTAWAK, p('tplex', 'rosario'), 1)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.total).toBe(981 * 2)
      expect(r.back.legs.map((l) => l.expressway.id)).toEqual(['tplex', 'nlex-sctex'])
      expect(r.byRfid).toEqual([
        { rfid: 'Easytrip', total: 1340 },
        { rfid: 'Autosweep', total: 622 },
      ])
    }
  })
})

describe('fuel', () => {
  it('is distance ÷ km per liter × price', () => {
    const f = fuelCost(250, 12.5, 60)
    expect(f.liters.toNumber()).toBe(20)
    expect(f.cost.toNumber()).toBe(1200)
  })
  it('validates inputs', () => {
    expect(() => fuelCost(0, 10, 60)).toThrow(InputError)
    expect(() => fuelCost(100, 0, 60)).toThrow(/economy/)
    expect(() => fuelCost(100, 10, -1)).toThrow(/price/)
  })
})

describe('search', () => {
  it('finds plazas by name, expressway, place or landmark', () => {
    expect(searchPlazas(data, 'balintawak')[0].plaza.name).toBe('Balintawak')
    expect(searchPlazas(data, 'baguio')[0].plaza.name).toBe('Rosario')
    expect(searchPlazas(data, 'subic')[0].plaza.name).toBe('Tipo (Subic)')
    expect(searchPlazas(data, 'tplex').every((o) => o.expressway.id === 'tplex')).toBe(true)
    expect(searchPlazas(data, 'espana')[0].plaza.name).toBe('España')
    expect(searchPlazas(data, '')).toEqual([])
  })
})

describe('dataset', () => {
  it('has square matrices, positive whole-peso fares and no fare to the same plaza', () => {
    for (const x of data.expressways) {
      const n = x.plazas.length
      expect(new Set(x.plazas.map((q) => q.id)).size).toBe(n)
      for (const cls of ['1', '2', '3'] as const) {
        expect(x.fares[cls]).toHaveLength(n)
        x.fares[cls].forEach((row, i) => {
          expect(row).toHaveLength(n)
          expect(row[i]).toBeNull()
          for (const v of row) if (v != null) expect(Number.isInteger(v) && v > 0).toBe(true)
        })
      }
    }
  })

  it('charges more for bigger vehicles on every pair', () => {
    for (const x of data.expressways)
      x.fares['1'].forEach((row, i) =>
        row.forEach((v, j) => {
          if (v == null) return
          expect(x.fares['2'][i][j]!).toBeGreaterThan(v)
          expect(x.fares['3'][i][j]!).toBeGreaterThanOrEqual(x.fares['2'][i][j]!)
        }),
      )
  })

  it('agrees with every independent check it records', () => {
    for (const c of data.checks)
      c.fares.forEach((v, k) => {
        if (v != null) expect(fare(c.expressway, c.from, c.to, (k + 1) as VehicleClass)).toBe(v)
      })
  })

  it('connects every road it can route to', () => {
    expect(findRoute(data, 'tplex', 'calax')).toEqual(['tplex', 'nlex-sctex', 'skyway-3', 'skyway-slex', 'calax'])
    expect(findRoute(data, 'cavitex', 'star')).toBeNull()
  })
})
