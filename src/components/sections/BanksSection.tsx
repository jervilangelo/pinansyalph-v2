/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { ExternalLink } from 'lucide-react'
import { banks, isPotentiallyOutdated, productById, promoState } from '../../data'
import type { ScenarioState } from '../../hooks/useScenario'
import type { BankProduct } from '../../types/data'
import { dateLabel, peso, pct } from '../../utils/format'
import { AmountField, NumberField, SelectField, Toggle } from '../ui/fields'
import { Reveal } from '../ui/motion'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { CalcGrid, Panel, ResultHero } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { Figure, InflationControl } from './Mp2Section'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const KIND: Record<BankProduct['kind'], string> = {
  savings: 'Savings account',
  'goal-savings': 'Goal / stash savings',
  'time-deposit': 'Time deposit',
}

const NOTES_LEFT = [
  {
    title: 'Base rate first',
    body: 'Every figure starts from the rate you get without missions or promos. Boosted rates only count if you switch them on.',
  },
  {
    title: 'Promos end',
    body: 'A promo rate applies only up to its balance cap and only until its end date. After that the calculator drops to the base rate.',
  },
  {
    title: '20% goes to tax',
    body: `Banks withhold a ${banks.tax.ratePct}% final tax every time they credit interest (RA 12214). Net interest is what you keep.`,
  },
]

const NOTES_RIGHT = [
  {
    title: 'Daily or monthly',
    body: 'Daily crediting compounds a little faster. If a bank does not say, monthly is assumed and the result says so.',
  },
  {
    title: 'Locked or liquid',
    body: 'Time deposits lock your money for the term and take one placement. Savings accounts let you withdraw any time.',
  },
  {
    title: 'Checked, not scraped',
    body: `Rates are read from each bank's official page and re-checked automatically. A changed page is flagged, never auto-published.`,
  },
]

function productLabel(p: BankProduct) {
  return `${p.bank} — ${p.product} (${p.baseTiers[0].rate}%)`
}

