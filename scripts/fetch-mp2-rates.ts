/**
 * MP2 dividend rate watch.
 *
 * Pag-IBIG declares the previous year's MP2 dividend once a year (usually
 * February or March) in a press release. pagibigfund.gov.ph sits behind a
 * browser challenge, so there is no reliable machine-readable source. This
 * job therefore does not publish rates. It:
 *   - tries the official MP2 page and reports whether it is reachable;
 *   - flags when the previous year's rate is expected but not yet recorded,
 *     so a maintainer can add it to src/data/mp2.json from the official
 *     declaration.
 */
import { Mp2Dataset } from '../src/types/data.ts'
import { dataPath, fetchWithRetry, readJson, runFetcher, summary } from './lib/io.ts'

const OUT = dataPath('mp2.json')

/** The rate for year Y is normally declared by the end of March of Y+1. */
export function expectedLatestYear(today: Date): number {
  const y = today.getUTCFullYear()
  return today.getUTCMonth() >= 3 ? y - 1 : y - 2
}

async function main() {
  await runFetcher('MP2 rates', async () => {
    const data = readJson<Mp2Dataset>(OUT)
    const parsed = Mp2Dataset.safeParse(data)
    if (!parsed.success) throw new Error(`mp2.json invalid: ${parsed.error.message}`)
    const latest = Math.max(...parsed.data.rates.map((r) => r.year))
    const expected = expectedLatestYear(new Date())

    if (latest < expected) {
      summary(`- ❗ **MP2**: ${expected} dividend rate is due but not recorded. Add it from the Pag-IBIG declaration.`)
    } else {
      summary(`- ✅ **MP2**: latest declared rate recorded (${latest}: ${parsed.data.rates.find((r) => r.year === latest)?.rate}%)`)
    }

    try {
      const html = await (await fetchWithRetry('https://www.pagibigfund.gov.ph/mp2.html', {}, 1, 20_000)).text()
      const challenged = /checking your browser|recaptcha|captcha/i.test(html)
      summary(`  - official page ${challenged ? 'is behind a browser challenge (manual check required)' : 'reachable'}`)
    } catch (err) {
      summary(`  - official page unreachable: ${(err as Error).message}`)
    }
  })
}

if (process.argv[1]?.endsWith('fetch-mp2-rates.ts')) {
  await main()
}
