import { ExternalLink } from 'lucide-react'
import { banks, isPotentiallyOutdated, productById, promoState } from '../../data'
import type { ScenarioState } from '../../hooks/useScenario'
import type { BankProduct } from '../../types/data'
import { dateLabel, peso, pct } from '../../utils/format'
import { AmountField, NumberField, SelectField, Toggle } from '../ui/fields'
import { Reveal } from '../ui/motion'
import { StatusTag } from '../ui/Status'
import { Figure, InflationControl } from './Mp2Section'

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

function Note({ title, body, align }: { title: string; body: string; align: 'left' | 'right' }) {
  return (
    <div className={`max-w-[30ch] ${align === 'left' ? 'lg:ml-auto lg:text-right' : ''}`}>
      <h3 className="ui text-[1.0625rem] leading-snug font-semibold tracking-normal">{title}</h3>
      <p className="mt-1.5 text-[1rem] leading-relaxed text-ink-2">{body}</p>
    </div>
  )
}

function productLabel(p: BankProduct) {
  return `${p.bank} — ${p.product} (${p.baseTiers[0].rate}%)`
}

export function BanksSection({ s }: { s: ScenarioState }) {
  const o = s.bankOpts
  const set = (patch: Partial<typeof o>) => s.setBankOpts((x) => ({ ...x, ...patch }))
  const product = productById(o.productId)!
  const promo = promoState(product)
  const r = s.bankResult

  return (
    <section id="banks" aria-labelledby="banks-title" className="mt-[clamp(120px,14vw,240px)]">
      <div className="wrap">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left notes + heading */}
          <div className="grid content-start gap-10 lg:col-span-3 lg:pt-2">
            <Reveal className="lg:text-right">
              <h2 id="banks-title" className="text-[clamp(2rem,1.4rem+2vw,3rem)]">
                Saan mas sulit mag-ipon?
              </h2>
              <p className="mt-3 text-ink-2">Where do your savings earn more? Digital bank savings, after tax and inflation.</p>
            </Reveal>
            <div className="hidden gap-10 lg:grid">
              {NOTES_LEFT.map((n) => (
                <Note key={n.title} {...n} align="left" />
              ))}
            </div>
          </div>

          {/* The panel */}
          <Reveal delay={0.05} className="lg:col-span-6">
            <div className="bg-paper p-5 sm:p-8">
              <form className="grid gap-6" onSubmit={(e) => e.preventDefault()}>
                <SelectField
                  label="Bank and product"
                  value={o.productId}
                  onChange={(v) => set({ productId: v, applyPromo: false, includeBonus: false })}
                  options={banks.products.map((p) => ({ value: p.id, label: productLabel(p) }))}
                  hint={
                    <>
                      {KIND[product.kind]} · {product.liquidity}.{' '}
                      <a className="link" href={product.sourceUrl} target="_blank" rel="noreferrer">
                        Official source
                      </a>
                    </>
                  }
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <AmountField label={product.kind === 'time-deposit' ? 'Placement' : 'Initial deposit'} value={s.scenario.initial} onChange={(v) => s.setScenario((x) => ({ ...x, initial: v }))} />
                  <AmountField
                    label="Monthly deposit"
                    value={s.scenario.monthly}
                    onChange={(v) => s.setScenario((x) => ({ ...x, monthly: v }))}
                    hint={product.kind === 'time-deposit' ? 'Not added: time deposits take one placement.' : undefined}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <SelectField
                    label="Duration"
                    value={String(s.scenario.years)}
                    onChange={(v) => s.setScenario((x) => ({ ...x, years: Number(v) }))}
                    options={Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} ${i ? 'years' : 'year'}` }))}
                  />
                  <NumberField
                    label="Interest rate"
                    suffix="% p.a."
                    min={0}
                    max={30}
                    step={0.05}
                    value={o.override ?? product.baseTiers[0].rate}
                    onChange={(v) => set({ override: v === product.baseTiers[0].rate ? null : v })}
                    hint={o.override === null ? 'Published base rate. Type to override.' : 'Your rate, overriding the published one.'}
                  />
                </div>
                {o.override !== null && (
                  <button type="button" className="btn btn-quiet -mt-3 justify-self-start px-0" onClick={() => set({ override: null })}>
                    Use the published rate again
                  </button>
                )}

                {product.promo && o.override === null && (
                  <Toggle
                    label={`Apply "${product.promo.name}" (up to ${product.promo.rate}% on the first ${peso(product.promo.cap ?? 0)})`}
                    checked={o.applyPromo}
                    onChange={(v) => set({ applyPromo: v })}
                    description={
                      promo === 'ended'
                        ? `This promo ended ${dateLabel(product.promo.endsOn!)}; only the base rate applies.`
                        : `Assumes you meet every condition: ${product.promo.conditions.join('; ')}. Ends ${product.promo.endsOn ? dateLabel(product.promo.endsOn) : 'without a stated date'}.`
                    }
                  />
                )}
                {product.conditionalBonus && o.override === null && (
                  <Toggle
                    label={`Include the conditional +${product.conditionalBonus.rate}% bonus`}
                    checked={o.includeBonus}
                    onChange={(v) => set({ includeBonus: v })}
                    description={product.conditionalBonus.condition}
                  />
                )}
                <InflationControl s={s} />
              </form>

              <div data-ui className="mt-10 bg-ground p-5 sm:p-6" aria-live="polite">
                {!r.ok ? (
                  <p role="alert" className="ui text-loss">
                    {r.error}
                  </p>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-7">
                      <Figure big label="Final balance after tax" value={r.value.finalBalance.toNumber()} />
                      <Figure label="Total deposited" value={r.value.totalDeposited.toNumber()} />
                      <Figure label="Gross interest" value={r.value.grossInterest.toNumber()} />
                      <Figure label="Withholding tax" value={r.value.tax.toNumber()} note={`${banks.tax.ratePct}% final tax`} />
                      <Figure label="Net interest" value={r.value.netInterest.toNumber()} />
                      <Figure label="Inflation-adjusted balance" value={r.value.real.realEnding.toNumber()} note="In today's pesos" />
                      <Figure label="Estimated real gain or loss" value={r.value.real.realGain.toNumber()} tone={r.value.real.realGain.gte(0) ? 'gain' : 'loss'} />
                    </dl>
                    {r.value.assumptions.length > 0 && (
                      <ul className="ui mt-6 grid list-disc gap-1 pl-5 text-[0.875rem] text-ink-2">
                        {r.value.assumptions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </Reveal>

          {/* Right notes; on phones all six notes follow the panel */}
          <div className="grid content-start gap-10 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1 lg:pt-[7.5rem]">
            <div className="contents lg:hidden">
              {NOTES_LEFT.map((n) => (
                <Note key={n.title} {...n} align="right" />
              ))}
            </div>
            {NOTES_RIGHT.map((n) => (
              <Note key={n.title} {...n} align="right" />
            ))}
          </div>
        </div>

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
        <span className="sr-only">(official source, opens in a new tab)</span>
      </a>
    ),
    cols: [
      { h: 'Type', v: KIND[p.kind] },
      {
        h: 'Base rate',
        v: (
          <span className="tabular font-semibold">
            {p.baseTiers.map((t) => pct(t.rate, 2)).join(' / ')}
            {p.termMonths ? <span className="block font-normal text-muted">{p.termMonths}-month term</span> : null}
          </span>
        ),
      },
      {
        h: 'Promo or bonus',
        v: p.promo ? (
          <>
            Up to {pct(p.promo.rate, 0)} on the first {peso(p.promo.cap ?? 0)}
            <span className="block text-muted">
              {ps === 'ended' ? 'Ended' : 'Until'} {p.promo.endsOn ? dateLabel(p.promo.endsOn) : '—'}; conditions apply
            </span>
          </>
        ) : p.conditionalBonus ? (
          <>
            +{pct(p.conditionalBonus.rate, 0)} if conditions are met
            <span className="block text-muted">Paid at maturity</span>
          </>
        ) : (
          <span className="text-muted">None</span>
        ),
      },
      {
        h: 'Interest credited',
        v: p.crediting === null ? <span className="text-muted">Not stated</span> : p.crediting === 'at-maturity' ? 'At maturity' : p.crediting === 'daily' ? 'Daily' : 'Monthly',
      },
      { h: 'Access to money', v: p.liquidity },
      {
        h: 'Status',
        v: (
          <>
            <StatusTag status={outdated && p.status !== 'needs-review' ? 'stale' : p.status} />
            <span className="mt-1 block text-[0.8125rem] text-muted">Checked {dateLabel(p.verifiedOn)}</span>
          </>
        ),
      },
    ],
  }
}

function RatesTable() {
  const rows = banks.products.map((p) => ({ id: p.id, ...rateCells(p) }))
  return (
    <div className="mt-[clamp(72px,8vw,120px)]">
      <Reveal>
        <h3 className="text-[clamp(1.5rem,1.2rem+1vw,2.25rem)]">Rates we could verify</h3>
        <p className="mt-3 max-w-[64ch] text-ink-2">
          Gross rates per year, before the {banks.tax.ratePct}% tax. Base rates are what you earn with no conditions. Different
          products have different liquidity and risk, so this table is not a ranking.
        </p>
      </Reveal>

      {/* Tablet and up: a real table */}
      <table className="ui mt-8 hidden w-full border-collapse text-left text-[0.9375rem] lg:table">
        <thead>
          <tr className="bg-surface">
            <th scope="col" className="p-3 align-bottom font-semibold">
              Bank and product
            </th>
            {rows[0].cols.map((c) => (
              <th key={c.h} scope="col" className="p-3 align-bottom font-semibold">
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-top even:bg-paper">
              <th scope="row" className="p-3 font-medium">
                {r.name}
              </th>
              {r.cols.map((c) => (
                <td key={c.h} className="p-3">
                  {c.v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones and small tablets: one block per product */}
      <ul className="ui m-0 mt-8 grid list-none gap-2 p-0 sm:grid-cols-2 lg:hidden">
        {rows.map((r) => (
          <li key={r.id} className="bg-paper p-5">
            <h4 className="text-[1.0625rem] font-semibold">{r.plain}</h4>
            <dl className="m-0 mt-3 grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2.5 text-[0.9375rem]">
              <div className="contents">
                <dt className="text-muted">Source</dt>
                <dd className="m-0">
                  <a className="link" href={r.url} target="_blank" rel="noreferrer">
                    Official page<span className="sr-only"> for {r.plain}, opens in a new tab</span>
                  </a>
                </dd>
              </div>
              {r.cols.map((c) => (
                <div key={c.h} className="contents">
                  <dt className="text-muted">{c.h}</dt>
                  <dd className="m-0">{c.v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h4 className="ui text-[1.0625rem] font-semibold">Not included yet</h4>
          <ul className="mt-3 grid list-none gap-3 p-0 text-[1rem] text-ink-2">
            {banks.excluded.map((e) => (
              <li key={e.bank}>
                <span className="font-medium text-ink">{e.bank}.</span> {e.reason}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="ui text-[1.0625rem] font-semibold">About tax</h4>
          <p className="mt-3 text-[1rem] text-ink-2">
            {banks.tax.rule}. {banks.tax.notes.join(' ')}{' '}
            <a className="link" href={banks.tax.sourceUrl} target="_blank" rel="noreferrer">
              Bank notice on CMEPA
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
