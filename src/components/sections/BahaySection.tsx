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
import { compareToMedian, growthFor, loanAffordability, medianFor, type MedianFigure } from '../../calculators/housing'
import housingJson from '../../data/housing.json'
import { HOUSING_LOCATIONS, locationById, searchLocations, type HousingLocation } from '../../data/housingLocations'
import { Link } from '../../router'
import type { HousingArea, HousingDataset, HousingType } from '../../types/housing'
import { dateLabel, peso, pesoExact, pesoSigned } from '../../utils/format'
import { ToolHeader } from '../layout/Page'
import { Combobox, type ComboOption } from '../ui/Combobox'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, NumberField, Segmented } from '../ui/fields'
import { DUR, EASE, motion } from '../ui/motion'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { Tabs, type TabDef } from '../ui/Tabs'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const data = housingJson as HousingDataset
const BSP = data.sources.find((s) => s.id === data.medians.source)!
const areaName = (a: HousingArea) => tv(data.areas.find((x) => x.id === a)!.name)
const areaCoverage = (a: HousingArea) => data.areas.find((x) => x.id === a)!.coverage

type TabId = 'presyo' | 'compare' | 'trends' | 'overpriced' | 'kaya'
const TABS: TabDef<TabId>[] = [
  { id: 'presyo', label: 'Presyo ng bahay', short: 'Presyo' },
  { id: 'compare', label: 'Compare locations', short: 'Compare' },
  { id: 'trends', label: 'Price trends', short: 'Trends' },
  { id: 'overpriced', label: 'Overpriced ba ’to?', short: 'Overpriced?' },
  { id: 'kaya', label: 'Kaya ko ba?', short: 'Kaya ko?' },
]
const TYPE_OPTIONS: { value: HousingType; label: string }[] = [
  { value: 'all', label: 'All homes' },
  { value: 'house', label: 'House' },
  { value: 'condominium', label: 'Condo' },
]
const typeWord = (ty: HousingType) => (ty === 'all' ? t('homes') : ty === 'house' ? t('houses') : t('condominium units'))

const toOption = (l: HousingLocation): ComboOption => ({ id: l.id, label: l.name === l.within || l.within === 'Province' ? l.name : `${l.name}, ${l.within}`, hint: `BSP area: ${areaName(l.area)}` })

function LocationField({ label, value, onChange }: { label: string; value: HousingLocation | null; onChange: (l: HousingLocation | null) => void }) {
  return (
    <Combobox
      label={tv(label)}
      value={value ? toOption(value) : null}
      onChange={(o) => onChange(o ? (locationById(o.id) ?? null) : null)}
      search={(q) => searchLocations(q).map(toOption)}
      placeholder={t("City, municipality or province")}
      hint={t("Prices are published for BSP areas, not for each city.")}
      emptyText={(q) => <>{tx("No place matches “{q}”. Try the province.", { q: (q), })}</>}
    />
  )
}

export function BahaySection() {
  const [tab, setTab] = useState<TabId>('presyo')
  const [loc, setLoc] = useState<HousingLocation | null>(null)
  const [type, setType] = useState<HousingType>('all')

  return (
    <section id="bahay" aria-labelledby="bahay-title">
      <ToolHeader
        path="/magkano-bahay"
        id="bahay-title"
        title={t("Magkano Bahay Ngayon?")}
        lede={
          <>{tx("{span} Official median prices and price movements from the Bangko Sentral ng Pilipinas, and what a home loan would cost you.", { span: (<span className="font-semibold text-ink">{t("Alamin ang presyuhan ng bahay at condo sa Pilipinas.")}</span>), })}</>
        }
        meta={<StatusTag status="verified" extra={t("BSP Residential Property Price Index, {period}", { period: data.medians.period })} />}
      />
      <div className="wrap grid gap-4">
        <Tabs tabs={TABS} value={tab} onChange={setTab} label={t("Bahay tools")}>
          {tab === 'presyo' && <PresyoTab loc={loc} setLoc={setLoc} type={type} setType={setType} />}
          {tab === 'compare' && <CompareTab type={type} setType={setType} first={loc} />}
          {tab === 'trends' && <TrendsTab />}
          {tab === 'overpriced' && <OverpricedTab loc={loc} setLoc={setLoc} type={type} setType={setType} />}
          {tab === 'kaya' && <KayaTab median={loc ? medianFor(data, loc.area, type) : medianFor(data, 'philippines', type)} />}
        </Tabs>
        <Sources />
      </div>
    </section>
  )
}

