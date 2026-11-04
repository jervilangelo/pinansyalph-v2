import { describe, expect, it } from 'vitest'
import { crossCheck, parseOilMonitor } from '../lib/oil-monitor'
import { toPeriodValues, type PxData, type PxMeta } from '../lib/pxweb'
import { validateMonthlySeries } from '../lib/validate'
import { extractPdfLinks } from '../fetch-fuel-prices'
import { evaluateFreshness, normaliseText } from '../fetch-bank-rates'
import { expectedLatestYear } from '../fetch-mp2-rates'
import type { BankProduct } from '../../src/types/data'

// Text as extracted from real DOE Oil Monitor PDFs (2026), including the
// symbol-font bullets and the inconsistent spacing they come with.
const OCT_27 = `OIL MONITOR
As of 27 October 2026
DOMESTIC OIL PRICES
Oil companies implemented price adjustments effective 27 October through 02 November 2026.
Domestic pump prices increased by:
  Php 1.20/L for diesel, and
  Php 0.50/L for kerosene
Meanwhile, domestic pump prices for gasoline decreased by Php 0.30/L.
The 43rd price movement this year resulted in a total net increase of:
  P68.55/liter for gasoline,
  P65.63/liter for diesel, and
  P63.26/liter for kerosene
For the updated prevailing retail pump prices, please refer to this link:`

const OCT_20 = `As of 20 October 2026
DOMESTIC OIL PRICES
Domestic pump prices decreased by:
 Php 4.30/L for gasoline, and
 Php 1.00/L for kerosene
Meanwhile, domestic pump prices for diesel increased by Php 2.60/L.
The 42nd price movement this year resulted in a total net increase of:
 P68.85/liter for gasoline,
 P64.43/liter for diesel, and
 P62.76/liter for kerosene
For the updated prevailing`

const SEP_29 = `As of 29 September 2026
DOMESTIC OIL PRICES
Domestic pump prices decreased by:
 Php 0.24/L to Php 0.50L/ for gasoline,
 Php 7.55/L to Php 8.00/L for diesel, and
 Php 5.85/LPhp 5.90/L for kerosene
The 39th price movement this year resulted in a total net increase of:
 P69.66/liter for gasoline,
 P66.13/liter for diesel, and
 P58.69/liter for kerosene
For the updated`

const JUL_28 = `As of 28 July 2026
DOMESTIC OIL PRICES
Domestic pump prices increased by Php6.80/L for gasoline, Php7.30 – Php7.32/L for diesel, and
1 Asia-Pacific Weekly Recap July 24, 2026, by S&P Global Energy; Reuters, Bloomberg, etc.
Php4.20 - Php 4.22/L for kerosene.
The 30th price movement this year resulted in a total net increase of:
 P56.72/liter for gasoline
 P57.75/liter for diesel
 P52.61/liter for kerosene
For the updated`

describe('DOE Oil Monitor parser', () => {
  it('reads mixed increase/decrease weeks with the fuel named first', () => {
    const r = parseOilMonitor(OCT_27)
    expect(r.effectiveDate).toBe('2026-10-27')
    expect(r.adjustments).toEqual({
      gasoline: { min: -0.3, max: -0.3 },
      diesel: { min: 1.2, max: 1.2 },
      kerosene: { min: 0.5, max: 0.5 },
    })
    expect(r.ytdNet).toEqual({ gasoline: 68.55, diesel: 65.63, kerosene: 63.26 })
  })

  it('reads ranges, including glued and misplaced unit markers', () => {
    const r = parseOilMonitor(SEP_29)
    expect(r.adjustments.gasoline).toEqual({ min: -0.5, max: -0.24 })
    expect(r.adjustments.diesel).toEqual({ min: -8, max: -7.55 })
    expect(r.adjustments.kerosene).toEqual({ min: -5.9, max: -5.85 })
  })

  it('handles inline sentences, en dashes and interrupting footnotes', () => {
    const r = parseOilMonitor(JUL_28)
    expect(r.adjustments.gasoline).toEqual({ min: 6.8, max: 6.8 })
    expect(r.adjustments.diesel).toEqual({ min: 7.3, max: 7.32 })
    expect(r.adjustments.kerosene).toEqual({ min: 4.2, max: 4.22 })
  })

  it('throws instead of guessing when a fuel is missing', () => {
    expect(() => parseOilMonitor(OCT_27.replace('Php 0.50/L for kerosene', ''))).toThrow(/kerosene/)
    expect(() => parseOilMonitor('nothing here')).toThrow()
  })

  it('treats explicit "no change" wording as zero', () => {
    const text = OCT_27.replace('  Php 0.50/L for kerosene', '').replace('Meanwhile,', 'Kerosene prices were unchanged. Meanwhile,')
    expect(parseOilMonitor(text).adjustments.kerosene).toEqual({ min: 0, max: 0 })
  })

  it('cross-checks consecutive weeks against the official YTD totals', () => {
    const prev = parseOilMonitor(OCT_20)
    const cur = parseOilMonitor(OCT_27)
    expect(crossCheck(prev.ytdNet, cur)).toEqual([])
    const tampered = { ...cur, adjustments: { ...cur.adjustments, diesel: { min: 5, max: 5 } } }
    expect(crossCheck(prev.ytdNet, tampered)[0]).toMatch(/diesel/)
  })

  it('extracts only Oil Monitor PDF links from the DOE index page', () => {
    const html = `<a href="https://d24qbtp4vooyzi.cloudfront.net/api/media/file/Oil%20Monitor%2027%20October.pdf">x</a>
      <a href="https://d24qbtp4vooyzi.cloudfront.net/api/media/file/Other%20Report.pdf">y</a>
      "https://d24qbtp4vooyzi.cloudfront.net/api/media/file/Oil%20Monitor%2027%20October.pdf"`
    expect(extractPdfLinks(html)).toEqual(['https://d24qbtp4vooyzi.cloudfront.net/api/media/file/Oil%20Monitor%2027%20October.pdf'])
  })
})

