import type { Expressway, PlazaRef, Rfid, TollDataset, TollPlaza, VehicleClass } from '../types/toll'
import { D, InputError, centavos, type Dec } from './money'

/**
 * "Magkano ang Toll Ko?" Toll for a trip from one plaza to another.
 *
 * Each expressway charges from where you enter it to where you leave it,
 * using its own TRB matrix. A trip across several expressways is a chain of
 * such legs, joined where the roads meet (see `connections` in the data).
 * Integrated systems (NLEX–SCTEX, Skyway–SLEX) are one matrix in the data,
 * so a trip within them is one leg and is never charged twice.
 *
 * The route between expressways is the one with the fewest expressways,
 * found by breadth-first search. Today the network is a chain, so there is
 * only one way between any two roads.
 */

export interface TollLeg {
  expressway: Expressway
  from: TollPlaza
  to: TollPlaza
  fare: number
}

export type TollFailure =
  | { reason: 'same'; message: string }
  | { reason: 'unknown'; message: string }
  | { reason: 'no-route'; message: string }
  | { reason: 'no-fare'; message: string; expressway: Expressway; from: TollPlaza; to: TollPlaza }

export interface TollTrip {
  legs: TollLeg[]
  total: number
  /** Expressways in travel order. */
  route: Expressway[]
  /** What each RFID account pays, in the order first used. */
  byRfid: { rfid: Rfid; total: number; expressways: string[] }[]
}

export type TollResult = ({ ok: true } & TollTrip) | ({ ok: false } & TollFailure)

export const plazaKey = (r: PlazaRef) => `${r.expressway}/${r.plaza}`
export function parsePlazaKey(key: string): PlazaRef | null {
  const [expressway, plaza] = key.split('/')
  return expressway && plaza ? { expressway, plaza } : null
}

function lookup(data: TollDataset, ref: PlazaRef): { x: Expressway; i: number } | null {
  const x = data.expressways.find((e) => e.id === ref.expressway)
  const i = x ? x.plazas.findIndex((p) => p.id === ref.plaza) : -1
  return x && i >= 0 ? { x, i } : null
}

/** Neighbouring expressways, with the plaza on each side where they meet. */
function neighbours(data: TollDataset, id: string): { next: string; leaveAt: string; joinAt: string }[] {
  const out: { next: string; leaveAt: string; joinAt: string }[] = []
  for (const c of data.connections) {
    if (c.a.expressway === id) out.push({ next: c.b.expressway, leaveAt: c.a.plaza, joinAt: c.b.plaza })
    if (c.b.expressway === id) out.push({ next: c.a.expressway, leaveAt: c.b.plaza, joinAt: c.a.plaza })
  }
  return out
}

/** Expressways from `from` to `to` with the fewest roads, or null when they are not connected. */
export function findRoute(data: TollDataset, from: string, to: string): string[] | null {
  const prev = new Map<string, string | null>([[from, null]])
  const queue = [from]
  while (queue.length) {
    const cur = queue.shift()!
    if (cur === to) break
    for (const n of neighbours(data, cur)) {
      if (prev.has(n.next)) continue
      prev.set(n.next, cur)
      queue.push(n.next)
    }
  }
  if (!prev.has(to)) return null
  const path: string[] = []
  for (let at: string | null = to; at; at = prev.get(at) ?? null) path.unshift(at)
  return path
}

function joinPoint(data: TollDataset, a: string, b: string): { leaveAt: string; joinAt: string } {
  const n = neighbours(data, a).find((x) => x.next === b)
  if (!n) throw new Error(`No connection between ${a} and ${b}`)
  return n
}

export function computeToll(data: TollDataset, entry: PlazaRef, exit: PlazaRef, cls: VehicleClass): TollResult {
  const a = lookup(data, entry)
  const b = lookup(data, exit)
  if (!a || !b) return { ok: false, reason: 'unknown', message: 'Choose an entry and an exit from the list.' }
  if (a.x.id === b.x.id && a.i === b.i) return { ok: false, reason: 'same', message: 'Your entry and exit are the same plaza. Pick a different exit.' }

  const path = findRoute(data, a.x.id, b.x.id)
  if (!path) {
    return {
      ok: false,
      reason: 'no-route',
      message: `${a.x.name} and ${b.x.name} are not connected by a tolled route in our data. Compute each expressway as a separate trip.`,
    }
  }

  const legs: TollLeg[] = []
  for (let k = 0; k < path.length; k++) {
    const x = data.expressways.find((e) => e.id === path[k])!
    const fromId = k === 0 ? entry.plaza : joinPoint(data, path[k - 1], path[k]).joinAt
    const toId = k === path.length - 1 ? exit.plaza : joinPoint(data, path[k], path[k + 1]).leaveAt
    if (fromId === toId) continue // entered or left right at the junction: nothing to pay on this road
    const i = x.plazas.findIndex((p) => p.id === fromId)
    const j = x.plazas.findIndex((p) => p.id === toId)
    const fare = x.fares[String(cls) as '1' | '2' | '3'][i]?.[j]
    if (fare == null) {
      return {
        ok: false,
        reason: 'no-fare',
        message: `There is no published ${x.name} fare from ${x.plazas[i].name} to ${x.plazas[j].name}. The ramps may not connect in that direction.`,
        expressway: x,
        from: x.plazas[i],
        to: x.plazas[j],
      }
    }
    legs.push({ expressway: x, from: x.plazas[i], to: x.plazas[j], fare })
  }
  if (legs.length === 0) return { ok: false, reason: 'same', message: 'Your entry and exit meet at the same junction, so there is no toll. Pick a different exit.' }

  const byRfid: TollTrip['byRfid'] = []
  for (const l of legs) {
    const r = byRfid.find((x) => x.rfid === l.expressway.rfid)
    if (r) {
      r.total += l.fare
      r.expressways.push(l.expressway.name)
    } else byRfid.push({ rfid: l.expressway.rfid, total: l.fare, expressways: [l.expressway.name] })
  }
  return {
    ok: true,
    legs,
    total: legs.reduce((s, l) => s + l.fare, 0),
    route: path.map((id) => data.expressways.find((e) => e.id === id)!).filter((x) => legs.some((l) => l.expressway.id === x.id)),
    byRfid,
  }
}

