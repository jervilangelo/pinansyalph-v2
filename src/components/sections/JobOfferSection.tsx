/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { useMemo, useState } from 'react'
import { compareOffer, type Arrangement, type JobPackage } from '../../calculators/jobOffer'
import type { Dec } from '../../calculators/money'
import { payrollRules } from '../../data'
import { safe } from '../../hooks/useScenario'
import { peso } from '../../utils/format'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, NumberField, Segmented } from '../ui/fields'
import { AnimatedNumber, Reveal } from '../ui/motion'
import { ResultHero } from '../ui/Result'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const DEFAULT_DAYS: Record<Arrangement, number> = { onsite: 5, hybrid: 3, remote: 0 }
const signed = (n: number) => (Math.abs(n) < 0.5 ? peso(0) : `${n > 0 ? '+' : '−'}${peso(Math.abs(n))}`)

const start = (basic: number, arrangement: Arrangement, commute: number): JobPackage => ({
  basic,
  taxableAllowances: 0,
  nonTaxableAllowances: 0,
  arrangement,
  officeDays: DEFAULT_DAYS[arrangement],
  commutePerDay: commute,
  otherMonthlyCosts: 0,
})

function JobInputs({ title, idPrefix, job, set }: { title: string; idPrefix: string; job: JobPackage; set: (p: Partial<JobPackage>) => void }) {
  return (
    <fieldset className="card m-0 min-w-0 border-0 p-5 sm:p-7" data-testid={idPrefix}>
      <legend className="sr-only">{tv(title)}</legend>
      <h3 aria-hidden="true" className="text-[1.5rem] leading-tight">
        {tv(title)}
      </h3>
      <div className="mt-6 grid gap-5">
        <AmountField context={`${title}:`} label={t("Basic monthly pay")} value={job.basic} onChange={(v) => set({ basic: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <AmountField context={`${title}:`} label={t("Taxable allowances")} value={job.taxableAllowances} onChange={(v) => set({ taxableAllowances: v })} hint={t("Monthly, taxed with your pay.")} />
          <AmountField context={`${title}:`} label={t("Non-taxable allowances")} value={job.nonTaxableAllowances} onChange={(v) => set({ nonTaxableAllowances: v })} hint={t("De minimis, like rice or laundry, within BIR limits.")} />
        </div>
        <Segmented<Arrangement>
          context={`${title}:`} label={t("Work arrangement")}
          value={job.arrangement}
          onChange={(v) => set({ arrangement: v, officeDays: DEFAULT_DAYS[v] })}
          options={[
            { value: 'onsite', label: t("On-site") },
            { value: 'hybrid', label: t("Hybrid") },
            { value: 'remote', label: t("Remote") },
          ]}
        />
        {job.arrangement !== 'remote' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              context={`${title}:`} label={t("Office days a week")}
              min={1}
              max={7}
              step={1}
              value={job.officeDays}
              onChange={(v) => set({ officeDays: Math.round(v) })}
              suffix="days"
            />
            <AmountField context={`${title}:`} label={t("Commute per office day")} value={job.commutePerDay} onChange={(v) => set({ commutePerDay: v })} hint={t("Round trip: fares, fuel, parking, toll.")} />
          </div>
        )}
        <AmountField
          context={`${title}:`} label={t("Other monthly work costs")}
          value={job.otherMonthlyCosts}
          onChange={(v) => set({ otherMonthlyCosts: v })}
          hint={job.arrangement === 'remote' ? t("Extra internet, electricity, a co-working seat.") : t("Meals out, uniforms, extra load.")}
        />
      </div>
    </fieldset>
  )
}

/** Peso figure with a sign, used in the breakdown rows. */
function Row({ label, a, b, d, strong = false, note }: { label: string; a: Dec; b: Dec; d: Dec; strong?: boolean; note?: string }) {
  return (
    <tr className={strong ? 'font-semibold' : ''}>
      <th scope="row" className="font-medium">
        {tv(label)}
        {note && <span className="block text-[0.8125rem] font-normal text-muted">{tv(note)}</span>}
      </th>
      <td className="!text-right">{peso(a)}</td>
      <td className="!text-right">{peso(b)}</td>
      <td className={`!text-right ${d.gt(0.5) ? 'text-gain' : d.lt(-0.5) ? 'text-loss' : ''}`}>{signed(d.toNumber())}</td>
    </tr>
  )
}

export function JobOfferSection() {
  const [current, setCurrent] = useState<JobPackage>(() => start(25_000, 'onsite', 150))
  const [offer, setOffer] = useState<JobPackage>(() => start(30_000, 'onsite', 250))
  const r = useMemo(() => safe(() => compareOffer(current, offer, payrollRules)), [current, offer])

  return (
    <section id="job-offer" aria-labelledby="offer-title" className="wrap mt-[clamp(88px,10vw,150px)]">
      <Reveal className="grid gap-4 lg:grid-cols-12 lg:items-end">
        <h2 id="offer-title" className="text-step-head lg:col-span-7">{t("Sulit ba ang job offer?")}</h2>
        <p className="text-ink-2 lg:col-span-5">{t("A higher salary can leave you with less once tax and the daily commute are counted. Compare what is left each month, side by side. This works for any job, with or without a PSA benchmark.")}</p>
      </Reveal>

      <div className="mt-10 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-5">
        <JobInputs title={t("Current job")} idPrefix="offer-current" job={current} set={(p) => setCurrent((x) => ({ ...x, ...p }))} />
        <JobInputs title={t("Job offer")} idPrefix="offer-new" job={offer} set={(p) => setOffer((x) => ({ ...x, ...p }))} />

        <div className="grid gap-4 lg:sticky lg:top-[calc(var(--header-h)+20px)]">
          {!r.ok ? (
            <p role="alert" className="ui rounded-[22px] bg-loss-soft p-5 text-loss">
              {r.error}
            </p>
          ) : (
            <>
              <ResultHero
                label={t("What is left each month")}
                value={r.value.diff.disposable.toNumber()}
                format={signed}
                testId="offer-disposable"
                caption={
                  <>{tx("{v0} with the offer, after deductions and work costs.{v1}", { v0: (r.value.diff.disposable.gte(0.5) ? t("More") : r.value.diff.disposable.lte(-0.5) ? t("Less") : t("About the same")), v1: (r.value.diff.disposablePct != null && Math.abs(r.value.diff.disposablePct) >= 0.1 && t(" That is {v0}% {v1} than now.", { v0: Math.abs(r.value.diff.disposablePct).toFixed(1), v1: r.value.diff.disposablePct > 0 ? t('higher') : t('lower') })), })}</>
                }
              >
                <p className="ui mt-5 rounded-[16px] bg-white/12 px-4 py-3 text-[0.9375rem]">{tx("Over a year: {strong} {span}", { strong: (<strong className="figure text-[1.25rem] tracking-normal">
                    <AnimatedNumber value={r.value.diff.annual.toNumber()} format={signed} testId="offer-annual" />
                  </strong>), span: (<span className="text-white/80">{t("including the 13th month pay difference")}</span>), })}</p>
              </ResultHero>
              <p className="ui px-2 text-[0.8125rem] leading-relaxed text-muted">{t("Money is only part of it. Growth, security, benefits, hours and the people you work with matter too; this tool does not recommend a choice.")}</p>
            </>
          )}
        </div>
      </div>

      {r.ok && (
        <div className="mt-4 grid gap-3">
          <Disclosure title={t("Side-by-side breakdown")} size="lg" headingLevel={3} defaultOpen id="offer-breakdown">
            {(() => {
              const v = r.value
              const rows: { label: string; note?: string; a: Dec; b: Dec; strong?: boolean }[] = [
                { label: 'Gross pay', note: 'Basic + all allowances', a: v.current.gross, b: v.offer.gross },
                { label: 'Taxable part', a: v.current.taxableGross, b: v.offer.taxableGross },
                { label: 'Non-taxable allowances', a: v.current.nonTaxable, b: v.offer.nonTaxable },
                { label: 'SSS, PhilHealth, Pag-IBIG, tax', a: v.current.deductions, b: v.offer.deductions },
                { label: 'Estimated take-home pay', a: v.current.takeHome, b: v.offer.takeHome, strong: true },
                { label: 'Work costs', note: 'Commute and other costs', a: v.current.workCosts, b: v.offer.workCosts },
                { label: 'What is left', a: v.current.disposable, b: v.offer.disposable, strong: true },
                { label: '13th month pay (yearly)', a: v.current.thirteenth, b: v.offer.thirteenth },
              ]
              const tone = (d: Dec) => (d.gt(0.5) ? 'text-gain' : d.lt(-0.5) ? 'text-loss' : '')
              return (
                <>
                  <table className="data-table ui tabular hidden sm:table">
                    <caption className="sr-only">{t("Current job and job offer, monthly")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("Monthly")}</th>
                        <th scope="col" className="!text-right">{t("Current job")}</th>
                        <th scope="col" className="!text-right">{t("Job offer")}</th>
                        <th scope="col" className="!text-right">{t("Difference")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((x) => (
                        <Row key={x.label} label={tv(x.label)} note={tv(x.note)} a={x.a} b={x.b} d={x.b.minus(x.a)} strong={x.strong} />
                      ))}
                    </tbody>
                  </table>
                  <ul className="ui m-0 grid list-none gap-1.5 p-0 sm:hidden">
                    {rows.map((x) => (
                      <li key={x.label} className={`rounded-[16px] bg-ground px-4 py-3 ${x.strong ? 'font-semibold' : ''}`}>
                        <span className="flex items-baseline justify-between gap-3">
                          <span>{tv(x.label)}</span>
                          <span className={`tabular ${tone(x.b.minus(x.a))}`}>{signed(x.b.minus(x.a).toNumber())}</span>
                        </span>
                        <span className="mt-1 block text-[0.8125rem] font-normal text-muted tabular">{tx("Now {link} · Offer {b}", { link: (peso(x.a)), b: (peso(x.b)), })}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )
            })()}
          </Disclosure>
          <Disclosure title={t("Assumptions and limits")} size="lg" headingLevel={3}>
            <ul className="m-0 grid max-w-[76ch] gap-2 pl-5 text-[0.9375rem] leading-relaxed text-ink-2">
              {r.value.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
              <li>{t("Work costs are your own estimates. A higher work cost for the offer counts against it; a higher one now counts in its favour.")}</li>
            </ul>
          </Disclosure>
        </div>
      )}
    </section>
  )
}
