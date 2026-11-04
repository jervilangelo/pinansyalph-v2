/**
 * Check stored bank rates against their official sources.
 *
 * Bank pages are marketing pages, often rendered by script, and they change
 * wording without notice. Scraping a number from them and publishing it
 * automatically would be unreliable, so this job never changes a rate. It:
 *   1. fetches each product's official page or disclosure PDF,
 *   2. checks that the exact evidence text recorded at manual verification
 *      is still present,
 *   3. records the result in `lastCheck`, and sets status to
 *      - "needs-review" when the evidence disappeared (rate may have changed),
 *      - "stale" when the manual verification is older than `freshnessDays`,
 *   4. reports promotions that have ended.
 * A person then re-verifies and updates banks.json by hand.
 */
import { BankDataset, type BankProduct } from '../src/types/data.ts'
import { dataPath, fetchWithRetry, nowIso, readJson, runFetcher, summary, writeIfChanged } from './lib/io.ts'
import { pdfToText } from './lib/pdf-text.ts'

const OUT = dataPath('banks.json')

export function normaliseText(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function evaluateFreshness(p: BankProduct, freshnessDays: number, today: Date): BankProduct['status'] {
  const age = (today.getTime() - Date.parse(p.verifiedOn)) / 86_400_000
  if (p.status === 'needs-review') return 'needs-review'
  return age > freshnessDays ? 'stale' : p.status === 'stale' ? 'verified-manual' : p.status
}

async function sourceText(url: string): Promise<string> {
  const res = await fetchWithRetry(url, {}, 2, 30_000)
  if (/\.pdf($|\?)/i.test(url) || res.headers.get('content-type')?.includes('pdf')) {
    return pdfToText(new Uint8Array(await res.arrayBuffer()))
  }
  return res.text()
}

async function main() {
  await runFetcher('Bank rates', async () => {
    const data = readJson<BankDataset>(OUT)
    if (!data) throw new Error('banks.json missing')
    const today = new Date()
    const cache = new Map<string, Promise<string>>()

    const products: BankProduct[] = []
    for (const p of data.products) {
      let lastCheck: BankProduct['lastCheck']
      let status = p.status
      try {
        if (!cache.has(p.sourceUrl)) cache.set(p.sourceUrl, sourceText(p.sourceUrl))
        const text = normaliseText(await cache.get(p.sourceUrl)!)
        const ok = text.includes(normaliseText(p.evidence))
        lastCheck = {
          at: nowIso(),
          result: ok ? 'match' : 'mismatch',
          note: ok ? 'Evidence text found on the official source.' : `"${p.evidence}" no longer found; rate may have changed.`,
        }
        if (!ok) status = 'needs-review'
      } catch (err) {
        lastCheck = { at: nowIso(), result: 'unreachable', note: (err as Error).message.slice(0, 160) }
      }
      const next = { ...p, status, lastCheck }
      next.status = evaluateFreshness(next, data.freshnessDays, today)
      products.push(next)

      const icon = lastCheck.result === 'match' ? '✅' : lastCheck.result === 'mismatch' ? '❗' : '⚠️'
      summary(`- ${icon} ${p.bank} ${p.product}: ${lastCheck.result} (status ${next.status})`)
      if (p.promo?.endsOn && Date.parse(p.promo.endsOn) < today.getTime()) {
        summary(`  - promo "${p.promo.name}" ended ${p.promo.endsOn}; calculator falls back to the base rate. Update the promo by hand.`)
      }
    }

    // Only lastCheck timestamps differ on a quiet run; do not commit those alone.
    const statusesChanged = products.some((p, i) => p.status !== data.products[i].status)
    if (!statusesChanged) {
      summary('- ➖ **Bank rates**: no status change')
      return
    }
    const changed = writeIfChanged(OUT, { ...data, products, retrievedAt: nowIso() }, BankDataset)
    summary(changed ? '- 📝 **Bank rates**: statuses updated, manual review requested' : '- ➖ **Bank rates**: no change')
  })
}

if (process.argv[1]?.endsWith('fetch-bank-rates.ts')) {
  await main()
}
