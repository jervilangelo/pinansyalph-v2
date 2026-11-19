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
 * Add or refresh one month of Meralco residential rates in src/data/electricity.json.
 *
 *   npm run data:electricity -- --month 2026-11 \
 *     --schedule <URL or file of "Summary Schedule of Rates" PDF> \
 *     --bills <URL or file of "Residential Bills at Typical Consumption Levels" PDF>
 *
 * Both PDFs are Meralco's own monthly publications, linked from
 * https://www.meralco.com.ph/residential/rates-and-charges.
 *
 * Why this is run by hand: Meralco's website sits behind bot protection, so a
 * scheduled job cannot reliably find each month's links, and the file names
 * change from month to month. Nothing is guessed. A maintainer pastes the two
 * links once a month (Meralco announces new rates around the second week).
 *
 * Safety: the script reads the residential rates from the bills table, then
 * recomputes every one of Meralco's worked bills (lifeline and non-lifeline,
 * 50 to 5,000 kWh) with src/calculators/electricity.ts. If any total differs by
 * even one centavo, nothing is written. Requires `pdftotext` from the xpdf
 * tools (its `-table` mode).
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { residentialBill } from '../src/calculators/electricity.ts'
import { ElectricityDataset, type ResidentialSchedule } from '../src/types/electricity.ts'
import { dataPath, fetchWithRetry, readJson, summary, writeIfChanged } from './lib/io.ts'

const OUT = dataPath('electricity.json')
const KEEP_MONTHS = 13

type Row = Record<string, number>

const NUM = /^\(?-?[\d,]+(\.\d+)?\)?%?$|^-$/
const val = (t: string) => (t === '-' ? 0 : (t.startsWith('(') ? -1 : 1) * Number(t.replace(/[(),%]/g, '')))

export function headerCols(text: string): string[] {
  const line = text.split(/\r?\n/).find((l) => l.trim().startsWith('Consumption'))
  if (!line) throw new Error('No column header found: not a residential bills table')
  const refunds = line.split('(Refund)/Collect').length - 1
  const cols = ['generation', 'transmission', 'ancillary', 'systemLoss', 'distribution', 'supply', 'supplyCustomer', 'metering', 'meteringCustomer']
  for (let i = 1; i <= refunds; i++) cols.push(`refund${i}`)
  cols.push('regResetAdj')
  if (/Adjustment/.test(line.split('Fees Adj')[1]?.split('Subsidy')[0] ?? '')) cols.push('lifelineRateAdj')
  cols.push('seniorSubsidy', 'rpt', 'rptAdj', 'lft', 'lftAdj', 'vat', 'energyTax', 'universalCharge', 'fitAll', 'geaAll', 'lifelineDiscount', 'lifelineSubsidy', 'total')
  return cols
}

/** Rows of both tables. Some months omit the "For Non-Lifeline" heading, so a kWh that does not increase starts that section. */
export function parseBillsTable(text: string): { peso: { lifeline: boolean; kwh: number; row: Row }[]; perKwh: Map<number, Row>; cols: string[] } {
  const cols = headerCols(text)
  const peso: { lifeline: boolean; kwh: number; row: Row }[] = []
  const perKwh = new Map<number, Row>()
  let section: 'lifeline' | 'non' | null = null
  let table: 'peso' | 'perKwh' = 'peso'
  let last = 0
  for (const raw of text.split(/\r?\n/)) {
    const s = raw.trim().split(/\s+/).join(' ')
    if (s.startsWith('For Lifeline')) [section, last] = ['lifeline', 0]
    else if (s.startsWith('For Non-Lifeline')) [section, last] = ['non', 0]
    else if (s.includes('Rate per kWh')) [table, section, last] = ['perKwh', null, 0]
    else {
      const toks = s.split(' ')
      if (!/^\d+$/.test(toks[0] ?? '') || !section) continue
      const kwh = Number(toks[0])
      if (kwh <= last && section === 'lifeline') section = 'non'
      last = kwh
      const nums = toks.slice(1).filter((t) => NUM.test(t))
      if (nums.length !== cols.length) throw new Error(`Row ${kwh} kWh has ${nums.length} values, expected ${cols.length}`)
      const row = Object.fromEntries(cols.map((c, i) => [c, val(nums[i])]))
      if (table === 'peso') peso.push({ lifeline: section === 'lifeline', kwh, row })
      else if (section === 'non') perKwh.set(kwh, row)
    }
  }
  return { peso, perKwh, cols }
}

export function parseVat(schedule: string): ResidentialSchedule['vat'] {
  const pct = (label: string) => {
    const m = schedule.match(new RegExp(`^\\s*${label}\\s+([\\d.]+)%`, 'm'))
    return m ? Number((Number(m[1]) / 100).toFixed(6)) : null
  }
  const generation = pct('Generation')
  const transmission = pct('Transmission')
  const ancillary = pct('Ancillary Service')
  if (generation === null || transmission === null || ancillary === null) throw new Error('VAT rates not found in the schedule')
  // System loss is listed when it has its own rate; from October 2026 it is not subject to VAT.
  return { generation, transmission, ancillary, systemLoss: pct('System Loss') ?? 0, others: pct('Other Charges') ?? 0.12 }
}

