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
 * Fetch occupational wage benchmarks from PSA OpenSTAT (Occupational Wages
 * Survey) and store them in src/data/salary-benchmarks.json.
 *
 * Sources, all official PSA tables on OpenSTAT (PxWeb API):
 *  - 2024 OWS (establishments with 10+ workers): average basic pay, allowance
 *    and wage rate of all time-rated workers by region and by major industry;
 *    average wage rates of the benchmark occupations "General office clerks"
 *    and "Elementary occupations" by region and by major industry.
 *  - 2014–2022 OWS (establishments with 20+ workers): average wage rates of
 *    "Accounting and bookkeeping clerks" and median basic pay and allowances
 *    of all time-rated workers, by industry. Only the latest round is kept.
 *
 * Nothing is derived. Figures PSA did not publish (percentiles, sample sizes,
 * experience levels, occupation-by-region-by-industry cells) stay absent.
 *
 * psa.gov.ph blocks automated clients, so its fuller report tables (with more
 * industry-specific occupations) are not used; see docs/METHODOLOGY.md for a
 * manual import route.
 */
import { SalaryBenchmarkDataset, type Benchmark, type SourceTable, type SurveyRound } from '../src/types/salary.ts'
import { dataPath, fetchWithRetry, nowIso, readJson, runFetcher, summary, writeIfChanged } from './lib/io.ts'
import { getMeta, query, variable, type PxMeta } from './lib/pxweb.ts'

const API = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB'
const FOLDERS = { o10: '1B/OWS/O10', o20: '1B/OWS/O20' } as const
const OUT = dataPath('salary-benchmarks.json')

interface Entry {
  id: string
  type: string
  text: string
  updated?: string
}

/* ------------------------------ mapping ------------------------------ */

/** PSA region labels → stable ids. Unknown labels throw, so a PSA change fails loudly. */
const REGIONS: [RegExp, string, string, string][] = [
  [/^PHILIPPINES$/i, 'ph', 'Philippines (national average)', 'Philippines'],
  [/^National Capital Region/i, 'ncr', 'National Capital Region (Metro Manila)', 'NCR'],
  [/^Cordillera Administrative Region/i, 'car', 'Cordillera Administrative Region', 'CAR'],
  [/^Region I - /i, 'ilocos', 'Region I – Ilocos Region', 'Ilocos'],
  [/^Region II - /i, 'cagayan-valley', 'Region II – Cagayan Valley', 'Cagayan Valley'],
  [/^Region III - /i, 'central-luzon', 'Region III – Central Luzon', 'Central Luzon'],
  [/^Region IV-A - /i, 'calabarzon', 'Region IV-A – CALABARZON', 'CALABARZON'],
  [/^MIMAROPA/i, 'mimaropa', 'MIMAROPA Region', 'MIMAROPA'],
  [/^Region V - /i, 'bicol', 'Region V – Bicol Region', 'Bicol'],
  [/^Region VI - /i, 'western-visayas', 'Region VI – Western Visayas', 'Western Visayas'],
  [/^Region VII - /i, 'central-visayas', 'Region VII – Central Visayas', 'Central Visayas'],
  [/^Region VIII - /i, 'eastern-visayas', 'Region VIII – Eastern Visayas', 'Eastern Visayas'],
  [/^Region IX - /i, 'zamboanga-peninsula', 'Region IX – Zamboanga Peninsula', 'Zamboanga Peninsula'],
  [/^Region X - /i, 'northern-mindanao', 'Region X – Northern Mindanao', 'Northern Mindanao'],
  [/^Region XI - /i, 'davao', 'Region XI – Davao Region', 'Davao'],
  [/^Region XII - /i, 'soccsksargen', 'Region XII – SOCCSKSARGEN', 'SOCCSKSARGEN'],
  [/^Region XIII - /i, 'caraga', 'Region XIII – Caraga', 'Caraga'],
  [/^Bangsamoro Autonomous Region/i, 'barmm', 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)', 'BARMM'],
]

export function regionId(label: string): { id: string; name: string; short: string } {
  const t = label.replace(/^\.+/, '').trim()
  const hit = REGIONS.find(([re]) => re.test(t))
  if (!hit) throw new Error(`Unrecognised PSA region "${label}"`)
  return { id: hit[1], name: hit[2], short: hit[3] }
}

