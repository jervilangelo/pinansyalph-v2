import { AnimatePresence } from 'motion/react'
import { Copy, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { entryFor, household, kindOf, sanitizeEntries, simulateReduction, usage, type ApplianceEntry, type Household } from '../../calculators/konsumo'
import { INDICATIVE_RATES, RATES_NOT_INCLUDED } from '../../data/electricityRates'
import { Link } from '../../router'
import { dateLabel, peso, pesoExact } from '../../utils/format'
import { ToolMark } from '../brand/ToolMark'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { Segmented, SliderField } from '../ui/fields'
import { DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { ApplianceForm } from './konsumo/ApplianceForm'

const STORE = 'pp-konsumo-v1'
type RateChoice = 'meralco' | 'veco' | 'custom'
interface Stored {
  entries: ApplianceEntry[]
  rateChoice: RateChoice
  customRate: number
}

const kwh = (n: number, d = 2) => `${n.toLocaleString('en-PH', { maximumFractionDigits: d })} kWh`
const hrs = (n: number) => (n === 1 ? '1 hr' : `${n.toLocaleString('en-PH', { maximumFractionDigits: 2 })} hrs`)
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `a${Date.now()}${Math.random().toString(36).slice(2, 8)}`)

/** A small starting household, so the page shows an answer before any typing. */
const STARTER: [string, string][] = [
  ['aircon-inverter', '1hp'],
  ['refrigerator', 'two-door'],
  ['fan', 'stand'],
  ['tv', '43'],
]

function load(): Stored {
  const fallback: Stored = { entries: [], rateChoice: 'meralco', customRate: INDICATIVE_RATES[0].perKwh }
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Stored> | null
    if (!raw) return fallback
    const rateChoice: RateChoice = raw.rateChoice === 'veco' || raw.rateChoice === 'custom' ? raw.rateChoice : 'meralco'
    const customRate = typeof raw.customRate === 'number' && raw.customRate > 0 && raw.customRate <= 100 ? raw.customRate : fallback.customRate
    return { entries: sanitizeEntries(raw.entries), rateChoice, customRate }
  } catch {
    return fallback
  }
}

function useHousehold() {
  const [state, setState] = useState<Stored>(load)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      localStorage.setItem(STORE, JSON.stringify(state))
    } catch {
      /* storage blocked: the list still works for this visit */
    }
  }, [state])
  const rate = state.rateChoice === 'custom' ? state.customRate : INDICATIVE_RATES.find((r) => r.id === state.rateChoice)!.perKwh
  return {
    ...state,
    rate,
    add: (e: Omit<ApplianceEntry, 'id'>) => setState((s) => ({ ...s, entries: [...s.entries, { ...e, id: newId() }] })),
    update: (id: string, e: Omit<ApplianceEntry, 'id'>) => setState((s) => ({ ...s, entries: s.entries.map((x) => (x.id === id ? { ...e, id } : x)) })),
    duplicate: (id: string) =>
      setState((s) => {
        const i = s.entries.findIndex((x) => x.id === id)
        if (i < 0) return s
        const copy = { ...s.entries[i], id: newId(), name: `${s.entries[i].name} (copy)`.slice(0, 80) }
        return { ...s, entries: [...s.entries.slice(0, i + 1), copy, ...s.entries.slice(i + 1)] }
      }),
    remove: (id: string) => setState((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== id) })),
    clear: () => setState((s) => ({ ...s, entries: [] })),
    setRate: (rateChoice: RateChoice, customRate?: number) => setState((s) => ({ ...s, rateChoice, customRate: customRate ?? s.customRate })),
  }
}

