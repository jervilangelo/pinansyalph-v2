/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import type { ReactNode } from 'react'
import { banks, fuel, inflation, latestMp2, mp2 } from '../../data'
import { dateLabel, monthLabel } from '../../utils/format'

import { REPO } from '../../site'
import { Disclosure } from '../ui/Disclosure'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const QA: { q: string; a: ReactNode }[] = [
  {
    q: 'Is the MP2 dividend guaranteed?',
    a: (
      <>{tx("No. Pag-IBIG declares each year's rate after the year closes, based on its income. The {rate}% figure is the rate declared for {year}. The calculator assumes it continues, which may not happen. Past rates have ranged from {v2}% to {v3}%.", { rate: (latestMp2.rate), year: (latestMp2.year), v2: (Math.min(...mp2.rates.map((r) => r.rate))), v3: (Math.max(...mp2.rates.map((r) => r.rate))), })}</>
    ),
  },
  {
    q: 'How is the MP2 projection calculated?',
    a: (
      <>{tx("Dividends accrue every month on your balance at the yearly rate ÷ 12, so the yearly dividend equals the rate times your average monthly balance. They are credited each December and at maturity, rounded to centavos. Compounded dividends earn from the next month; annual payouts are kept as cash. Pag-IBIG's own computation may differ slightly. {link}", { link: (<a className="link" href={`${REPO}/blob/main/docs/METHODOLOGY.md`}>{t("Full methodology")}</a>), })}</>
    ),
  },
  {
    q: 'Why is bank interest taxed but MP2 is not?',
    a: (
      <>{tx("Peso bank deposit interest carries a {ratePct}% final withholding tax under RA 12214 (CMEPA), deducted every time interest is credited. MP2 dividends are tax-exempt. That difference is applied in every comparison.", { ratePct: (banks.tax.ratePct), })}</>
    ),
  },
  {
    q: 'How is inflation taken out?',
    a: (
      <>{t("Real value = nominal value ÷ (1 + inflation)^years, built month by month. Your gain counts each contribution in today's pesos at the month you made it, so a deposit made in year five is not treated as if it had been eroded for five years.")}</>
    ),
  },
  {
    q: 'Where does the data come from?',
    a: (
      <>{tx("Inflation: PSA OpenSTAT, latest {latestPeriod}, retrieved {retrievedAt}. Fuel: DOE's weekly Oil Monitor, latest {effectiveDate}. MP2: Pag-IBIG's declared rates. Banks: each bank's official page. An automated job checks for new data every day and keeps the last good version if a source fails.", { latestPeriod: (monthLabel(inflation.latestPeriod)), retrievedAt: (dateLabel(inflation.retrievedAt)), effectiveDate: (dateLabel(fuel.adjustments[fuel.adjustments.length - 1].effectiveDate)), })}</>
    ),
  },
  {
    q: 'Why is my bank not listed?',
    a: (
      <>{t("We only include products whose current terms we could confirm on the bank's own page. Promotional \"up to\" rates are never treated as the base rate. Banks we could not verify are listed under the rate table with the reason.")}</>
    ),
  },
  {
    q: 'Is this financial advice?',
    a: (
      <>{t("No. It is an educational calculator. Results are projections from published data and your assumptions, not actual earnings. Check the official terms before you save, and consider liquidity and risk, not only the rate.")}</>
    ),
  },
]

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="wrap mt-[clamp(80px,9vw,140px)] scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="faq-title" className="text-step-head">{t("Questions, answered")}</h2>
          <p className="mt-4 max-w-[34ch] text-ink-2">{t("How the numbers are made, and what they can and cannot tell you.")}</p>
        </div>
        <div className="grid gap-2 lg:col-span-8">
          {QA.map((item, i) => (
            <Disclosure key={item.q} title={tv(item.q)} defaultOpen={i === 0} headingLevel={3}>
              <p className="max-w-[62ch] text-[1.0625rem] leading-[1.65] text-ink-2">{tv(item.a)}</p>
            </Disclosure>
          ))}
        </div>
      </div>
    </section>
  )
}