// ── Presyo ng bahay ────────────────────────────────────────────────────

function PresyoTab({ loc, setLoc, type, setType }: { loc: HousingLocation | null; setLoc: (l: HousingLocation | null) => void; type: HousingType; setType: (t: HousingType) => void }) {
  const area: HousingArea = loc?.area ?? 'philippines'
  const m = medianFor(data, area, type)!
  const g = growthFor(data, area, type) ?? growthFor(data, area, 'all')
  const inputs = (
    <Panel as="form" title={t("Saan at anong klase?")}>
      <div className="grid gap-5">
        <LocationField label={t("Location")} value={loc} onChange={setLoc} />
        <Segmented<HousingType> label={t("Type of home")} value={type} onChange={setType} options={TYPE_OPTIONS} />
        <Disclosure title={t("Townhouse, lot only, or by size?")} tone="ground" size="sm">
          <p className="ui text-[0.875rem] leading-relaxed text-ink-2" data-testid="insufficient">{tx("{strong} BSP publishes medians for condominium units and for houses as one group (single-detached, townhouse and duplex together), and none for vacant lots. No official source publishes current prices per square meter by city, so this page does not estimate a price from floor or lot area.", { strong: (<strong>{t("Insufficient verified market data.")}</strong>), })}</p>
        </Disclosure>
      </div>
    </Panel>
  )
  const result = (
    <div className="grid gap-4" data-testid="presyo-result">
      <ResultHero
        label={t("Median price, {type} · {area}", { type: typeWord(type), area: areaName(area) })}
        value={m.pesos}
        format={peso}
        testId="median-price"
        caption={
          <>{tx("Half of the {type} bought with bank housing loans in {area} in {period} cost less than this, half cost more.{v3}", { type: (typeWord(type)), area: (areaName(area)), period: (m.period), v3: (m.loans != null && <>{tx("Based on {v0} loans.", { v0: (m.loans.toLocaleString('en-PH')), })}</>), })}</>
        }
      />
      {loc && (
        <p className="ui px-1 text-[0.875rem] leading-relaxed text-ink-2" data-testid="area-note">{tx("{name} is in BSP’s {strong} area ({area}). BSP does not publish separate prices for each city, so this is the figure for the whole area.", { name: (tv(loc.name)), strong: (<strong>{areaName(area)}</strong>), area: (areaCoverage(area)), })}</p>
      )}
      <MedianTable highlight={area} type={type} />
      {g && <GrowthCard area={area} type={g.type} />}
    </div>
  )
  return <CalcGrid inputs={inputs} result={result} />
}