export function KonsumoSection() {
  const h = useHousehold()
  const [editing, setEditing] = useState<ApplianceEntry | null>(null)
  const summary = useMemo(() => household(h.entries, h.rate), [h.entries, h.rate])

  return (
    <section id="konsumo" aria-labelledby="konsumo-title">
      <ToolHeader
        path="/magkano-konsumo"
        id="konsumo-title"
        title={
          <span className="flex items-start gap-4">
            <ToolMark path="/magkano-konsumo" size={56} className="mt-1 hidden sm:block" />
            <span>Magkano Konsumo Ko?</span>
          </span>
        }
        lede={
          <>
            <span className="font-semibold text-ink">Alamin kung magkano ang kinakain ng kuryente ng mga appliances mo.</span> Add your appliances, set how long they run, and see what each costs a
            day, a month and a year.
          </>
        }
        meta={<StatusTag status="verified" extra={`Rates from Meralco and Visayan Electric; appliance figures are estimates, not meter readings`} />}
      />

      <div className="wrap grid gap-4">
        <RateBar choice={h.rateChoice} rate={h.rate} setRate={h.setRate} />

        <CalcGrid
          inputs={
            <>
              <Panel title={editing ? `Edit ${editing.name}` : 'Add an appliance'} as="section">
                <ApplianceForm
                  key={editing?.id ?? 'new'}
                  editing={editing}
                  rate={h.rate}
                  onSubmit={(e) => {
                    if (editing) {
                      h.update(editing.id, e)
                      setEditing(null)
                    } else h.add(e)
                  }}
                  onCancel={editing ? () => setEditing(null) : undefined}
                />
              </Panel>
              <Panel title="Your household" as="section">
                <ApplianceList h={h} summary={summary} onEdit={setEditing} />
              </Panel>
            </>
          }
          result={<Totals summary={summary} rate={h.rate} />}
        />

        {summary.count > 0 && <Breakdown summary={summary} />}
        {summary.count > 0 && <ReduceSim entries={h.entries} rate={h.rate} />}
        <Sources />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function RateBar({ choice, rate, setRate }: { choice: RateChoice; rate: number; setRate: (c: RateChoice, custom?: number) => void }) {
  const src = INDICATIVE_RATES.find((r) => r.id === choice)
  return (
    <section aria-labelledby="rate-title" className="card grid gap-5 p-5 sm:p-7 lg:grid-cols-12 lg:items-start lg:gap-8">
      <div className="lg:col-span-5">
        <h2 id="rate-title" className="text-[1.5rem] leading-tight">
          Your rate per kWh
        </h2>
        <p className="ui mt-2 text-[0.9375rem] leading-relaxed text-muted">The most accurate rate is your own: your bill’s total amount ÷ its kWh. The utility rates here are indicative only.</p>
      </div>
      <div className="grid gap-4 lg:col-span-7">
        <Segmented<RateChoice>
          label="Rate"
          hideLabel
          value={choice}
          onChange={(c) => setRate(c, c === 'custom' ? rate : undefined)}
          options={[
            { value: 'meralco', label: 'Meralco' },
            { value: 'veco', label: 'Visayan Electric' },
            { value: 'custom', label: 'My own rate' },
          ]}
        />
        <SliderField
          label="Rate per kWh"
          value={rate}
          onChange={(v) => setRate('custom', Math.round(v * 100) / 100)}
          min={1}
          max={30}
          step={0.01}
          exact
          suffix="₱/kWh"
          testId="rate-value"
          format={(v) => `₱${v.toFixed(2)}/kWh`}
          hint={
            src ? (
              <span data-testid="rate-source">
                Indicative {src.utility} residential rate, {src.billingPeriod}. {src.basis}{' '}
                <a href={src.sourceUrl} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                  Source
                </a>
                , checked {dateLabel(src.verifiedOn)}. Not your exact rate.
              </span>
            ) : (
              <span data-testid="rate-source">Your own rate, from your bill: total amount ÷ kWh used.</span>
            )
          }
        />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function ApplianceList({ h, summary, onEdit }: { h: ReturnType<typeof useHousehold>; summary: Household; onEdit: (e: ApplianceEntry) => void }) {
  const reduce = useReducedMotion()
  if (!h.entries.length) {
    return (
      <div data-testid="konsumo-empty">
        <p className="text-ink-2">Nothing added yet. Search for an appliance above, or start with a typical home:</p>
        <button
          type="button"
          className="btn btn-soft mt-4"
          onClick={() => {
            for (const [t, o] of STARTER) {
              const e = entryFor(t, o)
              if (e) h.add(e)
            }
          }}
        >
          Add aircon, ref, electric fan and TV
        </button>
      </div>
    )
  }
  const top = summary.items[0]?.entry.id
  return (
    <>
      <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] p-0" data-testid="appliance-list">
        <AnimatePresence initial={false}>
          {h.entries.map((e) => {
            const u = usage(e, h.rate)
            return (
              <motion.li
                key={e.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0"
                data-testid="appliance-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-snug font-semibold">
                    <span>{e.name}</span>
                    {e.units > 1 && <span className="ui text-[0.875rem] font-medium text-muted">×{e.units}</span>}
                    {e.id === top && h.entries.length > 1 && <span className="ui rounded-full bg-sun-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-warn">Pinakamalakas</span>}
                  </p>
                  <p className="ui mt-0.5 text-[0.8125rem] leading-snug text-muted">
                    {e.basis === 'label'
                      ? `Energy label: ${e.labelKwh.toLocaleString('en-PH')} kWh a ${e.labelUnit}`
                      : `${e.watts.toLocaleString('en-PH')} W · ${hrs(e.hoursPerDay)} a day · ${e.daysPerMonth} days${kindOf(e) !== 'continuous' || e.fullPowerShare < 1 ? ` · ${Math.round(e.fullPowerShare * 100)}% at full power` : ''}`}
                  </p>
                </div>
                <p className="figure m-0 text-right text-[1.125rem] leading-tight whitespace-nowrap">
                  {peso(u.monthlyCost)}
                  <span className="ui block text-[0.75rem] font-medium text-muted">{kwh(u.monthlyKwh, 1)}/mo</span>
                </p>
                <div className="grid shrink-0 grid-cols-1 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface hover:text-ink"
                  >
                    <Pencil aria-hidden="true" size={16} />
                    <span className="sr-only">Edit {e.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => h.duplicate(e.id)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface hover:text-ink"
                  >
                    <Copy aria-hidden="true" size={16} />
                    <span className="sr-only">Duplicate {e.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => h.remove(e.id)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-loss-soft hover:text-loss"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                    <span className="sr-only">Remove {e.name}</span>
                  </button>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      <div className="ui mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[0.8125rem] text-muted">
        <p>Saved only in this browser, on this device. Nothing is sent anywhere.</p>
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-loss underline-offset-4 hover:underline"
          onClick={() => {
            if (window.confirm('Remove all appliances from this browser?')) h.clear()
          }}
        >
          Clear all
        </button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Totals({ summary, rate }: { summary: Household; rate: number }) {
  const empty = summary.count === 0
  const hi = summary.items[0]
  const lo = summary.items[summary.items.length - 1]
  return (
    <>
      <ResultHero
        label="Konsumo bawat buwan"
        value={summary.monthlyCost}
        format={pesoExact}
        tone={empty ? 'soft' : 'accent'}
        testId="konsumo-monthly-cost"
        caption={
          empty ? (
            'Add an appliance to see its cost.'
          ) : (
            <>
              <span data-testid="konsumo-monthly-kwh">{kwh(summary.monthlyKwh)}</span> a month at ₱{rate.toFixed(2)}/kWh, about{' '}
              <span data-testid="konsumo-annual-cost">{pesoExact(summary.annualCost)}</span> a year. An estimate: your bill also has fixed charges and appliances not listed here.
            </>
          )
        }
      />
      {!empty && (
        <Panel>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-5">
            <Stat label="A day, on average" value={kwh(summary.dailyKwh)} note={`${pesoExact(summary.dailyCost)} a day`} testId="konsumo-daily-kwh" />
            <Stat label="A year" value={kwh(summary.annualKwh, 0)} note={`${pesoExact(summary.annualCost)} a year`} />
            <Stat label="Uses the most" value={<span data-testid="konsumo-highest">{hi.entry.name}</span>} note={`${pesoExact(hi.monthlyCost)} a month, ${hi.percent}% of the total`} />
            {summary.count > 1 && <Stat label="Uses the least" value={<span data-testid="konsumo-lowest">{lo.entry.name}</span>} note={`${pesoExact(lo.monthlyCost)} a month`} />}
          </dl>
        </Panel>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */

function Breakdown({ summary }: { summary: Household }) {
  const max = summary.items[0]?.monthlyCost || 1
  return (
    <Panel title="Saan napupunta ang kuryente" intro="Each appliance’s estimated monthly cost and its share of the total, highest first." as="section">
      <table className="ui w-full border-collapse text-[0.9375rem]" data-testid="konsumo-breakdown">
        <caption className="sr-only">Monthly cost per appliance</caption>
        <thead>
          <tr className="border-b border-line text-left text-[0.8125rem] text-muted">
            <th scope="col" className="py-2 font-medium">
              Appliance
            </th>
            <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">
              kWh a month
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Monthly cost
            </th>
            <th scope="col" className="w-[4.5rem] py-2 text-right font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.items.map((it) => (
            <tr key={it.entry.id} className="border-b border-line last:border-b-0">
              <th scope="row" className="py-3 pr-3 text-left font-medium">
                <span className="block">{it.entry.name}</span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(it.monthlyCost / max) * 100}%` }} />
                </span>
              </th>
              <td className="tabular hidden py-3 text-right text-ink-2 sm:table-cell">{it.monthlyKwh.toLocaleString('en-PH', { maximumFractionDigits: 1 })}</td>
              <td className="tabular py-3 pl-3 text-right font-semibold">{pesoExact(it.monthlyCost)}</td>
              <td className="tabular py-3 text-right text-muted">{it.percent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

function ReduceSim({ entries, rate }: { entries: ApplianceEntry[]; rate: number }) {
  const [hours, setHours] = useState<Record<string, number>>({})
  const adjustable = entries.filter((e) => e.basis === 'watts' && e.hoursPerDay > 0)
  const sim = simulateReduction(entries, hours, rate)
  const changed = sim.savedKwh > 0
  return (
    <section aria-labelledby="reduce-title" className="grid gap-4 rounded-[28px] bg-night p-5 text-night-ink sm:p-8 lg:grid-cols-12 lg:gap-8 lg:p-12" data-testid="reduce-sim">
      <div className="lg:col-span-7">
        <h2 id="reduce-title" className="text-step-head">
          Paano kung bawasan ko?
        </h2>
        <p className="mt-3 max-w-[48ch] text-[1.0625rem] leading-relaxed text-night-muted">Slide an appliance to fewer hours a day and see what you would save. Your list is not changed.</p>
        {adjustable.length ? (
          <ul className="m-0 mt-8 grid list-none gap-6 p-0">
            {adjustable.map((e) => {
              const now = hours[e.id] ?? e.hoursPerDay
              return (
                <li key={e.id} className="reduce-slider">
                  <div className="ui flex items-baseline justify-between gap-3">
                    <label htmlFor={`reduce-${e.id}`} className="text-[0.9375rem] font-semibold">
                      {e.name}
                    </label>
                    <span className="figure text-[1.125rem] whitespace-nowrap">
                      {now !== e.hoursPerDay && <span className="mr-2 text-[0.9375rem] text-night-muted line-through">{hrs(e.hoursPerDay)}</span>}
                      {hrs(now)} a day
                    </span>
                  </div>
                  <input
                    id={`reduce-${e.id}`}
                    type="range"
                    min={0}
                    max={e.hoursPerDay}
                    step={0.25}
                    value={now}
                    onChange={(ev) => setHours((x) => ({ ...x, [e.id]: Number(ev.target.value) }))}
                    className="mt-2 h-11 w-full accent-[var(--color-sun)]"
                    aria-valuetext={`${hrs(now)} a day, was ${hrs(e.hoursPerDay)}`}
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="ui mt-6 text-night-muted">Appliances entered from an energy label have no hours to reduce.</p>
        )}
        {changed && (
          <button
            type="button"
            onClick={() => setHours({})}
            className="ui mt-6 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-[0.9375rem] font-semibold text-night-ink underline-offset-4 hover:underline"
          >
            <RotateCcw aria-hidden="true" size={16} /> Reset to my usage
          </button>
        )}
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-[calc(var(--header-h)+20px)] lg:self-start" aria-live="polite">
        <p className="ui text-[0.9375rem] font-semibold text-night-muted">Matitipid mo sa isang taon</p>
        <p className="figure mt-3 text-[clamp(2.75rem,2rem+3vw,4.5rem)] leading-[0.95] text-sun" data-testid="reduce-annual">
          {pesoExact(sim.annualSavings)}
        </p>
        <dl className="ui m-0 mt-8 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/15 pt-6">
          {[
            ['Saved a month', pesoExact(sim.monthlySavings), 'reduce-monthly'],
            ['Less electricity', `${sim.percent.toFixed(1)}%`, 'reduce-pct'],
            ['Before', `${kwh(sim.beforeKwh, 1)}/mo`, 'reduce-before'],
            ['After', `${kwh(sim.afterKwh, 1)}/mo`, 'reduce-after'],
          ].map(([l, v, t]) => (
            <div key={t}>
              <dt className="text-[0.8125rem] text-night-muted">{l}</dt>
              <dd className="figure m-0 mt-1 text-[1.375rem] leading-tight" data-testid={t}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Sources() {
  return (
    <Disclosure title="How the estimate works, and its limits" id="sources">
      <div className="grid gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
        <p>
          <strong className="font-semibold text-ink">kWh a month</strong> = watts × hours a day × days a month × units × share of time at full power ÷ 1,000. Cost = kWh × your rate. A year is 12
          months; a week is a year ÷ 52.
        </p>
        <p>
          <strong className="font-semibold text-ink">Rated, typical and actual are different.</strong> The rated wattage on the label is the most the appliance draws. Refrigerators, irons and
          non-inverter aircons switch on and off; inverter aircons, induction cookers and computers run below their rating most of the time. The “share of time at full power” turns the rating into a
          typical figure. For a refrigerator or aircon, the kWh on its Philippine Energy Label is a better estimate than either.
        </p>
        <p>
          <strong className="font-semibold text-ink">Presets are starting points.</strong> They are typical ratings of common models, not measurements of your unit. The 16-inch stand fan (50–60 W) is
          Meralco’s own test unit. A plug-in watt meter gives your real figure.
        </p>
        <p>
          <strong className="font-semibold text-ink">Rates.</strong> {INDICATIVE_RATES.map((r) => `${r.utility}: ₱${r.perKwh.toFixed(2)}/kWh, ${r.billingPeriod}.`).join(' ')} Visayan Electric
          announced an October adjustment that could not be read because its site limited automated requests; check your own bill. {RATES_NOT_INCLUDED} Only residential rates are shown; commercial and
          industrial rates differ. For a full Meralco bill check, use{' '}
          <Link to="/magkano-kuryente" className="text-accent underline underline-offset-2">
            Magkano Kuryente Ko?
          </Link>
          .
        </p>
        <p className="text-[0.8125rem] text-muted">Estimates for comparison only. Your bill is the authority.</p>
      </div>
    </Disclosure>
  )
}
