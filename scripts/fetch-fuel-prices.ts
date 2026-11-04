/**
 * Fetch weekly fuel price adjustments from the DOE "Oil Monitor" PDFs.
 *
 * DOE does not publish a single nationwide pump price, and its prevailing
 * retail price pages are per-area tables. What it does publish every week,
 * consistently, is the Oil Monitor: the pump price adjustment range per fuel
 * and the official year-to-date net change. That is what we store.
 *
 * New PDFs are parsed, cross-checked against the previous week's YTD total,
 * and merged into src/data/fuel.json. Existing history is never rewritten.
 */
import { FuelDataset, type FuelAdjustment } from '../src/types/data.ts'
import { dataPath, fetchWithRetry, nowIso, readJson, runFetcher, summary, writeIfChanged } from './lib/io.ts'
import { crossCheck, parseOilMonitor } from './lib/oil-monitor.ts'
import { pdfToText } from './lib/pdf-text.ts'

const INDEX_URL = 'https://doe.gov.ph/data-and-prices/liquid-fuels/oil-monitor'
const OUT = dataPath('fuel.json')
/** How many PDFs to look at per run. The index lists newest uploads; a full backfill can raise this. */
const MAX_PDFS = Number(process.env.FUEL_MAX_PDFS ?? 20)

export function extractPdfLinks(html: string): string[] {
  const re = /https:\/\/[a-z0-9.-]+\/api\/media\/file\/[^"'\\\s<>]+?\.pdf/gi
  const links = [...new Set(html.match(re) ?? [])]
  return links.filter((l) => /oil[%20 _-]*monitor/i.test(decodeURIComponent(l)))
}

async function main() {
  await runFetcher('Fuel (DOE Oil Monitor)', async () => {
    const previous = readJson<FuelDataset>(OUT)
    const known = new Map((previous?.adjustments ?? []).map((a) => [a.effectiveDate, a]))
    const knownUrls = new Set((previous?.adjustments ?? []).map((a) => a.sourceUrl))

    const html = await (await fetchWithRetry(INDEX_URL)).text()
    const links = extractPdfLinks(html).filter((l) => !knownUrls.has(l)).slice(0, MAX_PDFS)

    const parsedNew: FuelAdjustment[] = []
    for (const url of links) {
      try {
        const bytes = new Uint8Array(await (await fetchWithRetry(url)).arrayBuffer())
        const parsed = parseOilMonitor(await pdfToText(bytes))
        if (known.has(parsed.effectiveDate)) continue // same week re-uploaded under another name
        parsedNew.push({ effectiveDate: parsed.effectiveDate, ...parsed.adjustments, ytdNet: parsed.ytdNet, sourceUrl: url })
      } catch (err) {
        summary(`- ⚠️ Fuel: skipped ${decodeURIComponent(url.split('/').pop() ?? url)} — ${(err as Error).message}`)
      }
    }

    const merged = new Map(known)
    for (const a of parsedNew) if (!merged.has(a.effectiveDate)) merged.set(a.effectiveDate, a)
    const adjustments = [...merged.values()].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    if (!adjustments.length) throw new Error('No Oil Monitor could be parsed')

    // Consistency: each week's YTD change must sit inside its reported range.
    for (let i = 1; i < adjustments.length; i++) {
      const prev = adjustments[i - 1]
      const cur = adjustments[i]
      const sameYear = prev.effectiveDate.slice(0, 4) === cur.effectiveDate.slice(0, 4)
      const days = (Date.parse(cur.effectiveDate) - Date.parse(prev.effectiveDate)) / 86_400_000
      if (!sameYear || days > 8) continue // a missing week makes the check meaningless
      const problems = crossCheck(prev.ytdNet, {
        effectiveDate: cur.effectiveDate,
        adjustments: { gasoline: cur.gasoline, diesel: cur.diesel, kerosene: cur.kerosene },
        ytdNet: cur.ytdNet,
      })
      if (problems.length && parsedNew.some((n) => n.effectiveDate === cur.effectiveDate)) {
        throw new Error(`Week ${cur.effectiveDate} failed YTD cross-check: ${problems.join('; ')}`)
      }
    }

    const next: FuelDataset = {
      source: 'Department of Energy (DOE) — Oil Monitor',
      sourceUrl: INDEX_URL,
      retrievedAt: nowIso(),
      status: 'verified',
      unit: 'PHP per liter',
      coverage:
        'Weekly pump price adjustments implemented by oil companies, as summarised by DOE. Ranges reflect differences between companies. Not a nationwide pump price.',
      adjustments,
      notes: [
        'A price adjustment is a change in pesos per liter, not a price level and not an inflation rate.',
        'Year-to-date net change is the cumulative adjustment DOE reports since the first price movement of the calendar year.',
        'Actual pump prices differ by area, brand and station. See DOE retail pump price tables for prevailing prices by region.',
      ],
    }
    const changed = writeIfChanged(OUT, next, FuelDataset)
    const latest = adjustments[adjustments.length - 1]
    summary(
      changed
        ? `- ✅ **Fuel (DOE)**: ${parsedNew.length} new week(s), latest effective ${latest.effectiveDate}`
        : `- ➖ **Fuel (DOE)**: no change (latest ${latest.effectiveDate})`,
    )
  })
}

if (process.argv[1]?.endsWith('fetch-fuel-prices.ts')) {
  await main()
}