function MedianTable({ highlight, type }: { highlight: HousingArea; type: HousingType }) {
  const rows = data.areas.map((a) => medianFor(data, a.id, type)!)
  const max = Math.max(...rows.map((r) => r.pesos))
  return (
    <Panel title={t("All areas, {type}", { type: typeWord(type) })} intro={t("Median price, {period}. Bank-financed purchases only.", { period: data.medians.period })}>
      <ul className="ui m-0 grid list-none gap-3 p-0" data-testid="median-table">
        {rows.map((r) => (
          <li key={r.area} className={r.area === highlight ? 'font-semibold' : ''}>
            <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
              <span>
                {areaName(r.area)}
                {r.area === highlight && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[0.75rem] text-accent">{t("Your area")}</span>}
              </span>
              <span className="tabular">{peso(r.pesos)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <motion.div className={`h-full rounded-full ${r.area === highlight ? 'bg-accent' : 'bg-ink-2/35'}`} initial={{ width: 0 }} animate={{ width: `${(r.pesos / max) * 100}%` }} transition={{ duration: DUR.slow, ease: EASE }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function GrowthCard({ area, type }: { area: HousingArea; type: HousingType }) {
  const g = growthFor(data, area, type)!
  const latest = g.yoy[g.yoy.length - 1]
  return (
    <div className="card p-5 sm:p-6" data-testid="growth-card">
      <p className="ui text-[0.9375rem] font-semibold text-ink-2">{t("Tumataas ba ang presyo?")}</p>
      <p className={`figure mt-2 text-[2rem] leading-none ${latest > 0 ? 'text-ink' : 'text-loss'}`}>{signedPct(latest)}</p>
      <p className="ui mt-2 text-[0.875rem] leading-relaxed text-muted">{tx("Change in BSP’s price index for {v0} in {area}, {v2} against a year earlier. An index of prices across the area, not the change in value of any one home.", { v0: (type === 'all' ? t("all homes") : typeWord(type)), area: (areaName(area)), v2: (data.growth.yoyQuarters.at(-1)), })}</p>
    </div>
  )
}

const signedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`

// ── Compare locations ──────────────────────────────────────────────────

function CompareTab({ type, setType, first }: { type: HousingType; setType: (t: HousingType) => void; first: HousingLocation | null }) {
  const [a, setA] = useState<HousingLocation | null>(first ?? locationById('bulacan-province-bulacan') ?? null)
  const [b, setB] = useState<HousingLocation | null>(HOUSING_LOCATIONS.find((l) => l.name === 'Quezon City') ?? null)
  const ma = a ? medianFor(data, a.area, type) : null
  const mb = b ? medianFor(data, b.area, type) : null
  const inputs = (
    <Panel as="form" title={t("Two places")}>
      <div className="grid gap-5">
        <LocationField label={t("First place")} value={a} onChange={setA} />
        <LocationField label={t("Second place")} value={b} onChange={setB} />
        <Segmented<HousingType> label={t("Type of home")} value={type} onChange={setType} options={TYPE_OPTIONS} />
      </div>
    </Panel>
  )
  let out
  if (!a || !b || !ma || !mb) out = <Empty title={t("Choose two places")} text={t("Compare the median price of homes in their BSP areas.")} />
  else if (a.area === b.area)
    out = (
      <div className="card p-6" data-testid="same-area">
        <h2 className="text-[1.375rem] leading-tight">{t("Same BSP area")}</h2>
        <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{tx("{name} and {name2} are both in {area}, where the median for {type} was {pesos} in {period}. Insufficient verified market data to compare them with each other: BSP does not publish city prices.", { name: (tv(a.name)), name2: (tv(b.name)), area: (areaName(a.area)), type: (typeWord(type)), pesos: (peso(ma.pesos)), period: (ma.period), })}</p>
      </div>
    )
  else {
    const c = compareToMedian(mb.pesos, ma.pesos)
    out = (
      <div className="grid gap-4" data-testid="compare-result">
        <div className="card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <dl className="contents">
            <Stat label={`${a.name} · ${areaName(a.area)}`} value={peso(ma.pesos)} note={ma.loans != null ? t("{v0} bank loans", { v0: ma.loans.toLocaleString('en-PH') }) : undefined} testId="compare-a" />
            <Stat label={`${b.name} · ${areaName(b.area)}`} value={peso(mb.pesos)} note={mb.loans != null ? t("{v0} bank loans", { v0: mb.loans.toLocaleString('en-PH') }) : undefined} testId="compare-b" />
          </dl>
        </div>
        <p className="ui rounded-[22px] bg-paper p-5 text-[1rem] leading-relaxed" data-testid="compare-sentence">{tx("The median for {type} in {area} is {strong} ({percent}) compared with {area2}.", { type: (typeWord(type)), area: (areaName(b.area)), strong: (<strong>{pesoSigned(c.difference)}</strong>), percent: (signedPct(c.percent)), area2: (areaName(a.area)), })}</p>
        <p className="ui px-1 text-[0.8125rem] leading-relaxed text-muted">{tx("Same source, same quarter ({period}) and same method for both. Medians mix all sizes: an area where buyers choose bigger homes shows a higher median even at the same price per square meter.", { period: (ma.period), })}</p>
      </div>
    )
  }
  return <CalcGrid inputs={inputs} result={<div className="grid gap-4">{out}</div>} />
}

// ── Price trends ───────────────────────────────────────────────────────

function TrendsTab() {
  const [view, setView] = useState<'area' | 'type'>('area')
  const areaSeries = data.growth.series.filter((s) => s.type === 'all')
  const typeSeries = data.growth.series.filter((s) => s.type !== 'all')
  const series = view === 'area' ? areaSeries : typeSeries
  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      <Panel title={t("Year-on-year change in home prices")} intro={t("Percent change of BSP’s Residential Property Price Index against the same quarter a year earlier. An index of price movements, not a peso price.")}>
        <Segmented<'area' | 'type'>
          label={t("Show")}
          value={view}
          onChange={setView}
          options={[
            { value: 'area', label: t("By area") },
            { value: 'type', label: t("By type of home") },
          ]}
        />
        <div className="mt-5 overflow-x-auto" data-testid="trend-table">
          <table className="data-table min-w-[520px]">
            <caption className="sr-only">{t("Year-on-year percent change of the BSP Residential Property Price Index")}</caption>
            <thead>
              <tr>
                <th scope="col">{view === 'area' ? t("Area") : t("Area and type")}</th>
                {data.growth.yoyQuarters.map((q) => (
                  <th key={q} scope="col" className="text-right">
                    {q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={`${s.area}-${s.type}`}>
                  <th scope="row" className="font-semibold">
                    {areaName(s.area)}
                    {s.type !== 'all' && <span className="font-normal text-muted"> · {s.type === 'house' ? t("Houses") : t("Condominium units")}</span>}
                  </th>
                  {s.yoy.map((v, i) => (
                    <td key={i} className="text-right">
                      <Bar value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Disclosure title={t("Quarter-on-quarter changes")} size="lg" headingLevel={2}>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <caption className="sr-only">{t("Quarter-on-quarter percent change of the BSP Residential Property Price Index")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("Area")}</th>
                {data.growth.qoqQuarters.map((q) => (
                  <th key={q} scope="col" className="text-right">
                    {q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={`${s.area}-${s.type}`}>
                  <th scope="row">
                    {areaName(s.area)}
                    {s.type !== 'all' && <span className="text-muted"> · {s.type === 'house' ? t("Houses") : t("Condominium units")}</span>}
                  </th>
                  {s.qoq.map((v, i) => (
                    <td key={i} className="tabular text-right">
                      {signedPct(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
      <p className="ui px-1 text-[0.8125rem] leading-relaxed text-muted">{tx("Source: {link}. The index measures prices across many homes; your own home can move differently.", { link: (<a href={BSP.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">
          {tv(BSP.title)}
        </a>), })}</p>
    </div>
  )
}

/** A signed value with a small bar: right for up, left for down. */
function Bar({ value }: { value: number }) {
  const w = Math.min(Math.abs(value) / 15, 1) * 100
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="relative hidden h-2 w-16 overflow-hidden rounded-full bg-surface sm:block" aria-hidden="true">
        <span className={`absolute top-0 h-full rounded-full ${value >= 0 ? 'left-1/2 bg-accent' : 'right-1/2 bg-loss'}`} style={{ width: `${w / 2}%` }} />
      </span>
      <span className={`tabular ${value < 0 ? 'text-loss' : ''}`}>{signedPct(value)}</span>
    </span>
  )
}

// ── Overpriced ba 'to? ─────────────────────────────────────────────────

function OverpricedTab({ loc, setLoc, type, setType }: { loc: HousingLocation | null; setLoc: (l: HousingLocation | null) => void; type: HousingType; setType: (t: HousingType) => void }) {
  const [price, setPrice] = useState(0)
  const area = loc?.area
  const m = area ? medianFor(data, area, type) : null
  const c = m && price > 0 ? compareToMedian(price, m.pesos) : null
  const inputs = (
    <Panel as="form" title={t("Ang property")}>
      <div className="grid gap-5">
        <AmountField label={t("Asking price")} value={price} onChange={setPrice} hint={t("The advertised price, including the lot.")} />
        <LocationField label={t("Location")} value={loc} onChange={setLoc} />
        <Segmented<HousingType> label={t("Type of home")} value={type} onChange={setType} options={TYPE_OPTIONS} />
      </div>
    </Panel>
  )
  let out
  if (!c || !m || !area) out = <Empty title={t("Overpriced ba ’to?")} text={t("Enter the asking price and where the property is to compare it with the median price of homes bought in that area.")} />
  else {
    const above = c.percent > 0
    out = (
      <div className="grid gap-4" data-testid="overpriced-result">
        <ResultHero
          label={t("Compared with the {area} median", { area: areaName(area) })}
          value={Math.abs(c.percent)}
          format={(n) => `${above ? '+' : c.percent < 0 ? '−' : ''}${n.toFixed(1)}%`}
          tone="soft"
          testId="overpriced-percent"
          caption={
            <>{tx("Ang asking price ay {v0}% {v1} the median of {type} bought with bank loans in {area} ({pesos}, {period}). Difference: {difference}.", { v0: (Math.abs(c.percent).toFixed(1)), v1: (above ? t('above') : c.percent < 0 ? t('below') : t('at')), type: (typeWord(type)), area: (areaName(area)), pesos: (peso(m.pesos)), period: (m.period), difference: (pesoSigned(c.difference)), })}</>
          }
        />
        <div className="card p-5 sm:p-6">
          <h3 className="ui text-[1rem] font-semibold">{t("Hindi ito hatol")}</h3>
          <ul className="ui m-0 mt-2 grid gap-1.5 pl-5 text-[0.9375rem] leading-relaxed text-ink-2">
            <li>{tx("The median covers every size and location in {area}; a bigger home or a better location costs more without being overpriced.", { area: (areaName(area)), })}</li>
            <li>{t("Condition, title status, amenities, developer, flooding history and access all change what a property is worth.")}</li>
            <li>{tx("The median comes from {v0}bank-financed purchases in {period}, not from asking prices. Asking prices are often negotiable.", { v0: (m.loans != null ? `${m.loans.toLocaleString('en-PH')} ` : ''), period: (m.period), })}</li>
            <li>{t("For a valuation of a specific property, ask an accredited appraiser or your lender.")}</li>
          </ul>
        </div>
      </div>
    )
  }
  return <CalcGrid inputs={inputs} result={<div className="grid gap-4">{out}</div>} />
}

// ── Kaya ko ba? ────────────────────────────────────────────────────────

function KayaTab({ median }: { median: MedianFigure | null }) {
  const [price, setPrice] = useState(median?.pesos ?? 0)
  const [down, setDown] = useState(20)
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(0)
  const [gross, setGross] = useState(0)
  const [takeHome, setTakeHome] = useState(0)
  const [debts, setDebts] = useState(0)
  const [upfront, setUpfront] = useState(0)
  const result = useMemo(() => {
    if (!(price > 0) || !(rate >= 0) || rate === 0) return null
    try {
      return loanAffordability({ price, downPercent: down, years, annualRate: rate, grossMonthly: gross, takeHomeMonthly: takeHome, otherDebts: debts, otherUpfront: upfront })
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Check the figures.' }
    }
  }, [price, down, years, rate, gross, takeHome, debts, upfront])
  const ref = data.loanRates[0]
  const refSource = data.sources.find((s) => s.id === ref.source)!

  const inputs = (
    <Panel as="form" title={t("Ang loan")}>
      <div className="grid gap-5">
        <AmountField label={t("Property price")} value={price} onChange={setPrice} hint={median ? t("Starts at the {area} median ({pesos}). Enter the real price.", { area: areaName(median.area), pesos: peso(median.pesos) }) : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={t("Down payment")} suffix="%" value={down} onChange={setDown} min={0} max={100} step={1} />
          <NumberField label={t("Loan term")} suffix="years" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={30} step={1} />
        </div>
        <div>
          <NumberField label={t("Interest rate a year")} suffix="%" value={rate} onChange={setRate} min={0} max={30} step={0.01} hint={t("Use the rate your lender quotes. Rates are fixed for a period, then reprice.")} />
          <button type="button" onClick={() => setRate(ref.annualRate)} className="ui mt-2 min-h-10 cursor-pointer rounded-full border-0 bg-surface px-3.5 text-[0.8125rem] font-semibold text-ink hover:bg-accent-soft hover:text-accent">
            {ref.annualRate}% · {tv(ref.label)}
          </button>
          <p className="field-hint">
            {tv(ref.note)}{' '}
            <a href={refSource.url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{tx("Source: {organization}", { organization: (refSource.organization), })}</a>
            .
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField label={t("Gross monthly income")} value={gross} onChange={setGross} />
          <AmountField label={t("Monthly take-home pay")} value={takeHome} onChange={setTakeHome} hint={t("Not sure? Use the Sweldo calculator.")} />
          <AmountField label={t("Other monthly debt payments")} value={debts} onChange={setDebts} />
          <AmountField label={t("Other upfront costs (optional)")} value={upfront} onChange={setUpfront} hint={t("Taxes, fees, move-in costs you were quoted.")} />
        </div>
        <p className="ui -mt-1 text-[0.8125rem]">
          <Link to="/sweldo" className="font-semibold text-accent underline underline-offset-2">{t("Compute your take-home pay")}</Link>
        </p>
      </div>
    </Panel>
  )
  let out
  if (!result) out = <Empty title={t("Kaya ba ng sahod ko?")} text={t("Enter the price and the interest rate your lender quotes to see the monthly amortization.")} />
  else if ('error' in result) out = <p className="ui rounded-[22px] bg-warn-soft p-5" role="status">{tv(result.error)}</p>
  else
    out = (
      <div className="grid gap-4" data-testid="kaya-result">
        <ResultHero
          label={t("Monthly amortization")}
          value={result.monthly.toNumber()}
          format={pesoExact}
          testId="kaya-monthly"
          caption={
            <>{tx("{principal} loan at {rate}% for {years} years. Total interest {totalInterest}; you pay {totalPayments} in all.", { principal: (pesoExact(result.principal)), rate: (rate), years: (years), totalInterest: (peso(result.totalInterest)), totalPayments: (peso(result.totalPayments)), })}</>
          }
        />
        <div className="card grid grid-cols-2 gap-5 p-5 sm:grid-cols-3 sm:p-6">
          <dl className="contents">
            <Stat label={t("Down payment")} value={peso(result.downPayment)} testId="kaya-down" />
            <Stat label={t("Cash needed upfront")} value={peso(result.upfront)} note={t("Down payment plus the other costs you entered.")} />
            <Stat label={t("Share of gross income")} value={result.paymentToIncome == null ? '—' : `${result.paymentToIncome.toFixed(1)}%`} testId="kaya-pti" note={result.debtToIncome == null ? t("Enter your income.") : t("{v0}% with your other debts.", { v0: result.debtToIncome.toFixed(1) })} />
            <Stat label={t("Left from take-home")} value={result.remaining == null ? '—' : pesoSigned(result.remaining)} tone={result.remaining && result.remaining.lt(0) ? 'loss' : undefined} testId="kaya-left" note={result.remaining == null ? t("Enter your take-home pay.") : t("After the amortization and other debts.")} />
          </dl>
        </div>
        <p className="ui px-1 text-[0.8125rem] leading-relaxed text-muted">{t("The monthly payment holds while the rate is fixed; it changes when the loan reprices. Lenders set their own limits on how much of your income can go to the loan, and add fire and life insurance to the payment. Ask your lender for an exact computation.")}</p>
      </div>
    )
  return <CalcGrid inputs={inputs} result={<div className="grid gap-4" aria-live="polite">{out}</div>} />
}

// ── Sources ────────────────────────────────────────────────────────────

function Sources() {
  return (
    <div className="grid gap-3">
      <Disclosure title={t("Saan galing ang data?")} size="lg" headingLevel={2} id="bahay-sources">
        <div className="grid max-w-[78ch] gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
          {data.sources.map((s) => (
            <div key={s.id} className="rounded-[18px] bg-ground px-4 py-3.5">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">
                {tv(s.title)}
              </a>
              <p className="ui mt-1 text-[0.875rem] text-muted">{tx("{organization} · {period} · published {v2} · checked {verifiedOn}", { organization: (s.organization), period: (s.period), v2: (s.published.length === 7 ? s.published : dateLabel(s.published)), verifiedOn: (dateLabel(s.verifiedOn)), })}</p>
              <ul className="ui m-0 mt-2 grid gap-1 pl-5 text-[0.875rem]">
                {s.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[0.875rem]">{t("Since 2025 BSP builds the index from the actual acquisition cost of homes financed by bank housing loans (new, pre-owned and foreclosed), reported by universal, commercial and thrift banks. Median prices are copied exactly from the report.")}</p>
        </div>
      </Disclosure>
      <Disclosure title={t("Ano ang hindi kasama, at bakit")} size="lg" headingLevel={2} id="bahay-excluded">
        <ul className="ui m-0 grid max-w-[78ch] gap-2.5 pl-5 text-[0.9375rem] leading-relaxed text-ink-2">
          {data.excluded.map((x) => (
            <li key={x.name}>
              <strong>{tv(x.name)}.</strong> {tv(x.reason)}
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="card p-6 sm:p-8">
      <h2 className="text-[1.5rem] leading-tight">{tv(title)}</h2>
      <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-muted">{text}</p>
    </div>
  )
}