export function BanksSection({ s }: { s: ScenarioState }) {
  const o = s.bankOpts
  const set = (patch: Partial<typeof o>) => s.setBankOpts((x) => ({ ...x, ...patch }))
  const product = productById(o.productId)!
  const promo = promoState(product)
  const r = s.bankResult

  const inputs = (
    <Panel as="form" title={t("Your savings")} intro={t("Pick a product and enter your deposits. Rates start from the published base rate.")}>
      <div className="grid gap-6">
        <SelectField
          label={t("Bank and product")}
          value={o.productId}
          onChange={(v) => set({ productId: v, applyPromo: false, includeBonus: false })}
          options={banks.products.map((p) => ({ value: p.id, label: productLabel(p) }))}
          hint={
            <>
              {tv(KIND[product.kind])} · {tv(product.liquidity)}.{' '}
              <a className="link" href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{t("Official source")}</a>
            </>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <AmountField label={product.kind === 'time-deposit' ? t("Placement") : t("Initial deposit")} value={s.scenario.initial} onChange={(v) => s.setScenario((x) => ({ ...x, initial: v }))} />
          <AmountField
            label={t("Monthly deposit")}
            value={s.scenario.monthly}
            onChange={(v) => s.setScenario((x) => ({ ...x, monthly: v }))}
            hint={product.kind === 'time-deposit' ? t("Not added: time deposits take one placement.") : undefined}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            label={t("Duration")}
            value={String(s.scenario.years)}
            onChange={(v) => s.setScenario((x) => ({ ...x, years: Number(v) }))}
            options={Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} ${i ? t('years') : t('year')}` }))}
          />
          <div>
            <NumberField
              label={t("Interest rate")}
              suffix="% p.a."
              min={0}
              max={30}
              step={0.05}
              value={o.override ?? product.baseTiers[0].rate}
              onChange={(v) => set({ override: v === product.baseTiers[0].rate ? null : v })}
              hint={o.override === null ? t("Published base rate. Type to override.") : t("Your rate, overriding the published one.")}
            />
            {o.override !== null && (
              <button type="button" className="btn btn-quiet mt-1 text-[0.875rem]" onClick={() => set({ override: null })}>{t("Use the published rate again")}</button>
            )}
          </div>
        </div>

        {product.promo && o.override === null && (
          <Toggle
            label={t("Apply \"{name}\" (up to {rate}% on the first {v2})", { name: product.promo.name, rate: product.promo.rate, v2: peso(product.promo.cap ?? 0) })}
            checked={o.applyPromo}
            onChange={(v) => set({ applyPromo: v })}
            description={
              promo === 'ended'
                ? t("This promo ended {v0}; only the base rate applies.", { v0: dateLabel(product.promo.endsOn!) })
                : t("Assumes you meet every condition: {v0}. Ends {v1}.", { v0: product.promo.conditions.join('; '), v1: product.promo.endsOn ? dateLabel(product.promo.endsOn) : 'without a stated date' })
            }
          />
        )}
        {product.conditionalBonus && o.override === null && (
          <Toggle
            label={t("Include the conditional +{rate}% bonus", { rate: product.conditionalBonus.rate })}
            checked={o.includeBonus}
            onChange={(v) => set({ includeBonus: v })}
            description={product.conditionalBonus.condition}
          />
        )}
        <InflationControl s={s} />
      </div>
    </Panel>
  )

  const result = !r.ok ? (
    <p role="alert" className="ui rounded-[22px] bg-loss-soft p-5 text-loss">
      {tv(r.error)}
    </p>
  ) : (
    <>
      <ResultHero
        label={t("Final balance after tax")}
        value={r.value.finalBalance.toNumber()}
        format={peso}
        testId="bank-final"
        caption={t("{bank} {product}, {years} {v3}. Interest after the {ratePct}% final tax.", { bank: product.bank, product: product.product, years: s.scenario.years, v3: s.scenario.years === 1 ? t('year') : t('years'), ratePct: banks.tax.ratePct })}
      />
      <div className="card p-5 sm:p-7">
        <dl data-ui className="m-0 grid grid-cols-2 gap-x-6 gap-y-6">
          <Figure label={t("Total deposited")} value={r.value.totalDeposited.toNumber()} />
          <Figure label={t("Net interest")} value={r.value.netInterest.toNumber()} note={t("What you keep")} />
          <Figure label={t("Gross interest")} value={r.value.grossInterest.toNumber()} />
          <Figure label={t("Withholding tax")} value={r.value.tax.toNumber()} note={t("{ratePct}% final tax", { ratePct: banks.tax.ratePct })} />
          <Figure label={t("Worth in today's pesos")} value={r.value.real.realEnding.toNumber()} note={t("After inflation")} />
          <Figure label={t("Real gain or loss")} value={r.value.real.realGain.toNumber()} tone={r.value.real.realGain.gte(0) ? 'gain' : 'loss'} />
        </dl>
        {r.value.assumptions.length > 0 && (
          <ul className="ui mt-6 grid list-disc gap-1 pl-5 text-[0.875rem] text-muted">
            {r.value.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="card p-2">
        <Disclosure title={t("How bank interest is calculated here")} tone="plain">
          <dl className="m-0 grid gap-5 sm:grid-cols-2">
            {[...NOTES_LEFT, ...NOTES_RIGHT].map((n) => (
              <div key={n.title}>
                <dt className="ui font-semibold">{tv(n.title)}</dt>
                <dd className="m-0 mt-1 text-[0.9375rem] leading-relaxed text-ink-2">{tv(n.body)}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      </div>
    </>
  )

  return (
    <section id="banks" aria-labelledby="banks-title">
      <ToolHeader
        path="/banks"
        id="banks-title"
        title={t("Saan mas sulit mag-ipon?")}
        lede={t("Where do your savings earn more? Digital bank savings, after the 20% tax and inflation.")}
        meta={<StatusTag status="verified-manual" extra={t("rates checked {verifiedOn}, promos excluded by default", { verifiedOn: dateLabel(banks.products[0].verifiedOn) })} />}
      />
      <div className="wrap">
        <CalcGrid inputs={inputs} result={result} />
        <RatesTable />
      </div>
    </section>
  )
}

function rateCells(p: BankProduct) {
  const ps = promoState(p)
  const outdated = isPotentiallyOutdated(p)
  return {
    plain: `${p.bank} ${p.product}`,
    url: p.sourceUrl,
    name: (
      <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1.5">
        {p.bank} {p.product}
        <ExternalLink aria-hidden="true" size={14} />
        <span className="sr-only">{t("(official source, opens in a new tab)")}</span>
      </a>
    ),
    cols: [
      { h: 'Type', v: KIND[p.kind] },
      {
        h: 'Base rate',
        v: (
          <span className="tabular font-semibold">
            {p.baseTiers.map((t) => pct(t.rate, 2)).join(' / ')}
            {p.termMonths ? <span className="block font-normal text-muted">{tx("{termMonths}-month term", { termMonths: (p.termMonths), })}</span> : null}
          </span>
        ),
      },
      {
        h: 'Promo or bonus',
        v: p.promo ? (
          <>{tx("Up to {rate} on the first {peso}{span}", { rate: (pct(p.promo.rate, 0)), peso: (peso(p.promo.cap ?? 0)), span: (<span className="block text-muted">{tx("{v0} {v1}; conditions apply", { v0: (ps === 'ended' ? t("Ended") : t("Until")), v1: (p.promo.endsOn ? dateLabel(p.promo.endsOn) : '—'), })}</span>), })}</>
        ) : p.conditionalBonus ? (
          <>{tx("+{rate} if conditions are met{span}", { rate: (pct(p.conditionalBonus.rate, 0)), span: (<span className="block text-muted">{t("Paid at maturity")}</span>), })}</>
        ) : (
          <span className="text-muted">{t("None")}</span>
        ),
      },
      {
        h: 'Interest credited',
        v: p.crediting === null ? <span className="text-muted">{t("Not stated")}</span> : p.crediting === 'at-maturity' ? 'At maturity' : p.crediting === 'daily' ? 'Daily' : 'Monthly',
      },
      { h: 'Access to money', v: tv(p.liquidity) },
      {
        h: 'Status',
        v: (
          <>
            <StatusTag status={outdated && p.status !== 'needs-review' ? 'stale' : p.status} />
            <span className="mt-1 block text-[0.8125rem] text-muted">{tx("Checked {verifiedOn}", { verifiedOn: (dateLabel(p.verifiedOn)), })}</span>
          </>
        ),
      },
    ],
  }
}

function RatesTable() {
  const rows = banks.products.map((p) => ({ id: p.id, ...rateCells(p) }))
  return (
    <section aria-labelledby="rates-title" className="mt-[clamp(80px,9vw,140px)]">
      <Reveal>
        <h2 id="rates-title" className="text-step-head">{t("Rates we could verify")}</h2>
        <p className="mt-4 max-w-[64ch] text-ink-2">{tx("Gross rates per year, before the {ratePct}% tax. Base rates are what you earn with no conditions. Different products have different liquidity and risk, so this table is not a ranking.", { ratePct: (banks.tax.ratePct), })}</p>
      </Reveal>

      {/* Tablet and up: a real table */}
      <div className="card mt-8 hidden p-3 lg:block"><table className="data-table ui">
        <thead>
          <tr>
            <th scope="col" className="align-bottom">{t("Bank and product")}</th>
            {rows[0].cols.map((c) => (
              <th key={c.h} scope="col" className="align-bottom">
                {tv(c.h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="font-medium">
                {tv(r.name)}
              </th>
              {r.cols.map((c) => (
                <td key={c.h}>
                  {tv(c.v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table></div>

      {/* Phones and small tablets: one block per product */}
      <ul className="ui m-0 mt-8 grid list-none gap-2 p-0 sm:grid-cols-2 lg:hidden">
        {rows.map((r) => (
          <li key={r.id} className="card p-5">
            <h3 className="font-sans text-[1.0625rem] font-semibold tracking-normal">{tv(r.plain)}</h3>
            <dl className="m-0 mt-3 grid grid-cols-[minmax(0,7rem)_1fr] gap-x-4 gap-y-2.5 text-[0.9375rem] sm:grid-cols-[minmax(0,9rem)_1fr]">
              <div className="contents">
                <dt className="text-muted">{t("Source")}</dt>
                <dd className="m-0">
                  <a className="link" href={r.url} target="_blank" rel="noreferrer">{tx("Official page{span}", { span: (<span className="sr-only">{tx("for {plain}, opens in a new tab", { plain: (tv(r.plain)), })}</span>), })}</a>
                </dd>
              </div>
              {r.cols.map((c) => (
                <div key={c.h} className="contents">
                  <dt className="text-muted">{tv(c.h)}</dt>
                  <dd className="m-0">{tv(c.v)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card-soft p-6 sm:p-7">
          <h3 className="text-[1.375rem]">{t("Not included yet")}</h3>
          <ul className="mt-3 grid list-none gap-3 p-0 text-[0.9375rem] text-ink-2">
            {banks.excluded.map((e) => (
              <li key={e.bank}>
                <span className="font-medium text-ink">{e.bank}.</span> {tv(e.reason)}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-soft p-6 sm:p-7">
          <h3 className="text-[1.375rem]">{t("About tax")}</h3>
          <p className="mt-3 text-[0.9375rem] text-ink-2">
            {tv(banks.tax.rule)}. {banks.tax.notes.map((n) => tv(n)).join(' ')}{' '}
            <a className="link" href={banks.tax.sourceUrl} target="_blank" rel="noopener noreferrer">{t("Bank notice on CMEPA")}</a>
          </p>
        </div>
      </div>
    </section>
  )
}
