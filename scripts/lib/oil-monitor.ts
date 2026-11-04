/**
 * Parser for the DOE "Oil Monitor" weekly PDF (text already extracted).
 *
 * Only the DOMESTIC OIL PRICES section is read. The phrasing varies week to
 * week, e.g.
 *   "Domestic pump prices increased by: Php 1.20/L for diesel, and Php 0.50/L for kerosene
 *    Meanwhile, domestic pump prices for gasoline decreased by Php 0.30/L."
 *   "Domestic pump prices decreased by Php0.70/L to Php 0.80/L for gasoline, Php0.60/L for diesel,
 *    and Php2.09/L - Php 2.10/L for kerosene."
 *   "Php 5.85/LPhp 5.90/L for kerosene"   (missing separator)
 * so the parser normalises the text first and then reads clauses.
 * Anything it cannot read with confidence throws, so a bad parse is never published.
 */
import type { FuelKey, PesoRange } from '../../src/types/data.ts'

export interface ParsedOilMonitor {
  effectiveDate: string
  adjustments: Record<FuelKey, PesoRange>
  ytdNet: Record<FuelKey, number> | null
}

const FUELS: FuelKey[] = ['gasoline', 'diesel', 'kerosene']
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

export function normalise(text: string): string {
  return text
    .replace(/[‐-―−]/g, '-') // en/em dashes and minus signs
    .replace(/[^\x20-\x7E\n]/g, ' ') // bullets from symbol fonts
    .split('\n')
    .filter((l) => !/Weekly Recap|S&P Global/i.test(l)) // footnotes that interrupt sentences
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s*L\s*\/|(\d)\s*\/\s*L/g, (_m, a, b) => `${a ?? b}/L`) // "0.50L/" "1.20 /L" -> "/L"
    .replace(/\/L\s*(?=Php)/g, '/L to ') // "5.85/LPhp 5.90/L" -> "5.85/L to Php 5.90/L"
    .trim()
}

export function parseDate(text: string): string {
  const m = /As of\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i.exec(text)
  if (!m) throw new Error('Oil Monitor: "As of <date>" not found')
  const month = MONTHS.indexOf(m[2].toLowerCase()) + 1
  if (month === 0) throw new Error(`Oil Monitor: unknown month "${m[2]}"`)
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const AMOUNT = String.raw`Php\s*(\d+(?:\.\d+)?)\s*(?:/L)?`
const RANGE = String.raw`${AMOUNT}(?:\s*(?:to|-)?\s*${AMOUNT})?`

function toRange(a: string, b: string | undefined, sign: 1 | -1): PesoRange {
  const x = Number(a) * sign
  const y = Number(b ?? a) * sign
  return { min: Math.min(x, y), max: Math.max(x, y) }
}

export function parseDomestic(normalised: string): Record<FuelKey, PesoRange> {
  const start = normalised.search(/DOMESTIC OIL PRICES/i)
  const end = normalised.search(/price movement this year|For the updated prevailing/i)
  if (start < 0 || end < 0 || end < start) throw new Error('Oil Monitor: domestic price section not found')
  let section = normalised.slice(start, end)

  const found: Partial<Record<FuelKey, PesoRange>> = {}
  const put = (fuel: string, range: PesoRange) => {
    const key = fuel.toLowerCase() as FuelKey
    if (found[key]) throw new Error(`Oil Monitor: ${key} reported twice`)
    found[key] = range
  }

  // 1. "prices for <fuel> increased|decreased by Php X/L (to Php Y/L)"
  const fuelFirst = new RegExp(
    String.raw`prices for (gasoline|diesel|kerosene) (increased|decreased) by\s*${RANGE}`,
    'gi',
  )
  section = section.replace(fuelFirst, (_m, fuel: string, dir: string, a: string, b?: string) => {
    put(fuel, toRange(a, b, dir.toLowerCase() === 'increased' ? 1 : -1))
    return ' '
  })

  // 2. "increased|decreased by: <range> for <fuel>, <range> for <fuel> ..."
  const dirRe = /(increased|decreased) by:?/gi
  const marks = [...section.matchAll(dirRe)]
  marks.forEach((mark, i) => {
    const sign: 1 | -1 = mark[1].toLowerCase() === 'increased' ? 1 : -1
    const from = (mark.index ?? 0) + mark[0].length
    const to = i + 1 < marks.length ? (marks[i + 1].index ?? section.length) : section.length
    const clause = section.slice(from, to)
    const item = new RegExp(String.raw`${RANGE}\s*for\s+(gasoline|diesel|kerosene)`, 'gi')
    for (const m of clause.matchAll(item)) put(m[3], toRange(m[1], m[2], sign))
  })

  // 3. Explicit "no change" wording for a fuel.
  for (const fuel of FUELS) {
    if (!found[fuel] && new RegExp(String.raw`(no (price )?(change|movement)|unchanged)[^.]{0,40}${fuel}|${fuel}[^.]{0,40}(no (price )?(change|movement)|unchanged)`, 'i').test(section)) {
      found[fuel] = { min: 0, max: 0 }
    }
  }

  const missing = FUELS.filter((f) => !found[f])
  if (missing.length) throw new Error(`Oil Monitor: could not read adjustment for ${missing.join(', ')}`)
  return found as Record<FuelKey, PesoRange>
}

export function parseYtd(normalised: string): Record<FuelKey, number> | null {
  const start = normalised.search(/price movement this year/i)
  if (start < 0) return null
  const section = normalised.slice(start, start + 600)
  const out: Partial<Record<FuelKey, number>> = {}
  const marks = [...section.matchAll(/net (increase|decrease)/gi)]
  marks.forEach((mark, i) => {
    const sign = mark[1].toLowerCase() === 'increase' ? 1 : -1
    const from = mark.index ?? 0
    const to = i + 1 < marks.length ? (marks[i + 1].index ?? section.length) : section.length
    for (const m of section.slice(from, to).matchAll(/P(?:hp)?\s*(\d+(?:\.\d+)?)\s*\/\s*liter for (gasoline|diesel|kerosene)/gi)) {
      out[m[2].toLowerCase() as FuelKey] = sign * Number(m[1])
    }
  })
  return FUELS.every((f) => out[f] !== undefined) ? (out as Record<FuelKey, number>) : null
}

export function parseOilMonitor(rawText: string): ParsedOilMonitor {
  const text = normalise(rawText)
  return {
    effectiveDate: parseDate(text),
    adjustments: parseDomestic(text),
    ytdNet: parseYtd(text),
  }
}

/**
 * Consistency check between consecutive weeks: the change in the official
 * year-to-date total should fall inside the reported adjustment range
 * (allowing a few centavos of rounding). Returns human-readable problems.
 */
export function crossCheck(
  prevYtd: Record<FuelKey, number> | null,
  current: ParsedOilMonitor,
  tolerance = 0.06,
): string[] {
  if (!prevYtd || !current.ytdNet) return []
  const problems: string[] = []
  for (const f of FUELS) {
    const delta = current.ytdNet[f] - prevYtd[f]
    const r = current.adjustments[f]
    if (delta < r.min - tolerance || delta > r.max + tolerance) {
      problems.push(`${f}: YTD moved ${delta.toFixed(2)} but adjustment range is ${r.min}..${r.max}`)
    }
  }
  return problems
}