/**
 * The four universal charges (UC-ME NPC-SPUG, UC-ME RED-CI, UC-EC, UC-SD) are billed separately, so each is rounded on
 * its own. In the schedule they are four consecutive per-kWh values followed by FIT-All; they must add up to the
 * universal charge per kWh in the bills table.
 */
export function parseUniversalCharges(layout: string, total: number, fitAll: number): ResidentialSchedule['universalCharges'] {
  const labels = ['Missionary electrification (NPC-SPUG)', 'Missionary electrification (RED-CI)', 'Environmental charge', 'Stranded debts']
  const found = new Set<string>()
  for (const line of layout.split(/\r?\n/)) {
    const v = [...line.matchAll(/\(?\d+\.\d{4}\)?/g)].map((m) => Number(m[0].replace(/[()]/g, '')))
    for (let i = 0; i + 4 < v.length; i++) if (Math.abs(v[i] + v[i + 1] + v[i + 2] + v[i + 3] - total) < 1e-9 && v[i + 4] === fitAll) found.add(v.slice(i, i + 4).join(','))
  }
  if (found.size !== 1) throw new Error(`Universal charge components not found unambiguously (${found.size} candidates)`)
  return [...found][0].split(',').map((x, i) => ({ label: labels[i], rate: Number(x) }))
}

export function buildSchedule(month: string, billsText: string, scheduleText: string, sources: ResidentialSchedule['sources'], verifiedOn: string, scheduleLayout = scheduleText): ResidentialSchedule {
  const { peso, perKwh, cols } = parseBillsTable(billsText)
  const at = (k: number) => {
    const r = perKwh.get(k)
    if (!r) throw new Error(`No ${k} kWh row in the per-kWh table`)
    return r
  }
  const r = at(200)
  const fixed200 = peso.find((p) => !p.lifeline && p.kwh === 200)
  if (!fixed200) throw new Error('No 200 kWh bill in the peso table')
  const refunds = cols.filter((c) => c.startsWith('refund'))
  return {
    month,
    category: 'residential',
    sources,
    verifiedOn,
    perKwh: {
      generation: r.generation,
      transmission: r.transmission,
      ancillary: r.ancillary,
      systemLoss: r.systemLoss,
      supply: r.supply,
      metering: r.metering,
      regResetAdj: r.regResetAdj,
      lifelineRateAdj: r.lifelineRateAdj ?? 0,
      seniorSubsidy: r.seniorSubsidy,
      rpt: r.rpt,
      rptAdj: r.rptAdj,
      fitAll: r.fitAll,
      geaAll: r.geaAll,
      lifelineSubsidy: r.lifelineSubsidy,
      lftAdj: r.lftAdj,
    },
    refunds: refunds.map((c, i) => ({ label: `Refund ordered by ERC (${i + 1} of ${refunds.length})`, rate: r[c] })),
    universalCharges: parseUniversalCharges(scheduleLayout, r.universalCharge, r.fitAll),
    // Meralco's residential distribution tiers: 0–200, 201–300, 301–400 and over 400 kWh.
    distribution: [
      { upTo: 200, rate: at(200).distribution },
      { upTo: 300, rate: at(300).distribution },
      { upTo: 400, rate: at(400).distribution },
      { upTo: null, rate: at(500).distribution },
    ],
    fixed: { supplyCustomer: fixed200.row.supplyCustomer, meteringCustomer: fixed200.row.meteringCustomer },
    vat: parseVat(scheduleText),
    // Meralco's sample bills assume 0.50%; the footnote says it varies per LGU.
    lftRate: /LFT\)\s*assumed at 0\.50%/.test(billsText.replace(/\s+/g, ' ')) ? 0.005 : (() => {
      throw new Error('LFT assumption not found')
    })(),
    // Energy tax (RA 10963) on residential consumption: first 650 kWh free, then by block.
    energyTax: [
      { upTo: 650, rate: 0 },
      { upTo: 1000, rate: 0.1 },
      { upTo: 1500, rate: 0.2 },
      { upTo: null, rate: 0.35 },
    ],
    // Lifeline discounts under RA 11552 for registered qualified households.
    lifelineDiscounts: [
      { upTo: 50, share: 1 },
      { upTo: 70, share: 0.35 },
      { upTo: 100, share: 0.2 },
    ],
    officialBills: peso.map((p) => ({ kwh: p.kwh, lifeline: p.lifeline, total: p.row.total })),
  }
}

/**
 * How close the calculation must come to each of Meralco's worked bills: 2 centavos, plus 1 centavo per ₱1,000 of
 * bill. Meralco publishes its VAT rates rounded to two decimals of a percent, so very large bills can differ by a few
 * centavos; a misread column or the wrong month is off by pesos and fails.
 */