/** Comparable form of an industry label across survey rounds ("and", commas and case ignored). */
export function industryKey(label: string): string {
  return label
    .replace(/^\.+/, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && w !== 'and')
    .join(' ')
}

export function industryId(label: string): string {
  const k = industryKey(label)
  if (k === 'all industries') return 'all'
  return k
    .replace(/\bexcept\b.*$/, '')
    .trim()
    .split(' ')
    .slice(0, 5)
    .join('-')
}

const tidy = (label: string) => label.replace(/^\.+/, '').replace(/\s+/g, ' ').trim()
/** OpenSTAT's JSON output is already rounded to PSA's display precision (whole pesos); keep at most centavos. */
const round2 = (n: number) => Math.round(n * 100) / 100

/* ------------------------------ PxWeb helpers ------------------------------ */

async function list(folder: string): Promise<Entry[]> {
  const res = await fetchWithRetry(`${API}/${folder}/`)
  return JSON.parse((await res.text()).replace(/^﻿/, '')) as Entry[]
}

function pick(entries: Entry[], folder: string, re: RegExp): { url: string; entry: Entry } {
  const e = entries.find((x) => x.type === 't' && re.test(x.text.replace(/\s+/g, ' ')))
  if (!e) throw new Error(`No OpenSTAT table in ${folder} matches ${re}`)
  return { url: `${API}/${folder}/${e.id}`, entry: e }
}

type Cell = { labels: Record<string, string>; value: number }

/** Every cell of a table, keyed by variable code → value text. Non-numeric cells ("..", "-", "a") are dropped. */
async function cells(url: string): Promise<{ meta: PxMeta; rows: Cell[] }> {
  const meta = await getMeta(url)
  const data = await query(
    url,
    meta.variables.map((v) => ({ code: v.code, values: v.values })),
  )
  const codes = data.columns.filter((c) => c.type !== 'c').map((c) => c.code)
  const rows: Cell[] = []
  for (const r of data.data) {
    const raw = r.values[0]?.trim()
    if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) continue
    const labels: Record<string, string> = {}
    codes.forEach((code, i) => {
      const v = variable(meta, code)
      labels[code] = v.valueTexts[v.values.indexOf(r.key[i])]
    })
    rows.push({ labels, value: Number(raw) })
  }
  return { meta, rows }
}

function tableRecord(entry: Entry, folder: string, url: string, survey: string): SourceTable {
  return {
    id: entry.id.replace(/\.px$/, ''),
    title: tidy(entry.text),
    path: `PSA OpenSTAT › Labor and Employment › Occupational Wages Survey › ${folder.endsWith('O10') ? 'Establishments employing 10 or more workers' : 'Establishments employing 20 or more workers'}`,
    apiUrl: url,
    updated: (entry.updated ?? nowIso()).slice(0, 10),
    survey,
  }
}

const bothSexes = (c: Cell) => !('Sex' in c.labels) || /^Both Sexes$/i.test(c.labels.Sex.trim())

/* ------------------------------ build ------------------------------ */

