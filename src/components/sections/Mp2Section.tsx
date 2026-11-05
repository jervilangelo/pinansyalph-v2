import { useState } from 'react'
import { MP2_TERM_YEARS } from '../../calculators/mp2'
import { latestMp2, mp2 } from '../../data'
import { MP2_AVERAGE_YEARS, inflationChoices, resolveMp2Rate, type InflationMode, type ScenarioState } from '../../hooks/useScenario'
import { MONTH_NAMES, peso, pesoExact, pesoSigned, pct } from '../../utils/format'
import { AmountField, NumberField, Segmented, SelectField } from '../ui/fields'
import { AnimatedNumber, Reveal, motion } from '../ui/motion'
import { StatusTag } from '../ui/Status'
import { Link } from '../../router'

export function InflationControl({ s }: { s: ScenarioState }) {
  const choices = inflationChoices()
  return (
    <div className="grid gap-3">
      <SelectField<InflationMode>
        label="Inflation assumption"
        value={s.scenario.inflationMode}
        onChange={(v) => s.setScenario((x) => ({ ...x, inflationMode: v }))}
        options={choices.map((c) => ({ value: c.value, label: c.label }))}
        hint="Applied to every year of the projection. Future inflation is unknown."
      />
      {s.scenario.inflationMode === 'custom' && (
        <NumberField
          label="Your inflation estimate"
          suffix="% a year"
          min={-5}
          max={50}
          step={0.1}
          value={s.scenario.customInflation}
          onChange={(v) => s.setScenario((x) => ({ ...x, customInflation: v }))}
        />
      )}
    </div>
  )
}

export function Figure({ label, value, note, tone, big = false }: { label: string; value: number; note?: string; tone?: 'gain' | 'loss'; big?: boolean }) {
  const color = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : ''
  return (
    <div className={`flex flex-col-reverse justify-end ${big ? 'col-span-2' : ''}`}>
      <dt className="ui mt-1.5 text-[0.9375rem] font-medium text-ink-2">
        {label}
        {note && <span className="mt-0.5 block text-[0.875rem] font-normal text-muted">{note}</span>}
      </dt>
      <dd className={`m-0 tabular font-medium tracking-[-0.02em] ${big ? 'text-[clamp(2.5rem,4.6vw,4rem)] leading-none' : 'text-[1.75rem] leading-tight'} ${color}`}>
        <AnimatedNumber value={value} format={tone ? (n) => pesoSigned(n) : peso} />
      </dd>
    </div>
  )
}

