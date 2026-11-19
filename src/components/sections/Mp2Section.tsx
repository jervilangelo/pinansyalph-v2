/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { MP2_TERM_YEARS } from '../../calculators/mp2'
import { latestMp2, mp2 } from '../../data'
import { MP2_AVERAGE_YEARS, inflationChoices, resolveMp2Rate, type InflationMode, type ScenarioState } from '../../hooks/useScenario'
import { MONTH_NAMES, peso, pesoExact, pesoSigned, pct } from '../../utils/format'
import { AmountField, NumberField, Segmented, SelectField } from '../ui/fields'
import { AnimatedNumber } from '../ui/motion'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { CalcGrid, Panel, ResultHero } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { Link } from '../../router'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

export function InflationControl({ s }: { s: ScenarioState }) {
  const choices = inflationChoices()
  return (
    <div className="grid gap-3">
      <SelectField<InflationMode>
        label={t("Inflation assumption")}
        value={s.scenario.inflationMode}
        onChange={(v) => s.setScenario((x) => ({ ...x, inflationMode: v }))}
        options={choices.map((c) => ({ value: c.value, label: c.label }))}
        hint={t("Applied to every year of the projection. Future inflation is unknown.")}
      />
      {s.scenario.inflationMode === 'custom' && (
        <NumberField
          label={t("Your inflation estimate")}
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

/** A secondary peso figure in a results list. */
export function Figure({ label, value, note, tone, big = false }: { label: string; value: number; note?: string; tone?: 'gain' | 'loss'; big?: boolean }) {
  const color = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : ''
  return (
    <div className={`flex flex-col-reverse justify-end ${big ? 'col-span-2' : ''}`}>
      <dt className="ui mt-1 text-[0.875rem] font-medium text-muted">
        {tv(label)}
        {note && <span className="mt-0.5 block text-[0.8125rem] font-normal">{tv(note)}</span>}
      </dt>
      <dd className={`figure m-0 ${big ? 'text-[clamp(2.25rem,1.8rem+2vw,3.25rem)] leading-none' : 'text-[1.625rem] leading-tight'} ${color}`}>
        <AnimatedNumber value={value} format={tone ? (n) => pesoSigned(n) : peso} />
      </dd>
    </div>
  )
}

export function Mp2Section({ s }: { s: ScenarioState }) {
  const o = s.mp2Opts
  const set = (patch: Partial<typeof o>) => s.setMp2Opts((x) => ({ ...x, ...patch }))
  const rate = resolveMp2Rate(o)
  const r = s.mp2Result
  const freqWord = o.frequency === 'monthly' ? 'a month' : o.frequency === 'quarterly' ? 'every 3 months' : o.frequency === 'annually' ? 'a year' : ''

  const inputs = (
    <Panel as="form" title={t("Your plan")} intro={t("MP2 is Pag-IBIG's voluntary savings: a {maturityYears}-year term with tax-free dividends.", { maturityYears: mp2.program.maturityYears })}>
      <div className="grid gap-6" aria-describedby="mp2-note">
        <AmountField
          label={t("Monthly contribution")}
          value={s.scenario.monthly}
          onChange={(v) => s.setScenario((x) => ({ ...x, monthly: v }))}
          hint={s.scenario.monthly > 0 && s.scenario.monthly < mp2.program.minimumRemittance ? t("Pag-IBIG's minimum per remittance is ₱{minimumRemittance}.", { minimumRemittance: mp2.program.minimumRemittance }) : undefined}
        />
        <AmountField label={t("Initial investment")} value={s.scenario.initial} onChange={(v) => s.setScenario((x) => ({ ...x, initial: v }))} hint={t("Optional. A lump sum on day one.")} />

        <div className="ui">
          <label htmlFor="years" className="field-label flex items-baseline justify-between">
            <span>{t("Duration")}</span>
            <span className="figure text-[1.25rem] tracking-normal">
              {s.scenario.years} {s.scenario.years === 1 ? t('year') : t('years')}
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
          <p id="years-note" className="field-hint">
            {s.scenario.years === MP2_TERM_YEARS
              ? t("The standard MP2 term.")
              : s.scenario.years > MP2_TERM_YEARS
                ? t("Hypothetical: assumes you renew into a new MP2 term after {MP2_TERM_YEARS} years.", { MP2_TERM_YEARS })
                : t("Shorter than the {MP2_TERM_YEARS}-year term. Early withdrawal is only allowed for specific reasons and forfeits {earlyWithdrawalDividendForfeiturePct}% of dividends; this projection does not apply that.", { MP2_TERM_YEARS, earlyWithdrawalDividendForfeiturePct: mp2.program.earlyWithdrawalDividendForfeiturePct })}
          </p>
        </div>

        <div>
          <Segmented
            label={t("Dividend rate")}
            value={o.rateMode}
            onChange={(v) => set({ rateMode: v })}
            options={[
              { value: 'latest', label: t("Latest {rate}%", { rate: latestMp2.rate }) },
              { value: 'average', label: t("{MP2_AVERAGE_YEARS}-yr avg {rate}%", { MP2_AVERAGE_YEARS, rate: resolveMp2Rate({ ...o, rateMode: 'average' }).rate }) },
              { value: 'custom', label: t("Custom") },
            ]}
          />
          {o.rateMode === 'custom' && (
            <div className="mt-4">
              <NumberField label={t("Your projected dividend rate")} suffix="% p.a." min={0} max={20} step={0.01} value={o.customRate} onChange={(v) => set({ customRate: v })} />
            </div>
          )}
          <p className="field-hint">
            {rate.kind === 'declared'
              ? t("Declared by Pag-IBIG for {year}. Future years are not guaranteed; this projection assumes the same rate continues.", { year: latestMp2.year })
              : rate.kind === 'average'
                ? t("Simple average of the declared rates for {label}. A projection, not a promise.", { label: rate.label })
                : t("Your own assumption about future dividends.")}
          </p>
        </div>

        <Segmented
          label={t("Dividend payout")}
          value={o.payout}
          onChange={(v) => set({ payout: v })}
          options={[
            { value: 'compounded', label: t("Compounded") },
            { value: 'annual', label: t("Annual payout") },
          ]}
        />

        <InflationControl s={s} />

        <Disclosure title={t("Timing settings")} summary={t("Optional")} tone="ground" size="sm">
          <div className="grid gap-6 pt-2">
            <SelectField
              label={t("Contribution frequency")}
              value={o.frequency}
              onChange={(v) => set({ frequency: v })}
              options={[
                { value: 'monthly', label: t("Monthly") },
                { value: 'quarterly', label: t("Every 3 months") },
                { value: 'annually', label: t("Once a year") },
                { value: 'none', label: t("No regular contributions") },
              ]}
            />
            <SelectField
              label={t("First contribution month")}
              value={String(o.startMonth)}
              onChange={(v) => set({ startMonth: Number(v) })}
              options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
              hint={t("Dividends are declared per calendar year, so the month you start changes the first year's dividend.")}
            />
            <SelectField
              label={t("When in the month you pay")}
              value={o.timing}
              onChange={(v) => set({ timing: v })}
              options={[
                { value: 'start', label: t("Early in the month (earns the whole month)") },
                { value: 'mid', label: t("Mid-month (earns half the month)") },
                { value: 'end', label: t("End of month (earns from next month)") },
              ]}
            />
          </div>
        </Disclosure>
      </div>
    </Panel>
  )

  const result = !r.ok ? (
    <p role="alert" className="ui rounded-[22px] bg-loss-soft p-5 text-[1.0625rem] text-loss">
      {r.error}
    </p>
  ) : (
    <>
      <ResultHero
        label={t("Projected maturity value")}
        value={r.value.maturityValue.toNumber()}
        format={peso}
        testId="mp2-maturity"
        caption={
          <>{tx("{monthly} {freqWord}{v2}, {years} years at {rate} ({label}), {v6}.{v7}", { monthly: (peso(s.scenario.monthly)), freqWord: (tv(freqWord)), v2: (s.scenario.initial > 0 ? t(" plus {initial} upfront", { initial: peso(s.scenario.initial) }) : ''), years: (s.scenario.years), rate: (pct(rate.rate, 2)), label: (tv(rate.label)), v6: (o.payout === 'compounded' ? t('compounded') : t("paid out yearly")), v7: (o.payout === 'annual' && t(" Savings of {maturityBalance} plus {totalPayouts} paid out over the years.", { maturityBalance: peso(r.value.maturityBalance), totalPayouts: peso(r.value.totalPayouts) })), })}</>
        }
      />
      <div className="card p-5 sm:p-7">
        <dl data-ui className="m-0 grid grid-cols-2 gap-x-6 gap-y-6">
          <Figure label={t("You put in")} value={r.value.totalContributed.toNumber()} />
          <Figure label={t("Projected dividends")} value={r.value.totalDividends.toNumber()} note={t("Tax-free")} />
          <Figure label={t("Worth in today's pesos")} value={r.value.real.realEnding.toNumber()} note={t("After inflation")} />
          <Figure label={t("Real gain or loss")} value={r.value.real.realGain.toNumber()} tone={r.value.real.realGain.gte(0) ? 'gain' : 'loss'} note={t("Buying power gained")} />
        </dl>
        <div className="mt-6">
          <StatusTag status={rate.kind === 'assumption' ? 'assumption' : 'historical'} extra={rate.kind === 'declared' ? t("{year} rate, projected forward", { year: latestMp2.year }) : 'projection'} />
        </div>
      </div>
      <div className="card p-2">
        <Disclosure title={t("Year by year")} tone="plain" id="mp2-table">
          <div className="-mx-1 overflow-x-auto">
            <table className="data-table ui min-w-[520px] tabular">
              <caption className="sr-only">{t("MP2 projection by year")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("Year")}</th>
                  <th scope="col" className="!text-right">{t("Contributed")}</th>
                  <th scope="col" className="!text-right">{t("Dividend")}</th>
                  <th scope="col" className="!text-right">{o.payout === 'annual' ? t("Savings + paid out") : t("Balance")}</th>
                  <th scope="col" className="!text-right">{t("Today's pesos")}</th>
                </tr>
              </thead>
              <tbody>
                {r.value.rows.map((row) => (
                  <tr key={row.year}>
                    <th scope="row" className="font-medium">
                      {row.year}
                      {row.year > MP2_TERM_YEARS ? '*' : ''}
                    </th>
                    <td className="!text-right">{pesoExact(row.contributed)}</td>
                    <td className="!text-right">{pesoExact(row.dividendsThisYear)}</td>
                    <td className="!text-right">{pesoExact(row.nominalTotal)}</td>
                    <td className="!text-right">{pesoExact(row.realTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.value.beyondStandardTerm && <p className="ui mt-3 text-sm text-muted">{tx("* After the {mP2_TERM_YEARS}-year term, assuming you renew into a new MP2 account.", { mP2_TERM_YEARS: (MP2_TERM_YEARS), })}</p>}
        </Disclosure>
      </div>
      <p id="mp2-note" className="ui px-2 text-[0.8125rem] leading-relaxed text-muted">{tx("A projection, not an official Pag-IBIG computation. Actual dividends depend on the rates Pag-IBIG declares each year and on when your payments are posted. Dividends accrue monthly and are credited every December and at maturity. {link}", { link: (<Link className="link" to="/about#faq">{t("How this is calculated")}</Link>), })}</p>
    </>
  )

  return (
    <section id="mp2" aria-labelledby="mp2-title">
      <ToolHeader
        path="/mp2"
        id="mp2-title"
        title={t("Pag-IBIG MP2 calculator")}
        lede={t("Enter what you plan to save. See what it could grow to, and what that is worth after inflation.")}
        meta={<StatusTag status="historical" extra={t("latest declared rate {rate}% for {year}", { rate: latestMp2.rate, year: latestMp2.year })} />}
      />
      <div className="wrap">
        <CalcGrid inputs={inputs} result={result} />
      </div>
    </section>
  )
}