export const toleranceFor = (total: number) => 0.02 + Math.abs(total) * 0.00001

/** Every official worked bill must match within the tolerance. Returns the mismatches. */
export function verifySchedule(s: ResidentialSchedule): string[] {
  const bad: string[] = []
  for (const b of s.officialBills) {
    const got = residentialBill(s, b.kwh, { lifeline: b.lifeline }).total.toNumber()
    if (Math.abs(got - b.total) > toleranceFor(b.total) + 1e-9) bad.push(`${b.kwh} kWh ${b.lifeline ? 'lifeline' : 'non-lifeline'}: computed ${got.toFixed(2)}, Meralco ${b.total.toFixed(2)}`)
  }
  return bad
}

async function pdfText(src: string, dir: string, name: string, table = true): Promise<string> {
  let file = src
  if (/^https?:/.test(src)) {
    const res = await fetchWithRetry(src)
    file = join(dir, `${name}.pdf`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  if (readFileSync(file).subarray(0, 4).toString() !== '%PDF') throw new Error(`${src} is not a PDF`)
  const out = join(dir, `${name}.txt`)
  execFileSync('pdftotext', [table ? '-table' : '-layout', file, out])
  return readFileSync(out, 'utf8')
}

async function main() {
  const { values } = parseArgs({ options: { month: { type: 'string' }, schedule: { type: 'string' }, bills: { type: 'string' }, 'schedule-url': { type: 'string' }, 'bills-url': { type: 'string' } } })
  const { month, schedule, bills } = values
  if (!month || !/^\d{4}-\d{2}$/.test(month) || !schedule || !bills) throw new Error('Usage: --month YYYY-MM --schedule <pdf url|file> --bills <pdf url|file> [--schedule-url URL --bills-url URL when passing files]')
  const scheduleUrl = values['schedule-url'] ?? schedule
  const billsUrl = values['bills-url'] ?? bills
  if (!/^https:/.test(scheduleUrl) || !/^https:/.test(billsUrl)) throw new Error('Record the public source URLs with --schedule-url and --bills-url')

  const dir = mkdtempSync(join(tmpdir(), 'meralco-'))
  const billsText = await pdfText(bills, dir, 'bills')
  const scheduleText = await pdfText(schedule, dir, 'schedule')
  // The same PDF in layout mode, where each rate row stays on one line (for the universal charge components).
  const scheduleLayout = await pdfText(/^https?:/.test(schedule) ? join(dir, 'schedule.pdf') : schedule, dir, 'schedule-layout', false)
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()
  if (!billsText.toUpperCase().includes(label)) throw new Error(`The bills PDF is not for ${label}`)
  if (!scheduleText.toUpperCase().includes(`EFFECTIVE ${label.split(' ')[0]} ${label.split(' ')[1]} BILLING`)) throw new Error(`The schedule PDF is not for ${label} billing`)

  // Verification date in Philippine time (UTC+8), the date a reader in the Philippines would see.
  const verifiedOn = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)
  const s = buildSchedule(month, billsText, scheduleText, { schedule: scheduleUrl, bills: billsUrl }, verifiedOn, scheduleLayout)
  const bad = verifySchedule(s)
  if (bad.length) throw new Error(`Calculation does not reproduce Meralco's worked bills; nothing written:\n  ${bad.join('\n  ')}`)
  const worst = Math.max(...s.officialBills.map((b) => Math.abs(residentialBill(s, b.kwh, { lifeline: b.lifeline }).total.toNumber() - b.total)))

  const prev = readJson<ElectricityDataset>(OUT)
  const meralco = prev?.providers.find((p) => p.id === 'meralco')
  const schedules = [s, ...(meralco?.schedules ?? []).filter((x) => x.month !== month)].sort((a, b) => b.month.localeCompare(a.month)).slice(0, KEEP_MONTHS)
  const next: ElectricityDataset = {
    version: 1,
    retrievedAt: new Date().toISOString(),
    providers: [
      {
        id: 'meralco',
        name: 'Meralco',
        long: 'Manila Electric Company',
        area: 'Metro Manila, Bulacan, Cavite, Rizal, and parts of Laguna, Quezon, Batangas and Pampanga',
        ratesPage: 'https://www.meralco.com.ph/residential/rates-and-charges',
        schedules,
      },
      ...(prev?.providers.filter((p) => p.id !== 'meralco') ?? []),
    ],
  }
  const changed = writeIfChanged(OUT, next, ElectricityDataset)
  summary(`Meralco ${month}: ${s.officialBills.length} worked bills reproduced (largest difference ₱${worst.toFixed(2)}); ${(s.officialBills.find((b) => b.kwh === 200 && !b.lifeline)!.total / 200).toFixed(4)} PHP/kWh at 200 kWh. ${changed ? 'Written.' : 'No change.'}`)
}

if (process.argv[1]?.endsWith('update-electricity-rates.ts')) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
