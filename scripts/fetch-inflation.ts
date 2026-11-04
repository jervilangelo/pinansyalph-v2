/**
 * Fetch Philippine inflation from PSA OpenSTAT (PxWeb API) and store it in
 * src/data/inflation.json.
 *
 * Tables are discovered by title inside the 2018-based (new geographic code)
 * CPI folder, so a renamed "January 2019 - <latest month>" title does not
 * break the job. If PSA restructures the folder, discovery fails loudly and
 * the previous dataset is kept.
 */
import { InflationDataset, type MonthlyObservation } from '../src/types/data.ts'
import { dataPath, fetchWithRetry, nowIso, readJson, runFetcher, summary, writeIfChanged } from './lib/io.ts'
import { findValue, getMeta, periodKey, query, toPeriodValues, variable, type PeriodValue } from './lib/pxweb.ts'
import { validateMonthlySeries } from './lib/validate.ts'

const FOLDER = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2M/PI/CPI/2018NEW'
const OUT = dataPath('inflation.json')

interface TableEntry {
  id: string
  type: string
  text: string
}

async function discover(): Promise<{ yoy: string; coreYoy: string; ppp: string }> {
  const res = await fetchWithRetry(`${FOLDER}/`)
  const list = JSON.parse((await res.text()).replace(/^﻿/, '')) as TableEntry[]
  const pick = (re: RegExp) => {
    const t = list.find((x) => x.type === 't' && re.test(x.text) && !/Backcasted/i.test(x.text))
    if (!t) throw new Error(`PSA table matching ${re} not found in ${FOLDER}`)
    return `${FOLDER}/${t.id}`
  }
  return {
    yoy: pick(/^Year-on-Year Changes of the Consumer Price Index in Percent by Commodity Group/i),
    coreYoy: pick(/^Year-on-Year Changes of the Core Consumer Price Index in Percent by Commodity Group/i),
    ppp: pick(/^Purchasing Power of Peso/i),
  }
}

function allValues(meta: Awaited<ReturnType<typeof getMeta>>, code: string): string[] {
  return variable(meta, code).values
}

function monthly(rows: PeriodValue[], seriesCode: string): MonthlyObservation[] {
  return rows
    .filter((r) => r.seriesCode === seriesCode && r.month > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((r) => ({ period: periodKey(r.year, r.month), value: r.value }))
}

export async function fetchInflation(): Promise<InflationDataset> {
  const tables = await discover()

  // Headline, food and transport come from the all-items YoY table.
  const yoyMeta = await getMeta(tables.yoy)
  const geo = findValue(yoyMeta, 'Geolocation', (t) => t === 'PHILIPPINES')
  const allItems = findValue(yoyMeta, 'Commodity Description', (t) => /^0 - ALL ITEMS$/i.test(t))
  const food = findValue(yoyMeta, 'Commodity Description', (t) => /^01\.1 - FOOD$/i.test(t))
  const transport = findValue(yoyMeta, 'Commodity Description', (t) => /^07 - TRANSPORT$/i.test(t))
  const yoyData = await query(tables.yoy, [
    { code: 'Geolocation', values: [geo] },
    { code: 'Commodity Description', values: [allItems, food, transport] },
    { code: 'Year', values: allValues(yoyMeta, 'Year') },
    { code: 'Period', values: allValues(yoyMeta, 'Period') },
  ])
  const yoyRows = toPeriodValues(yoyMeta, yoyData, 'Commodity Description')

  // Core inflation lives in its own table.
  const coreMeta = await getMeta(tables.coreYoy)
  const coreGeo = findValue(coreMeta, 'Geolocation', (t) => t === 'PHILIPPINES')
  const coreAll = findValue(coreMeta, 'Commodity Description', (t) => /^0 - ALL ITEMS$/i.test(t))
  const coreData = await query(tables.coreYoy, [
    { code: 'Geolocation', values: [coreGeo] },
    { code: 'Commodity Description', values: [coreAll] },
    { code: 'Year', values: allValues(coreMeta, 'Year') },
    { code: 'Period', values: allValues(coreMeta, 'Period') },
  ])
  const coreRows = toPeriodValues(coreMeta, coreData, 'Commodity Description')

  // Purchasing power of the peso (2018 = 1.00).
  const pppMeta = await getMeta(tables.ppp)
  const pppGeo = findValue(pppMeta, 'Geolocation', (t) => t === 'PHILIPPINES')
  const pppDesc = variable(pppMeta, 'Description').values
  const pppData = await query(tables.ppp, [
    { code: 'Geolocation', values: [pppGeo] },
    { code: 'Description', values: pppDesc },
    { code: 'Year', values: allValues(pppMeta, 'Year') },
    { code: 'Period', values: allValues(pppMeta, 'Period') },
  ])
  const pppRows = toPeriodValues(pppMeta, pppData, 'Description')

  const series = {
    headline: monthly(yoyRows, allItems),
    core: monthly(coreRows, coreAll),
    food: monthly(yoyRows, food),
    transport: monthly(yoyRows, transport),
  }
  for (const [k, s] of Object.entries(series)) validateMonthlySeries(k, s)

  // The latest period is the newest month that every series has published.
  const latestPeriod = Object.values(series)
    .map((s) => s[s.length - 1].period)
    .sort()[0]

  // Annual averages: only years PSA has closed (all 12 months published).
  const annualHeadline = yoyRows
    .filter((r) => r.seriesCode === allItems && r.month === 0)
    .filter((r) => series.headline.filter((o) => o.period.startsWith(`${r.year}-`)).length === 12)
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ year: r.year, value: r.value }))

  const purchasingPower = pppRows
    .filter((r) => r.month > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((r) => ({ period: periodKey(r.year, r.month), value: r.value }))

  return {
    source: 'Philippine Statistics Authority (PSA) — OpenSTAT',
    sourceUrl: 'https://openstat.psa.gov.ph/',
    retrievedAt: nowIso(),
    status: 'verified',
    unit: 'percent, year-on-year',
    baseYear: 2018,
    latestPeriod,
    series,
    annualHeadline,
    purchasingPower,
    tables: {
      yoy: tables.yoy,
      coreYoy: tables.coreYoy,
      purchasingPower: tables.ppp,
    },
    notes: [
      'Headline, food (01.1) and transport (07) are year-on-year changes of the 2018-based CPI for all income households, Philippines.',
      'Core inflation excludes selected food and energy items (PSA definition).',
      'Reference month is the statistical period, not the date this file was retrieved.',
    ],
  }
}

async function main() {
  await runFetcher('Inflation (PSA)', async () => {
    const previous = readJson<InflationDataset>(OUT)
    const next = await fetchInflation()
    if (previous && next.latestPeriod < previous.latestPeriod) {
      throw new Error(`PSA returned ${next.latestPeriod}, older than stored ${previous.latestPeriod}`)
    }
    const changed = writeIfChanged(OUT, next, InflationDataset)
    summary(
      changed
        ? `- ✅ **Inflation (PSA)**: updated, latest reference month ${next.latestPeriod}`
        : `- ➖ **Inflation (PSA)**: no change (latest ${next.latestPeriod})`,
    )
  })
}

if (process.argv[1]?.endsWith('fetch-inflation.ts')) {
  await main()
}
