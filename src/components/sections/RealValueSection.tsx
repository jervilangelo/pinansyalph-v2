import { AnimatePresence } from 'motion/react'
import { insightFor } from '../../calculators/inflation'
import { MoneyVsInflationChart } from '../../charts/lazy'
import type { ScenarioState } from '../../hooks/useScenario'
import { peso, pesoSigned, pct, pctSigned } from '../../utils/format'
import { Disclosure } from '../ui/Disclosure'
import { AnimatedNumber, Reveal, motion } from '../ui/motion'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const TONE = {
  positive: { field: 'bg-gain-soft', mark: 'bg-gain', word: 'Ahead of inflation' },
  negative: { field: 'bg-loss-soft', mark: 'bg-loss', word: 'Behind inflation' },
  neutral: { field: 'bg-surface', mark: 'bg-muted', word: 'About even' },
}

/**
 * "Lumago nga ba talaga?" — the difference between growing in pesos and
 * growing in what those pesos can buy. Reads the MP2 scenario.
 */
export function RealValueSection({ s }: { s: ScenarioState }) {
  const r = s.mp2Result
  return (
    <section id="real-value" aria-labelledby="real-title" className="wrap mt-[clamp(80px,9vw,140px)]">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <Reveal className="lg:col-span-5">
          <h2 id="real-title" className="text-step-head">{t("Lumago nga ba talaga?")}</h2>
          <p className="mt-4 max-w-[42ch] text-step-lead leading-snug text-ink-2">{tx("Did your money really grow? Pesos earned and buying power gained are different numbers. Here is your MP2 plan, under {label}.", { label: (tv(s.inflation.label)), })}</p>
        </Reveal>

        {r.ok && (
          <div className="lg:col-span-7" aria-live="polite">
            <AnimatePresence mode="wait">
              {(() => {
                const insight = insightFor(r.value.real, s.inflation.label)
                const t = TONE[insight.tone]
                return (
                  <motion.div
                    key={insight.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    data-ui
                    className={`${t.field} rounded-[28px] p-6 sm:p-8`}
                  >
                    <p className="ui flex items-center gap-2 text-[0.9375rem] font-semibold">
                      <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${t.mark}`} />
                      {tv(t.word)}
                    </p>
                    <p className="serif mt-3 text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] leading-[1.15] tracking-[-0.015em]">{tv(insight.title)}</p>
                    <p className="mt-3 max-w-[56ch] text-ink-2">{tv(insight.body)}</p>
                  </motion.div>
                )
              })()}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!r.ok ? (
        <p role="alert" className="ui mt-10 rounded-[22px] bg-loss-soft p-5 text-loss">
          {tv(r.error)}
        </p>
      ) : (
        <>
          <dl data-ui className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="card p-6 sm:p-7">
              <dt className="ui text-[0.9375rem] font-semibold">{t("Peso earnings")}</dt>
              <dd className="figure m-0 mt-3 text-[2.25rem] leading-none">
                <AnimatedNumber value={r.value.real.nominalGain.toNumber()} format={(n) => pesoSigned(n)} />
              </dd>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{tx("{nominalEnding} at the end minus the {totalContributed} you put in. What a statement would show.", { nominalEnding: (peso(r.value.real.nominalEnding)), totalContributed: (peso(r.value.totalContributed)), })}</p>
            </div>
            <div className="card p-6 sm:p-7">
              <dt className="ui text-[0.9375rem] font-semibold">{t("What it buys today")}</dt>
              <dd className="figure m-0 mt-3 text-[2.25rem] leading-none">
                <AnimatedNumber value={r.value.real.realEnding.toNumber()} format={peso} />
              </dd>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{tx("Prices rise {cumulativeInflationPct} over {years} years under this assumption, so {nominalEnding} then buys what {realEnding} buys now.", { cumulativeInflationPct: (pct(r.value.real.cumulativeInflationPct)), years: (s.scenario.years), nominalEnding: (peso(r.value.real.nominalEnding)), realEnding: (peso(r.value.real.realEnding)), })}</p>
            </div>
            <div className="card p-6 sm:p-7">
              <dt className="ui text-[0.9375rem] font-semibold">{t("Inflation-adjusted gain")}</dt>
              <dd className={`figure m-0 mt-3 text-[2.25rem] leading-none ${r.value.real.realGain.gte(0) ? 'text-gain' : 'text-loss'}`}>
                <AnimatedNumber value={r.value.real.realGain.toNumber()} format={(n) => pesoSigned(n)} />
              </dd>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{tx("Each contribution is valued in today's pesos at the month you made it.{v0}", { v0: (r.value.real.realAnnualReturnPct != null && t(" Real return: about {realAnnualReturnPct} a year.", { realAnnualReturnPct: pctSigned(r.value.real.realAnnualReturnPct) })), })}</p>
            </div>
          </dl>
          <div className="mt-4">
            <Disclosure title={t("Pesos vs buying power, year by year")} size="lg" headingLevel={3} defaultOpen>
              <MoneyVsInflationChart result={r.value} />
            </Disclosure>
          </div>
        </>
      )}
    </section>
  )
}