export async function fetchSalaryBenchmarks(): Promise<SalaryBenchmarkDataset> {
  const o10 = await list(FOLDERS.o10)
  const o20 = await list(FOLDERS.o20)

  // 2024 round: the reference period is in the titles ("…, Philippines: August 2024").
  const allByRegion = pick(o10, FOLDERS.o10, /^Average Monthly Basic Pay, Allowance, and Wage Rates .* by Region, Philippines: /i)
  const period = allByRegion.entry.text.match(/Philippines:\s*([A-Z][a-z]+ \d{4})\s*$/)?.[1]
  if (!period) throw new Error(`Could not read the reference period from "${allByRegion.entry.text}"`)
  const year = Number(period.slice(-4))
  const s24 = `ows-${year}`

  const sources24 = {
    allRegion: allByRegion,
    allIndustry: pick(o10, FOLDERS.o10, /^Average Monthly Basic Pay, Allowance, and Wage Rates .* by Major Industry Group, Philippines: /i),
    clerksRegion: pick(o10, FOLDERS.o10, /Benchmark Occupation: General Office Clerks by Sex and Region/i),
    clerksIndustry: pick(o10, FOLDERS.o10, /Benchmark Occupation: General Office Clerks by Sex and Major Industry Group/i),
    elemRegion: pick(o10, FOLDERS.o10, /Benchmark Occupation: Elementary Occupations by Sex and Region/i),
    elemIndustry: pick(o10, FOLDERS.o10, /Benchmark Occupation: Elementary Occupations by Sex and Major Industry Group/i),
  }
  const sources22 = {
    occupations: pick(o20, FOLDERS.o20, /^Average Monthly Wage Rates of Benchmark Occupations by Industry/i),
    median: pick(o20, FOLDERS.o20, /^Median Monthly Basic Pay and Allowance of Time-Rate Workers/i),
  }

  const benchmarks: Benchmark[] = []
  const tables: SourceTable[] = []
  const regions = new Map<string, { id: string; name: string; short: string }>()
  const industries = new Map<string, { id: string; name: string }>()
  const majorKeys = new Map<string, string>() // industryKey → id, from the 2024 major groups

  const push = (b: Omit<Benchmark, 'sampleSize'>) => benchmarks.push({ ...b, value: round2(b.value), sampleSize: null })
  const BASIS: Record<string, Benchmark['basis']> = { 'Basic Pay': 'basic-pay', Allowance: 'allowance', 'Wage Rate': 'wage-rate' }

  // All time-rated workers, by region and by industry (basic pay, allowance, wage rate).
  for (const [key, dim] of [['allRegion', 'Region'], ['allIndustry', 'Industry']] as const) {
    const src = sources24[key]
    const { rows } = await cells(src.url)
    const t = tableRecord(src.entry, FOLDERS.o10, src.url, s24)
    tables.push(t)
    for (const c of rows) {
      const basis = BASIS[c.labels.Item?.trim()]
      if (!basis) throw new Error(`Unexpected item "${c.labels.Item}" in ${t.title}`)
      if (dim === 'Region') {
        const r = regionId(c.labels.Region)
        regions.set(r.id, r)
        push({ occupation: 'all-workers', survey: s24, table: t.id, region: r.id, industry: 'all', measure: 'average', basis, value: c.value })
      } else {
        const id = industryId(c.labels.Industry)
        if (id !== 'all') {
          industries.set(id, { id, name: tidy(c.labels.Industry) })
          majorKeys.set(industryKey(c.labels.Industry), id)
        }
        // The national figure already comes from the region table.
        if (id !== 'all') push({ occupation: 'all-workers', survey: s24, table: t.id, region: 'ph', industry: id, measure: 'average', basis, value: c.value })
      }
    }
  }

  // Benchmark occupations, 2024: wage rate by region and by industry, both sexes.
  const occ24: [string, keyof typeof sources24, keyof typeof sources24, string][] = [
    ['general-office-clerks', 'clerksRegion', 'clerksIndustry', 'General Office Clerks'],
    ['elementary-occupations', 'elemRegion', 'elemIndustry', 'Elementary Occupations'],
  ]
  const occupations: { id: string; psaLabel: string }[] = []
  for (const [occ, regKey, indKey, label] of occ24) {
    occupations.push({ id: occ, psaLabel: label })
    for (const key of [regKey, indKey]) {
      const src = sources24[key]
      const { rows } = await cells(src.url)
      const t = tableRecord(src.entry, FOLDERS.o10, src.url, s24)
      tables.push(t)
      for (const c of rows.filter(bothSexes)) {
        if ('Region' in c.labels) {
          push({ occupation: occ, survey: s24, table: t.id, region: regionId(c.labels.Region).id, industry: 'all', measure: 'average', basis: 'wage-rate', value: c.value })
        } else {
          const id = industryId(c.labels.Industry)
          if (id === 'all') continue // same as the national figure in the region table
          if (!industries.has(id)) throw new Error(`Industry "${c.labels.Industry}" in ${t.title} is not a 2024 major group`)
          push({ occupation: occ, survey: s24, table: t.id, region: 'ph', industry: id, measure: 'average', basis: 'wage-rate', value: c.value })
        }
      }
    }
  }

  // 2014–2022 series: keep only the latest round, and only major industry groups that match 2024's.
  let s22 = ''
  const seen = new Set<string>()
  for (const [key, kind] of [['occupations', 'occ'], ['median', 'median']] as const) {
    const src = sources22[key]
    const { meta, rows } = await cells(src.url)
    const latest = Math.max(...variable(meta, 'Year').valueTexts.map(Number))
    s22 = `ows-${latest}`
    const t = tableRecord(src.entry, FOLDERS.o20, src.url, s22)
    tables.push(t)
    for (const c of rows.filter((r) => Number(r.labels.Year) === latest).filter(bothSexes)) {
      const ind = industryKey(c.labels.Industries)
      const id = ind === 'all industries' ? 'all' : majorKeys.get(ind)
      if (!id) continue // detailed sub-industries are not offered in the selector
      // PSA lists some sections twice under near-identical names (section and division); keep the first, the section.
      const seenKey = [kind, c.labels['Benchmark Occupations'] ?? '', c.labels['Basic Pay/Allowance'] ?? '', id].join('|')
      if (seen.has(seenKey)) continue
      seen.add(seenKey)
      if (kind === 'occ') {
        if (!/Accounting and Bookkeeping Clerks/i.test(c.labels['Benchmark Occupations'])) continue
        push({ occupation: 'accounting-bookkeeping-clerks', survey: s22, table: t.id, region: 'ph', industry: id, measure: 'average', basis: 'wage-rate', value: c.value })
      } else {
        const basis = /Basic Pay/i.test(c.labels['Basic Pay/Allowance']) ? 'basic-pay' : 'allowance'
        push({ occupation: 'all-workers', survey: s22, table: t.id, region: 'ph', industry: id, measure: 'median', basis, value: c.value })
      }
    }
  }
  occupations.push({ id: 'accounting-bookkeeping-clerks', psaLabel: 'Accounting and Bookkeeping Clerks' })

  const surveys: SurveyRound[] = [
    {
      id: s24,
      label: `${year} Occupational Wages Survey`,
      referencePeriod: period,
      year,
      coverage: 'Establishments with 10 or more workers in all major industries',
      notes: [
        `The ${year} round covers establishments with 10 or more workers across all major industries; earlier rounds covered only establishments with 20 or more workers in selected industries, so the series has a break and the rounds are not directly comparable.`,
        'Sulu province is counted under BARMM. Provinces of the Negros Island Region are still counted under Regions VI and VII.',
      ],
    },
    {
      id: s22,
      label: `${s22.slice(4)} Occupational Wages Survey`,
      referencePeriod: s22.slice(4),
      year: Number(s22.slice(4)),
      coverage: 'Establishments with 20 or more workers in selected industries',
      notes: ['Earlier survey design: not directly comparable with the 2024 round.'],
    },
  ]

  return {
    source: 'Philippine Statistics Authority (PSA), Occupational Wages Survey, via PSA OpenSTAT',
    sourceUrl: 'https://openstat.psa.gov.ph/',
    retrievedAt: nowIso(),
    status: 'verified',
    population:
      'Time-rated workers on full-time basis in the establishments PSA surveyed. Government agencies, public schools and public hospitals are not covered.',
    definitions: {
      basicPay:
        "Pay for normal working time before employees' SSS, PhilHealth and Pag-IBIG contributions and withholding tax. Excludes overtime, night shift differential and other premium pay, commissions, tips, service charges and payment in kind.",
      allowance:
        'Regular, guaranteed cash payments such as living allowance. Excludes reimbursements for business expenses, uniforms, bonuses and gratuities, and family allowances.',
      wageRate: 'Basic pay plus regular, guaranteed cash allowances.',
      median: 'The amount where half of the workers receive more and half receive less.',
    },
    surveys,
    tables,
    regions: [...regions.values()],
    industries: [...industries.values()],
    occupations,
    benchmarks,
  }
}

/* ------------------------------ run ------------------------------ */

async function main() {
  await runFetcher('Salary benchmarks (PSA OWS)', async () => {
    const next = await fetchSalaryBenchmarks()
    const prev = readJson<SalaryBenchmarkDataset>(OUT)
    // Refuse a much smaller dataset: a partial PSA response should never replace a full one.
    if (prev && next.benchmarks.length < prev.benchmarks.length * 0.8) {
      throw new Error(`Only ${next.benchmarks.length} benchmarks retrieved (previously ${prev.benchmarks.length}); keeping the previous file.`)
    }
    const changed = writeIfChanged(OUT, next, SalaryBenchmarkDataset)
    const rounds = next.surveys.map((s) => `${s.label} (${s.referencePeriod})`).join(', ')
    summary(`- ${changed ? '✅ updated' : '➖ unchanged'} **Salary benchmarks**: ${next.benchmarks.length} figures from ${next.tables.length} PSA tables; ${rounds}.`)
  })
}

if (process.argv[1]?.endsWith('update-salary-data.ts')) {
  await main()
}