export interface RoundTrip {
  out: TollTrip
  back: TollTrip
  total: number
  byRfid: { rfid: Rfid; total: number }[]
}

/** There and back. The return is computed on its own, because a fare may differ by direction. */
export function computeRoundTrip(data: TollDataset, entry: PlazaRef, exit: PlazaRef, cls: VehicleClass): ({ ok: true } & RoundTrip) | ({ ok: false } & TollFailure) {
  const out = computeToll(data, entry, exit, cls)
  if (!out.ok) return out
  const back = computeToll(data, exit, entry, cls)
  if (!back.ok) return { ...back, message: `Return trip: ${back.message}` }
  const byRfid: { rfid: Rfid; total: number }[] = []
  for (const r of [...out.byRfid, ...back.byRfid]) {
    const x = byRfid.find((y) => y.rfid === r.rfid)
    if (x) x.total += r.total
    else byRfid.push({ rfid: r.rfid, total: r.total })
  }
  return { ok: true, out, back, total: out.total + back.total, byRfid }
}

/** Fuel for a distance: km ÷ km per litre × price per litre, to the centavo. */
export function fuelCost(distanceKm: number, kmPerLiter: number, pricePerLiter: number): { liters: Dec; cost: Dec } {
  if (![distanceKm, kmPerLiter, pricePerLiter].every(Number.isFinite)) throw new InputError('Enter numbers for distance, fuel economy and price.')
  if (distanceKm <= 0 || distanceKm > 5_000) throw new InputError('Distance should be more than 0 and at most 5,000 km.')
  if (kmPerLiter <= 0 || kmPerLiter > 100) throw new InputError('Fuel economy should be more than 0 and at most 100 km per liter.')
  if (pricePerLiter <= 0 || pricePerLiter > 500) throw new InputError('Fuel price should be more than ₱0 and at most ₱500 per liter.')
  const liters = new D(distanceKm).div(kmPerLiter)
  return { liters: liters.toDecimalPlaces(2), cost: centavos(liters.times(pricePerLiter)) }
}

// ── Search ──────────────────────────────────────────────────────────────

export interface PlazaOption {
  key: string
  ref: PlazaRef
  plaza: TollPlaza
  expressway: Expressway
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function allPlazas(data: TollDataset): PlazaOption[] {
  return data.expressways.flatMap((x) => x.plazas.map((p) => ({ key: plazaKey({ expressway: x.id, plaza: p.id }), ref: { expressway: x.id, plaza: p.id }, plaza: p, expressway: x })))
}

/**
 * Rank plazas for a query: plaza name first, then an expressway name, then
 * places and landmarks ("baguio", "subic"). Accents and punctuation are ignored.
 */
export function searchPlazas(data: TollDataset, query: string, limit = 10): PlazaOption[] {
  const q = norm(query)
  if (!q) return []
  const words = q.split(' ')
  const scored: { o: PlazaOption; s: number; order: number }[] = []
  allPlazas(data).forEach((o, order) => {
    const name = norm(o.plaza.name)
    const xw = norm(`${o.expressway.name} ${o.expressway.long}`)
    const kw = (o.plaza.keywords ?? []).map(norm)
    let s = 0
    if (name === q) s = 100
    else if (name.startsWith(q)) s = 80
    else if (name.split(' ').some((w) => w.startsWith(q))) s = 60
    else if (kw.some((k) => k === q || k.startsWith(q))) s = 45
    else if (words.every((w) => `${name} ${xw} ${kw.join(' ')}`.includes(w))) s = 30
    if (s) scored.push({ o, s, order })
  })
  return scored
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .slice(0, limit)
    .map((x) => x.o)
}