describe('PSA PxWeb parsing', () => {
  const meta: PxMeta = {
    title: 'YoY',
    variables: [
      { code: 'Commodity Description', text: '', values: ['0'], valueTexts: ['0 - ALL ITEMS'] },
      { code: 'Year', text: '', values: ['6', '7'], valueTexts: ['2025', '2026'] },
      { code: 'Period', text: '', values: ['0', '8', '12'], valueTexts: ['Jan', 'Sep', 'Ave'] },
    ],
  }
  const data: PxData = {
    columns: [
      { code: 'Commodity Description', text: '', type: 'd' },
      { code: 'Year', text: '', type: 't' },
      { code: 'Period', text: '', type: 'd' },
    ],
    data: [
      { key: ['0', '6', '0'], values: ['2.9'] },
      { key: ['0', '6', '12'], values: ['1.7'] },
      { key: ['0', '7', '8'], values: ['7.2'] },
      { key: ['0', '7', '12'], values: ['..'] },
    ],
  }

  it('maps keys to years and months and drops missing values', () => {
    expect(toPeriodValues(meta, data, 'Commodity Description')).toEqual([
      { seriesCode: '0', year: 2025, month: 1, value: 2.9 },
      { seriesCode: '0', year: 2025, month: 0, value: 1.7 },
      { seriesCode: '0', year: 2026, month: 9, value: 7.2 },
    ])
  })

  it('rejects series with gaps, future months or stale data', () => {
    const months = (start: number, n: number) =>
      Array.from({ length: n }, (_, i) => {
        const m = start + i
        return { period: `${2025 + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`, value: 1 }
      })
    const now = new Date('2026-11-05T00:00:00Z')
    expect(() => validateMonthlySeries('ok', months(0, 21), { now })).not.toThrow() // Jan 2025–Sep 2026
    const gap = months(0, 21)
    gap.splice(5, 1)
    expect(() => validateMonthlySeries('gap', gap, { now })).toThrow(/gap/)
    expect(() => validateMonthlySeries('future', months(0, 24), { now })).toThrow(/future/)
    expect(() => validateMonthlySeries('stale', months(0, 12), { now })).toThrow(/older/)
    expect(() => validateMonthlySeries('short', months(0, 5), { now })).toThrow(/observations/)
  })
})

describe('bank rate checks', () => {
  it('normalises HTML so evidence text matches across markup', () => {
    expect(normaliseText('<td>3.25%&nbsp;<b>p.a.</b></td>')).toContain('3.25% p.a.')
  })

  it('marks products stale after the freshness window but never un-flags a review', () => {
    const p = { verifiedOn: '2026-09-01', status: 'verified-manual' } as BankProduct
    expect(evaluateFreshness(p, 45, new Date('2026-10-01'))).toBe('verified-manual')
    expect(evaluateFreshness(p, 45, new Date('2026-11-04'))).toBe('stale')
    expect(evaluateFreshness({ ...p, status: 'needs-review' }, 45, new Date('2026-09-02'))).toBe('needs-review')
  })
})

describe('MP2 declaration watch', () => {
  it('expects last year\'s rate from April onward', () => {
    expect(expectedLatestYear(new Date('2026-03-15T00:00:00Z'))).toBe(2024)
    expect(expectedLatestYear(new Date('2026-04-01T00:00:00Z'))).toBe(2025)
  })
})
