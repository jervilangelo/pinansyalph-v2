import { AnimatePresence } from 'motion/react'
import { insightFor } from '../../calculators/inflation'
import { MoneyVsInflationChart } from '../../charts/lazy'
import type { ScenarioState } from '../../hooks/useScenario'
import { peso, pesoSigned, pct, pctSigned } from '../../utils/format'
import { AnimatedNumber, Reveal, motion } from '../ui/motion'

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
    <section id="real-value" aria-labelledby="real-title" className="mt-2 px-[var(--gutter)]">
      <div className="bg-paper px-5 py-14 sm:px-8 lg:px-[6%] lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 id="real-title" className="text-step-head">
              Lumago nga ba talaga?
            </h2>
            <p className="mt-5 max-w-[40ch]">
              Did your money really grow? Pesos earned and buying power gained are different numbers. Here is your MP2
              projection, under {s.inflation.label}.
            </p>
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
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35 }}
                      data-ui
                      className={`${t.field} p-6 sm:p-8`}
                    >
                      <p className="ui flex items-center gap-2 text-[0.9375rem] font-semibold">
                        <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${t.mark}`} />
                        {t.word}
                      </p>
                      <p className="mt-3 text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-[1.15] font-medium tracking-[-0.015em]">{insight.title}</p>
                      <p className="mt-3 max-w-[56ch]">{insight.body}</p>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
            </div>
          )}
        </div>

        {!r.ok ? (
          <p role="alert" className="ui mt-10 bg-loss-soft p-5 text-loss">
            {r.error}
          </p>
        ) : (
          <>
            <div className="mt-14">
              <MoneyVsInflationChart result={r.value} />
            </div>

            <dl data-ui className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-3">
              <div>
                <dt className="ui text-[0.9375rem] font-semibold">Nominal peso earnings</dt>
                <dd className="m-0 mt-2 tabular text-[2.5rem] leading-none font-medium tracking-[-0.02em]">
                  <AnimatedNumber value={r.value.real.nominalGain.toNumber()} format={(n) => pesoSigned(n)} />
                </dd>
                <p className="mt-3 text-[1rem] leading-relaxed">
                  {peso(r.value.real.nominalEnding)} at the end minus the {peso(r.value.totalContributed)} you put in. This is
                  what a statement would show.
                </p>
              </div>
              <div>
                <dt className="ui text-[0.9375rem] font-semibold">What the final amount buys today</dt>
                <dd className="m-0 mt-2 tabular text-[2.5rem] leading-none font-medium tracking-[-0.02em]">
                  <AnimatedNumber value={r.value.real.realEnding.toNumber()} format={peso} />
                </dd>
                <p className="mt-3 text-[1rem] leading-relaxed">
                  Prices rise {pct(r.value.real.cumulativeInflationPct)} over {s.scenario.years} years under this assumption, so{' '}
                  {peso(r.value.real.nominalEnding)} then buys what {peso(r.value.real.realEnding)} buys now.
                </p>
              </div>
              <div>
                <dt className="ui text-[0.9375rem] font-semibold">Inflation-adjusted gain</dt>
                <dd className={`m-0 mt-2 tabular text-[2.5rem] leading-none font-medium tracking-[-0.02em] ${r.value.real.realGain.gte(0) ? 'text-gain' : 'text-loss'}`}>
                  <AnimatedNumber value={r.value.real.realGain.toNumber()} format={(n) => pesoSigned(n)} />
                </dd>
                <p className="mt-3 text-[1rem] leading-relaxed">
                  Each contribution is valued in today's pesos at the month you made it, so later deposits are not unfairly
                  compared with earlier ones.
                  {r.value.real.realAnnualReturnPct != null && ` Real return: about ${pctSigned(r.value.real.realAnnualReturnPct)} a year.`}
                </p>
              </div>
            </dl>
          </>
        )}
      </div>
    </section>
  )
}
