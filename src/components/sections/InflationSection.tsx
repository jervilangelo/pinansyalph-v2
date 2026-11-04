import { useState } from 'react'
import { InflationHistoryChart } from '../../charts/lazy'
import { INFLATION_SERIES } from '../../charts/common'
import { headlineContext, inflation, latestOf, recentAverageInflation } from '../../data'
import type { InflationSeriesKey } from '../../types/data'
import { dateLabel, monthLabel, pct } from '../../utils/format'
import { Segmented } from '../ui/fields'
import { AnimatedNumber, Reveal, motion, useReducedMotion, EASE } from '../ui/motion'
import { StatusTag } from '../ui/Status'

const BAR_COUNT = 13

function Bars() {
  const reduce = useReducedMotion()
  const obs = inflation.series.headline.slice(-BAR_COUNT)
  const max = Math.max(...obs.map((o) => o.value), 1)
  const [active, setActive] = useState<number | null>(null)
  const labelled = new Set([0, Math.floor(obs.length / 2), obs.length - 1])

  return (
    <div data-ui className="relative">
      {/* Desktop/tablet: bars stand on the bottom edge */}
      <ol className="m-0 hidden h-[52vh] max-h-[560px] min-h-[320px] list-none items-end gap-2 p-0 sm:grid" style={{ gridTemplateColumns: `repeat(${obs.length}, minmax(0, 1fr))` }} aria-label="Headline inflation, last 13 months">
        {obs.map((o, i) => {
          const latest = i === obs.length - 1
          const h = Math.max((Math.max(o.value, 0) / max) * 100, 1.5)
          const show = labelled.has(i) || active === i
          return (
            <li key={o.period} className="relative flex h-full flex-col justify-end">
              <button
                type="button"
                className="group relative flex h-full w-full flex-col items-stretch justify-end focus-visible:outline-offset-4"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${monthLabel(o.period)}: ${pct(o.value)}`}
              >
                <span className={`ui mb-2 text-center tabular text-[clamp(0.9375rem,1.3vw,1.375rem)] font-semibold transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`}>{pct(o.value)}</span>
                <motion.span
                  className={`block w-full origin-bottom ${latest ? 'bg-accent' : 'bg-surface-2 group-hover:bg-[#c9c5ba]'} transition-colors`}
                  style={{ height: `${h}%` }}
                  initial={reduce ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.04, ease: EASE }}
                />
              </button>
              <span className={`ui mt-2 text-center text-[0.8125rem] ${latest ? 'font-semibold' : 'text-muted'}`}>{monthLabel(o.period, true).replace(' 20', ' ’')}</span>
            </li>
          )
        })}
      </ol>

      {/* Phone: bars grow sideways */}
      <ol className="m-0 grid list-none gap-1.5 p-0 sm:hidden" aria-label="Headline inflation, last 8 months">
        {obs.slice(-8).map((o, i, arr) => {
          const latest = i === arr.length - 1
          return (
            <li key={o.period} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
              <span className={`ui text-[0.875rem] ${latest ? 'font-semibold' : 'text-muted'}`}>{monthLabel(o.period, true).replace(' 20', ' ’')}</span>
              <span className="relative block h-7">
                <motion.span
                  className={`absolute inset-y-0 left-0 block origin-left ${latest ? 'bg-accent' : 'bg-surface-2'}`}
                  style={{ width: `${Math.max((Math.max(o.value, 0) / max) * 100, 2)}%` }}
                  initial={reduce ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: EASE }}
                />
                <span className={`ui absolute inset-y-0 left-2 flex items-center text-[0.875rem] font-semibold tabular ${latest ? 'text-accent-ink' : ''}`}>{pct(o.value)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Kpi({ k, label, note }: { k: InflationSeriesKey; label: string; note: string }) {
  const l = latestOf(k)
  const diff = l.value - l.previous.value
  return (
    <div className="bg-paper p-5">
      <p className="ui text-[0.9375rem] font-semibold">{label}</p>
      <p className="mt-2 tabular text-[2.5rem] leading-none font-medium tracking-[-0.02em]">
        <AnimatedNumber value={l.value} format={(n) => pct(n)} />
      </p>
      <p className="ui mt-2 text-[0.9375rem]">
        {diff === 0 ? 'Same as' : diff > 0 ? `Up ${diff.toFixed(1)} points from` : `Down ${Math.abs(diff).toFixed(1)} points from`} {monthLabel(l.previous.period, true)}
      </p>
      <p className="ui mt-2 text-[0.875rem] text-muted">{note}</p>
    </div>
  )
}

export function InflationSection() {
  const [visible, setVisible] = useState<InflationSeriesKey[]>(['headline', 'food', 'transport'])
  const [range, setRange] = useState<'24' | '60' | 'all'>('60')
  const latest = latestOf('headline')
  const toggle = (k: InflationSeriesKey) => setVisible((v) => (v.includes(k) ? (v.length > 1 ? v.filter((x) => x !== k) : v) : [...v, k]))

  return (
    <section id="inflation" aria-labelledby="inflation-title" className="mt-[clamp(120px,14vw,240px)]">
      {/* Full-bleed field with the bars */}
      <div className="bg-ground pt-4">
        <div className="wrap">
          <Reveal>
            <p className="tabular text-[clamp(5.5rem,13vw,10.5rem)] leading-[0.85] font-medium tracking-[-0.045em]" aria-hidden="true">
              <AnimatedNumber value={latest.value} format={(n) => pct(n)} duration={1.2} />
            </p>
            <h2 id="inflation-title" className="mt-4 text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] leading-[1.1]">
              Philippine inflation, {monthLabel(latest.period)}
            </h2>
            <p className="mt-3 max-w-[48ch] text-ink-2">
              Prices were {pct(latest.value)} higher than a year earlier
              {(() => {
                const c = headlineContext()
                if (!c) return '.'
                const tie = c.tiedWith ? `level with ${monthLabel(c.tiedWith)} and ` : ''
                return c.since ? `, ${tie}the highest since ${monthLabel(c.since)}.` : `, ${tie}the highest in this series.`
              })()}
            </p>
            <div className="mt-3">
              <StatusTag status={inflation.status} extra={`PSA release, retrieved ${dateLabel(inflation.retrievedAt)}`} />
            </div>
          </Reveal>
        </div>
        <div className="mt-12 px-[var(--gutter)]">
          <Bars />
        </div>
      </div>

      <div className="wrap mt-[clamp(72px,8vw,120px)]">
        <div data-ui className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi k="headline" label="Headline" note="All goods and services" />
          <Kpi k="core" label="Core" note="Excludes selected food and energy items" />
          <Kpi k="food" label="Food" note="Food only, excluding drinks" />
          <Kpi k="transport" label="Transport" note="Fuel, fares and vehicles" />
        </div>

        <div className="mt-[clamp(72px,8vw,120px)] grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h3 className="text-[clamp(1.5rem,1.2rem+1vw,2.25rem)]">Since {monthLabel(inflation.series.headline[0].period, true)}</h3>
            <p className="mt-4 text-ink-2">
              Year-on-year change in consumer prices, as published monthly by the Philippine Statistics Authority. The shaded band is
              the Bangko Sentral's 2–4% target. Full years {recentAverageInflation.from}–{recentAverageInflation.to} averaged {pct(recentAverageInflation.value)}.
            </p>
            <fieldset className="ui mt-8 border-0 p-0">
              <legend className="mb-3 p-0 text-[0.9375rem] font-medium">Show</legend>
              <div className="flex flex-wrap gap-2">
                {INFLATION_SERIES.map((sr) => {
                  const on = visible.includes(sr.key)
                  return (
                    <label key={sr.key} className={`flex min-h-11 cursor-pointer items-center gap-2 px-3.5 py-2 text-[0.9375rem] transition-colors ${on ? 'bg-ink text-ground' : 'bg-surface hover:bg-surface-2'}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(sr.key)} />
                      <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: sr.color }} />
                      {sr.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="mt-6 max-w-[22rem]">
              <Segmented
                label="Period"
                value={range}
                onChange={setRange}
                options={[
                  { value: '24', label: '2 years' },
                  { value: '60', label: '5 years' },
                  { value: 'all', label: 'All' },
                ]}
              />
            </div>
          </Reveal>
          <div className="bg-paper p-4 sm:p-6 lg:col-span-8">
            <InflationHistoryChart series={inflation.series} visible={visible} range={range === 'all' ? inflation.series.headline.length : Number(range)} />
          </div>
        </div>
      </div>
    </section>
  )
}