export function Mp2Section({ s }: { s: ScenarioState }) {
  const [advanced, setAdvanced] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const o = s.mp2Opts
  const set = (patch: Partial<typeof o>) => s.setMp2Opts((x) => ({ ...x, ...patch }))
  const rate = resolveMp2Rate(o)
  const r = s.mp2Result

  return (
    <section id="mp2" aria-labelledby="mp2-title" className="pt-[clamp(24px,4vw,56px)] px-[var(--gutter)]">
      <div className="grid gap-0 lg:grid-cols-2">
        {/* Input field */}
        <div className="on-dark bg-night px-5 py-10 text-night-ink sm:px-8 lg:min-h-[90svh] lg:px-[8%] lg:py-16">
          <Reveal>
            <h1 id="mp2-title" className="text-step-head">
              Pag-IBIG MP2 calculator
            </h1>
            <p className="mt-4 max-w-[46ch] text-night-muted">
              MP2 is Pag-IBIG's voluntary savings with a {mp2.program.maturityYears}-year term and tax-free dividends. Enter what
              you plan to save.
            </p>
          </Reveal>

          <form className="mt-10 grid max-w-[34rem] gap-6" onSubmit={(e) => e.preventDefault()} aria-describedby="mp2-note">
            <AmountField
              label="Monthly contribution"
              value={s.scenario.monthly}
              onChange={(v) => s.setScenario((x) => ({ ...x, monthly: v }))}
              hint={s.scenario.monthly > 0 && s.scenario.monthly < mp2.program.minimumRemittance ? `Pag-IBIG's minimum per remittance is ₱${mp2.program.minimumRemittance}.` : undefined}
            />
            <AmountField label="Initial investment" value={s.scenario.initial} onChange={(v) => s.setScenario((x) => ({ ...x, initial: v }))} />

            <div className="ui">
              <label htmlFor="years" className="mb-2 flex items-baseline justify-between text-[0.9375rem] font-medium">
                <span>Duration</span>
                <span className="tabular text-[1.0625rem]">
                  {s.scenario.years} {s.scenario.years === 1 ? 'year' : 'years'}
                </span>
              </label>
              <input
                id="years"
                type="range"
                min={1}
                max={30}
                value={s.scenario.years}
                onChange={(e) => s.setScenario((x) => ({ ...x, years: Number(e.target.value) }))}
                className="h-11 w-full"
                aria-describedby="years-note"
              />
              <p id="years-note" className="mt-1 text-sm text-night-muted">
                {s.scenario.years === MP2_TERM_YEARS
                  ? 'The standard MP2 term.'
                  : s.scenario.years > MP2_TERM_YEARS
                    ? `Hypothetical: assumes you renew into a new MP2 term after ${MP2_TERM_YEARS} years.`
                    : `Shorter than the ${MP2_TERM_YEARS}-year term. Early withdrawal is only allowed for specific reasons and forfeits ${mp2.program.earlyWithdrawalDividendForfeiturePct}% of dividends; this projection does not apply that.`}
              </p>
            </div>

            <Segmented
              tone="dark"
              label="Dividend rate"
              value={o.rateMode}
              onChange={(v) => set({ rateMode: v })}
              options={[
                { value: 'latest', label: `Latest ${latestMp2.rate}%` },
                { value: 'average', label: `${MP2_AVERAGE_YEARS}-yr avg ${resolveMp2Rate({ ...o, rateMode: 'average' }).rate}%` },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {o.rateMode === 'custom' && (
              <NumberField label="Your projected dividend rate" suffix="% p.a." min={0} max={20} step={0.01} value={o.customRate} onChange={(v) => set({ customRate: v })} />
            )}
            <p className="ui -mt-3 text-sm text-night-muted">
              {rate.kind === 'declared'
                ? `Declared by Pag-IBIG for ${latestMp2.year}. Future years are not guaranteed; this projection assumes the same rate continues.`
                : rate.kind === 'average'
                  ? `Simple average of the declared rates for ${rate.label}. A projection, not a promise.`
                  : 'Your own assumption about future dividends.'}
            </p>

            <Segmented
              tone="dark"
              label="Dividend payout"
              value={o.payout}
              onChange={(v) => set({ payout: v })}
              options={[
                { value: 'compounded', label: 'Compounded' },
                { value: 'annual', label: 'Annual payout' },
              ]}
            />

            <InflationControl s={s} />

            <div>
              <button type="button" className="btn btn-quiet px-0 text-night-ink" aria-expanded={advanced} aria-controls="mp2-advanced" onClick={() => setAdvanced((v) => !v)}>
                {advanced ? 'Hide timing settings' : 'Timing settings'}
              </button>
              {advanced && (
                <motion.div id="mp2-advanced" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid gap-6">
                  <SelectField
                    label="Contribution frequency"
                    value={o.frequency}
                    onChange={(v) => set({ frequency: v })}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'quarterly', label: 'Every 3 months' },
                      { value: 'annually', label: 'Once a year' },
                      { value: 'none', label: 'No regular contributions' },
                    ]}
                  />
                  <SelectField
                    label="First contribution month"
                    value={String(o.startMonth)}
                    onChange={(v) => set({ startMonth: Number(v) })}
                    options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
                    hint="Dividends are declared per calendar year, so the month you start changes the first year's dividend."
                  />
                  <SelectField
                    label="When in the month you pay"
                    value={o.timing}
                    onChange={(v) => set({ timing: v })}
                    options={[
                      { value: 'start', label: 'Early in the month (earns the whole month)' },
                      { value: 'mid', label: 'Mid-month (earns half the month)' },
                      { value: 'end', label: 'End of month (earns from next month)' },
                    ]}
                  />
                </motion.div>
              )}
            </div>
          </form>
        </div>

        {/* Output field */}
        <div className="bg-paper px-5 py-10 sm:px-8 lg:px-[8%] lg:py-16" aria-live="polite">
          {!r.ok ? (
            <p role="alert" className="ui bg-loss-soft p-5 text-[1.0625rem] text-loss">
              {r.error}
            </p>
          ) : (
            <>
              <p className="ui text-[0.9375rem] text-ink-2">
                {peso(s.scenario.monthly)} {o.frequency === 'monthly' ? 'a month' : o.frequency === 'quarterly' ? 'every 3 months' : o.frequency === 'annually' ? 'a year' : ''}
                {s.scenario.initial > 0 ? ` plus ${peso(s.scenario.initial)} upfront` : ''}, {s.scenario.years} years at {pct(rate.rate, 2)} ({rate.label}),{' '}
                {o.payout === 'compounded' ? 'compounded' : 'paid out yearly'}.
              </p>
              <dl data-ui className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8">
                <Figure big label="Projected maturity value" value={r.value.maturityValue.toNumber()} note={o.payout === 'annual' ? `Savings of ${peso(r.value.maturityBalance)} plus ${peso(r.value.totalPayouts)} paid out over the years` : undefined} />
                <Figure label="Total contributions" value={r.value.totalContributed.toNumber()} />
                <Figure label="Projected dividends" value={r.value.totalDividends.toNumber()} note="Tax-free" />
                <Figure label="Inflation-adjusted value" value={r.value.real.realEnding.toNumber()} note="In today's pesos" />
                <Figure
                  label="Estimated real gain or loss"
                  value={r.value.real.realGain.toNumber()}
                  tone={r.value.real.realGain.gte(0) ? 'gain' : 'loss'}
                  note="Buying power gained, contributions valued when made"
                />
              </dl>

              <div className="mt-8 grid gap-1">
                <StatusTag status={rate.kind === 'assumption' ? 'assumption' : 'historical'} extra={rate.kind === 'declared' ? `${latestMp2.year} rate, projected forward` : 'projection'} />
              </div>

              <div className="mt-8">
                <button type="button" className="btn btn-quiet px-0" aria-expanded={showTable} aria-controls="mp2-table" onClick={() => setShowTable((v) => !v)}>
                  {showTable ? 'Hide year-by-year table' : 'Show year by year'}
                </button>
                {showTable && (
                  <div id="mp2-table" className="mt-4 overflow-x-auto">
                    <table className="ui w-full min-w-[520px] border-collapse text-left text-[0.9375rem] tabular">
                      <caption className="sr-only">MP2 projection by year</caption>
                      <thead>
                        <tr className="bg-surface">
                          <th scope="col" className="p-2.5 font-semibold">Year</th>
                          <th scope="col" className="p-2.5 text-right font-semibold">Contributed</th>
                          <th scope="col" className="p-2.5 text-right font-semibold">Dividend</th>
                          <th scope="col" className="p-2.5 text-right font-semibold">{o.payout === 'annual' ? 'Savings + paid out' : 'Balance'}</th>
                          <th scope="col" className="p-2.5 text-right font-semibold">Today's pesos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.value.rows.map((row) => (
                          <tr key={row.year} className="even:bg-ground">
                            <th scope="row" className="p-2.5 font-medium">
                              {row.year}
                              {row.year > MP2_TERM_YEARS ? '*' : ''}
                            </th>
                            <td className="p-2.5 text-right">{pesoExact(row.contributed)}</td>
                            <td className="p-2.5 text-right">{pesoExact(row.dividendsThisYear)}</td>
                            <td className="p-2.5 text-right">{pesoExact(row.nominalTotal)}</td>
                            <td className="p-2.5 text-right">{pesoExact(row.realTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {r.value.beyondStandardTerm && <p className="ui mt-2 text-sm text-muted">* After the {MP2_TERM_YEARS}-year term, assuming you renew into a new MP2 account.</p>}
                  </div>
                )}
              </div>

              <p id="mp2-note" className="ui mt-10 max-w-[60ch] text-[0.875rem] leading-relaxed text-ink-2">
                This is a projection, not an official Pag-IBIG computation. Actual dividends depend on the rates Pag-IBIG
                declares each year and on when your payments are posted. The model accrues dividends monthly on your balance
                and credits them every December and at maturity.{' '}
                <Link className="link" to="/about#faq">
                  How this is calculated
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
