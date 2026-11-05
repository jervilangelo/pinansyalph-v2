import type { ReactNode } from 'react'
import { banks, fuel, inflation, latestMp2, mp2 } from '../../data'
import { dateLabel, monthLabel } from '../../utils/format'

import { REPO } from '../../site'

const QA: { q: string; a: ReactNode }[] = [
  {
    q: 'Is the MP2 dividend guaranteed?',
    a: (
      <>
        No. Pag-IBIG declares each year's rate after the year closes, based on its income. The {latestMp2.rate}% figure is the
        rate declared for {latestMp2.year}. The calculator assumes it continues, which may not happen. Past rates have ranged
        from {Math.min(...mp2.rates.map((r) => r.rate))}% to {Math.max(...mp2.rates.map((r) => r.rate))}%.
      </>
    ),
  },
  {
    q: 'How is the MP2 projection calculated?',
    a: (
      <>
        Dividends accrue every month on your balance at the yearly rate ÷ 12, so the yearly dividend equals the rate times
        your average monthly balance. They are credited each December and at maturity, rounded to centavos. Compounded
        dividends earn from the next month; annual payouts are kept as cash. Pag-IBIG's own computation may differ slightly.{' '}
        <a className="link" href={`${REPO}/blob/main/docs/METHODOLOGY.md`}>
          Full methodology
        </a>
      </>
    ),
  },
  {
    q: 'Why is bank interest taxed but MP2 is not?',
    a: (
      <>
        Peso bank deposit interest carries a {banks.tax.ratePct}% final withholding tax under RA 12214 (CMEPA), deducted every
        time interest is credited. MP2 dividends are tax-exempt. That difference is applied in every comparison.
      </>
    ),
  },
  {
    q: 'How is inflation taken out?',
    a: (
      <>
        Real value = nominal value ÷ (1 + inflation)^years, built month by month. Your gain counts each contribution in
        today's pesos at the month you made it, so a deposit made in year five is not treated as if it had been eroded for
        five years.
      </>
    ),
  },
  {
    q: 'Where does the data come from?',
    a: (
      <>
        Inflation: PSA OpenSTAT, latest {monthLabel(inflation.latestPeriod)}, retrieved {dateLabel(inflation.retrievedAt)}.
        Fuel: DOE's weekly Oil Monitor, latest {dateLabel(fuel.adjustments[fuel.adjustments.length - 1].effectiveDate)}. MP2:
        Pag-IBIG's declared rates. Banks: each bank's official page. An automated job checks for new data every day and keeps
        the last good version if a source fails.
      </>
    ),
  },
  {
    q: 'Why is my bank not listed?',
    a: (
      <>
        We only include products whose current terms we could confirm on the bank's own page. Promotional "up to" rates are
        never treated as the base rate. Banks we could not verify are listed under the rate table with the reason.
      </>
    ),
  },
  {
    q: 'Is this financial advice?',
    a: (
      <>
        No. It is an educational calculator. Results are projections from published data and your assumptions, not actual
        earnings. Check the official terms before you save, and consider liquidity and risk, not only the rate.
      </>
    ),
  },
]

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mt-[clamp(96px,10vw,180px)]">
      <div className="wrap">
        <div className="grid gap-y-[clamp(48px,6vw,84px)]">
          <div className="grid md:grid-cols-12">
            <h2 id="faq-title" className="text-[clamp(1.625rem,2.6vw,2.5rem)] leading-[1.1] text-muted md:col-span-6">
              Questions, answered
            </h2>
          </div>
          {QA.map((item) => (
            <div key={item.q} className="grid gap-3 md:grid-cols-12 md:gap-0">
              <h3 className="text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.1] md:col-span-6 md:pr-8">{item.q}</h3>
              <p className="max-w-[44ch] text-[1.0625rem] leading-[1.6] md:col-span-5 md:col-start-8 md:pt-1.5">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
