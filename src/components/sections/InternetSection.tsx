import { BookmarkPlus, Check, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { bestValueId, overpayCheck, planCosts, planProblem, sortPlans, SORTS, type PlanCosts, type SortKey } from '../../calculators/internet'
import { HOUSING_LOCATIONS, searchLocations } from '../../data/housingLocations'
import { CHECKED, NOT_VERIFIED, PLANS, PROVIDERS, planById, providerById, type ConnectionType, type InternetPlan } from '../../data/internetPlans'
import { dateLabel, peso, pesoExact } from '../../utils/format'
import { ToolMark } from '../brand/ToolMark'
import { ToolHeader } from '../layout/Page'
import { Combobox } from '../ui/Combobox'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, SelectField, SliderField, Toggle } from '../ui/fields'
import { CalcGrid, Panel, ResultHero } from '../ui/Result'
import { StatusTag } from '../ui/Status'

const STORE = 'pp-internet-v1'
const MAX_PINNED = 4
const CUSTOM = 'custom'

interface CustomPlan {
  id: string
  name: string
  price: number
  downMbps: number
  upfront: number
  lockInMonths: number
}

interface Saved {
  id: string
  name: string
  planIds: string[]
  savedOn: string
}

interface Stored {
  providerId: string
  planId: string
  bill: number
  advertised: number
  measured: number | null
  pinned: string[]
  custom: CustomPlan[]
  saved: Saved[]
}

const EMPTY: Stored = { providerId: '', planId: '', bill: 0, advertised: 100, measured: null, pinned: [], custom: [], saved: [] }

function load(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Stored> | null
    if (!raw) return EMPTY
    const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
    const custom = (Array.isArray(raw.custom) ? raw.custom : [])
      .filter((c): c is CustomPlan => !!c && typeof c.id === 'string' && typeof c.name === 'string' && c.price > 0 && c.downMbps > 0)
      .slice(0, 20)
    const known = (id: unknown) => typeof id === 'string' && (!!planById(id) || custom.some((c) => c.id === id))
    return {
      providerId: typeof raw.providerId === 'string' ? raw.providerId : '',
      planId: typeof raw.planId === 'string' ? raw.planId : '',
      bill: num(raw.bill, 0),
      advertised: num(raw.advertised, 100) || 100,
      measured: typeof raw.measured === 'number' && raw.measured > 0 ? raw.measured : null,
      pinned: (Array.isArray(raw.pinned) ? raw.pinned : []).filter(known).slice(0, MAX_PINNED),
      custom,
      saved: (Array.isArray(raw.saved) ? raw.saved : []).filter((s): s is Saved => !!s && typeof s.name === 'string' && Array.isArray(s.planIds)).slice(0, 20),
    }
  } catch {
    return EMPTY
  }
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const mbps = (n: number | null) => (n == null ? 'Not stated' : n >= 1000 ? `${n / 1000} Gbps` : `${n} Mbps`)
const perMbps = (n: number | null) => (n == null ? 'No speed stated' : `${pesoExact(n)}/Mbps`)
const lockIn = (n: number | null) => (n == null ? 'Not stated' : n === 0 ? 'None' : `${n} months`)

/** A custom plan in the same shape as directory plans, so it can be compared. */
function asPlan(c: CustomPlan): InternetPlan {
  return {
    id: c.id,
    providerId: CUSTOM,
    name: c.name,
    connection: 'fiber',
    billing: 'postpaid',
    price: c.price,
    downMbps: c.downMbps,
    upMbps: null,
    dataCap: 'unlimited',
    upfront: c.upfront,
    lockInMonths: c.lockInMonths,
    availability: 'Your own entry.',
    status: 'current',
    source: { url: '', checked: '' },
  }
}

function ProviderTile({ providerId, size = 40 }: { providerId: string; size?: number }) {
  const p = providerById(providerId)
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, background: p?.color ?? 'var(--color-surface-2)', fontSize: size * 0.3 }}
      className="ui flex shrink-0 items-center justify-center rounded-[28%] leading-none font-bold tracking-tight text-white"
    >
      {p ? p.short.slice(0, p.short.length > 5 ? 2 : 5) : <span className="text-ink-2">You</span>}
    </span>
  )
}

export function InternetSection() {
  const [s, setS] = useState<Stored>(load)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      localStorage.setItem(STORE, JSON.stringify(s))
    } catch {
      /* storage blocked */
    }
  }, [s])
  const set = (patch: Partial<Stored>) => setS((x) => ({ ...x, ...patch }))

  const allPlans = useMemo(() => [...PLANS, ...s.custom.map(asPlan)], [s.custom])
  const rows = useMemo(() => allPlans.map((plan) => ({ plan, costs: planCosts(plan) })), [allPlans])
  const togglePin = (id: string) => setS((x) => ({ ...x, pinned: x.pinned.includes(id) ? x.pinned.filter((p) => p !== id) : x.pinned.length >= MAX_PINNED ? x.pinned : [...x.pinned, id] }))

  return (
    <section id="internet" aria-labelledby="internet-title">
      <ToolHeader
        path="/sulit-internet"
        id="internet-title"
        title={
          <span className="flex items-start gap-4">
            <ToolMark path="/sulit-internet" size={56} className="mt-1 hidden sm:block" />
            <span>Sulit Ba Internet Ko?</span>
          </span>
        }
        lede={
          <>
            <span className="font-semibold text-ink">Sulit ba talaga ang internet mo, o baka may mas mura at mas mabilis?</span> See what you pay per Mbps and compare it with verified plans from PLDT,
            Globe, Converge, Starlink, Smart and DITO.
          </>
        }
        meta={<StatusTag status="verified" extra={`Prices from each provider’s own page, checked ${dateLabel(CHECKED)}`} />}
      />
      <div className="wrap grid gap-4">
        <YourPlan s={s} set={set} pinned={s.pinned} togglePin={togglePin} />
        <ComparePlans rows={rows} s={s} set={set} togglePin={togglePin} />
        <Location />
        <Methodology />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function YourPlan({ s, set, pinned, togglePin }: { s: Stored; set: (p: Partial<Stored>) => void; pinned: string[]; togglePin: (id: string) => void }) {
  const plans = PLANS.filter((p) => p.providerId === s.providerId)
  const chosen = planById(s.planId)
  const input = { bill: s.bill, advertisedMbps: s.advertised, actualMbps: s.measured }
  const problem = planProblem(input)
  const result = problem ? null : overpayCheck(input, PLANS)

  const pickPlan = (id: string) => {
    const p = planById(id)
    if (!p) return set({ planId: id })
    const c = planCosts(p)
    set({ planId: id, bill: c.monthly, advertised: p.downMbps ?? s.advertised })
  }

  return (
    <CalcGrid
      inputs={
        <Panel title="Your current plan" intro="Pick your provider and plan, then adjust the bill to what you actually pay." as="section">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Provider"
                value={s.providerId || 'none'}
                onChange={(v) => set({ providerId: v === 'none' ? '' : v, planId: v === CUSTOM ? CUSTOM : '' })}
                options={[{ value: 'none', label: 'Choose your provider' }, ...PROVIDERS.map((p) => ({ value: p.id, label: p.name })), { value: CUSTOM, label: 'Other provider' }]}
              />
              {s.providerId && s.providerId !== CUSTOM && (
                <SelectField
                  label="Plan"
                  value={s.planId || 'none'}
                  onChange={(v) => (v === 'none' ? set({ planId: '' }) : pickPlan(v))}
                  options={[
                    { value: 'none', label: 'Choose your plan' },
                    ...plans.map((p) => ({ value: p.id, label: `${p.name} · ${peso(p.price)}` })),
                    { value: CUSTOM, label: 'My plan is not listed' },
                  ]}
                />
              )}
            </div>
            {chosen && (
              <p className="ui rounded-[14px] bg-ground px-4 py-3 text-[0.875rem] leading-relaxed text-ink-2" data-testid="plan-note">
                {chosen.status === 'announced' ? (
                  <strong className="font-semibold text-warn">Announced {dateLabel(chosen.source.published!)}, not re-confirmed. </strong>
                ) : (
                  <strong className="font-semibold text-gain">Verified on {providerById(chosen.providerId)!.short}’s own page. </strong>
                )}
                {chosen.billing === 'prepaid' && chosen.periodDays ? `A ${chosen.periodDays}-day load of ${peso(chosen.price)} works out to ${pesoExact(planCosts(chosen).monthly)} a month. ` : ''}
                {chosen.note}{' '}
                <a href={chosen.source.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                  Source
                </a>
              </p>
            )}
            <AmountField label="What you actually pay a month" value={s.bill} onChange={(v) => set({ bill: v })} hint="From your latest bill, including any add-ons you pay for every month." />
            <SliderField
              label="Advertised download speed"
              value={s.advertised}
              onChange={(v) => set({ advertised: v })}
              min={5}
              max={2000}
              step={5}
              exact
              suffix="Mbps"
              testId="advertised-value"
              format={(v) => mbps(v)}
            />
            <Toggle
              label="I measured my actual speed"
              checked={s.measured != null}
              onChange={(on) => set({ measured: on ? Math.max(1, Math.round(s.advertised / 2)) : null })}
              description="Use a speed test on a wired connection for the fairest number."
            />
            {s.measured != null && (
              <SliderField
                label="Measured download speed"
                value={s.measured}
                onChange={(v) => set({ measured: v })}
                min={1}
                max={Math.max(2000, s.measured)}
                step={1}
                exact
                suffix="Mbps"
                testId="measured-value"
                format={(v) => mbps(v)}
              />
            )}
          </div>
        </Panel>
      }
      result={
        <>
          <ResultHero
            label="You pay per Mbps"
            value={result?.perMbps ?? 0}
            format={(n) => `${pesoExact(n)}`}
            tone={result ? 'accent' : 'soft'}
            testId="your-per-mbps"
            caption={
              result ? (
                <>
                  {pesoExact(s.bill)} a month ÷ {mbps(s.advertised)} advertised. <span data-testid="your-annual">{pesoExact(result.annual)}</span> a year.
                  {result.actualPerMbps != null && (
                    <>
                      {' '}
                      At your measured {mbps(s.measured)}, it is{' '}
                      <strong className="font-semibold text-white" data-testid="your-actual-per-mbps">
                        {pesoExact(result.actualPerMbps)}
                      </strong>{' '}
                      per Mbps.
                    </>
                  )}
                </>
              ) : (
                (problem ?? 'Enter your bill and speed.')
              )
            }
          />
          {result && (
            <Panel title="Am I overpaying?" as="section">
              <p className="text-[1.0625rem] leading-relaxed" data-testid="overpay-message">
                Your current plan costs <strong className="font-semibold">{pesoExact(result.perMbps)} per Mbps</strong>.{' '}
                {result.cheaperPerMbps > 0
                  ? `${result.cheaperPerMbps} of the ${result.compared} verified plans listed here offer a lower price per Mbps.`
                  : `None of the ${result.compared} verified plans listed here offers a lower price per Mbps.`}
              </p>
              <p className="ui mt-2 text-[0.8125rem] text-muted">Compared only with the plans in this list, not the whole market, and only where those plans are available at your address.</p>
              {result.fasterForLess.length > 0 && (
                <>
                  <h3 className="ui mt-5 text-[0.9375rem] font-semibold">As fast or faster, for less a month</h3>
                  <ul className="m-0 mt-2 grid list-none gap-2 p-0" data-testid="faster-for-less">
                    {result.fasterForLess.slice(0, 3).map((a) => (
                      <li key={a.plan.id} className="flex items-center gap-3 rounded-[16px] bg-ground p-3">
                        <ProviderTile providerId={a.plan.providerId} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.9375rem] font-semibold">{a.plan.name}</span>
                          <span className="ui block text-[0.8125rem] text-muted">
                            {mbps(a.plan.downMbps)} · {pesoExact(a.costs.monthly)}/mo ·{' '}
                            {a.firstYearSavings > 0 ? `${pesoExact(a.firstYearSavings)} less in year one, fees included` : 'one-time fees cancel out the first-year saving'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePin(a.plan.id)}
                          aria-pressed={pinned.includes(a.plan.id)}
                          className="ui shrink-0 cursor-pointer rounded-full border-0 bg-paper px-3 py-2 text-[0.8125rem] font-semibold text-accent hover:bg-accent-soft"
                        >
                          {pinned.includes(a.plan.id) ? 'Comparing' : 'Compare'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="ui mt-4 text-[0.8125rem] text-muted">Cheapest per Mbps is not automatically best: reliability, upload speed, support and coverage at your address matter too.</p>
            </Panel>
          )}
        </>
      }
    />
  )
}

/* ------------------------------------------------------------------ */

type ConnFilter = 'all' | ConnectionType

function ComparePlans({ rows, s, set, togglePin }: { rows: { plan: InternetPlan; costs: PlanCosts }[]; s: Stored; set: (p: Partial<Stored>) => void; togglePin: (id: string) => void }) {
  const [sort, setSort] = useState<SortKey>('perMbps')
  const [conn, setConn] = useState<ConnFilter>('all')
  const [announced, setAnnounced] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const shown = sortPlans(
    rows.filter((r) => (conn === 'all' || r.plan.connection === conn) && (announced || r.plan.status === 'current')),
    sort,
  )
  const best = bestValueId(shown)
  const pinnedRows = s.pinned.map((id) => rows.find((r) => r.plan.id === id)).filter((r): r is { plan: InternetPlan; costs: PlanCosts } => !!r)

  return (
    <section aria-labelledby="compare-title" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="card p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <h2 id="compare-title" className="text-[1.75rem] leading-tight">
              Compare plans
            </h2>
            <p className="ui mt-2 text-[0.9375rem] text-muted">Tick up to {MAX_PINNED} plans to see them side by side. “Best value” means the lowest price per Mbps, nothing more.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <SelectField<SortKey> label="Sort by" value={sort} onChange={setSort} options={SORTS.map((x) => ({ value: x.id, label: x.label }))} />
            <SelectField<ConnFilter>
              label="Connection"
              value={conn}
              onChange={setConn}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'fiber', label: 'Fiber' },
                { value: 'fixed-wireless', label: 'Wireless (4G/5G)' },
                { value: 'satellite', label: 'Satellite' },
              ]}
            />
            <div className="sm:col-span-2">
              <Toggle
                label="Include plans from older announcements"
                checked={announced}
                onChange={setAnnounced}
                description="Prices from official announcements we could not re-confirm on a live page."
              />
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="ui mt-6 hidden grid-cols-[auto_auto_minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-x-3 pb-2 text-right text-[0.8125rem] font-medium text-muted md:grid">
          <span className="w-5" />
          <span className="w-9" />
          <span className="text-left">Plan</span>
          <span>Monthly</span>
          <span>Speed</span>
          <span>₱ per Mbps</span>
          <span>First year</span>
        </div>
        <ul className="m-0 mt-2 grid list-none grid-cols-[minmax(0,1fr)] p-0 md:mt-0" data-testid="plan-list">
          {shown.map(({ plan, costs }) => {
            const on = s.pinned.includes(plan.id)
            const full = !on && s.pinned.length >= MAX_PINNED
            return (
              <li key={plan.id} className="border-t border-line" data-testid="plan-row">
                <label
                  className={`grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3.5 md:grid-cols-[auto_auto_minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] ${full ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={full}
                    onChange={() => togglePin(plan.id)}
                    className="h-5 w-5 accent-[var(--color-accent)]"
                    aria-label={`Compare ${providerById(plan.providerId)?.short ?? 'your'} ${plan.name}`}
                  />
                  <ProviderTile providerId={plan.providerId} size={36} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{plan.name}</span>
                      {plan.id === best && <span className="ui rounded-full bg-gain-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-gain">Best value per Mbps</span>}
                      {plan.status === 'announced' && (
                        <span className="ui rounded-full bg-warn-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-warn">Announced {plan.source.published?.slice(0, 4)}</span>
                      )}
                    </span>
                    <span className="ui block text-[0.8125rem] text-muted">
                      {providerById(plan.providerId)?.name ?? 'Your plan'} · {plan.billing === 'prepaid' ? `prepaid, ${peso(plan.price)} per ${plan.periodDays} days` : 'postpaid'}
                    </span>
                  </span>
                  <Cell label="Monthly" value={pesoExact(costs.monthly)} />
                  <Cell label="Speed" value={mbps(plan.downMbps)} />
                  <Cell label="₱ per Mbps" value={costs.perMbps == null ? '—' : pesoExact(costs.perMbps)} strong testId="row-per-mbps" />
                  <Cell label="First year" value={`${pesoExact(costs.firstYear)}${costs.upfrontUnknown ? '*' : ''}`} />
                </label>
              </li>
            )
          })}
        </ul>
        <p className="ui mt-3 text-[0.8125rem] text-muted">* One-time fees not stated by the provider, so not included.</p>

        <div className="mt-5 border-t border-line pt-5">
          {showCustom ? (
            <CustomPlanForm
              onAdd={(c) => {
                set({ custom: [...s.custom, c], pinned: s.pinned.length < MAX_PINNED ? [...s.pinned, c.id] : s.pinned })
                setShowCustom(false)
              }}
              onCancel={() => setShowCustom(false)}
            />
          ) : (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setShowCustom(true)}>
              <Plus aria-hidden="true" size={16} /> Add a plan that is not listed
            </button>
          )}
          {s.custom.length > 0 && (
            <ul className="ui m-0 mt-3 flex list-none flex-wrap gap-2 p-0 text-[0.875rem]">
              {s.custom.map((c) => (
                <li key={c.id} className="flex items-center gap-1 rounded-full bg-ground py-1 pr-1 pl-3">
                  {c.name}
                  <button
                    type="button"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-loss-soft hover:text-loss"
                    onClick={() => set({ custom: s.custom.filter((x) => x.id !== c.id), pinned: s.pinned.filter((p) => p !== c.id) })}
                  >
                    <X aria-hidden="true" size={14} />
                    <span className="sr-only">Remove {c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {pinnedRows.length > 0 && <SideBySide rows={pinnedRows} best={bestValueId(pinnedRows)} s={s} set={set} togglePin={togglePin} />}
    </section>
  )
}

function Cell({ label, value, strong, testId }: { label: string; value: string; strong?: boolean; testId?: string }) {
  return (
    <span className="col-start-3 flex items-baseline justify-between gap-3 text-[0.9375rem] md:col-start-auto md:block md:text-right">
      <span className="ui text-[0.8125rem] text-muted md:hidden">{label}</span>
      <span className={`tabular ${strong ? 'font-semibold' : ''}`} data-testid={testId}>
        {value}
      </span>
    </span>
  )
}

function CustomPlanForm({ onAdd, onCancel }: { onAdd: (c: CustomPlan) => void; onCancel: () => void }) {
  const [c, setC] = useState({ name: '', price: 0, downMbps: 100, upfront: 0, lockInMonths: 0 })
  const [err, setErr] = useState<string | null>(null)
  return (
    <form
      className="grid gap-4"
      data-testid="custom-plan-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!c.name.trim()) return setErr('Give the plan a name.')
        const p = planProblem({ bill: c.price, advertisedMbps: c.downMbps })
        if (p) return setErr(p)
        onAdd({ ...c, name: c.name.trim().slice(0, 60), id: newId('custom') })
      }}
    >
      <div className="ui">
        <label htmlFor="custom-name" className="field-label">
          Provider and plan name
        </label>
        <input id="custom-name" className="field-input" value={c.name} maxLength={60} placeholder="e.g. Streamtech 200 Mbps" onChange={(e) => setC({ ...c, name: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AmountField label="Monthly price" value={c.price} onChange={(v) => setC({ ...c, price: v })} />
        <SliderField label="Download speed" value={c.downMbps} onChange={(v) => setC({ ...c, downMbps: v })} min={5} max={2000} step={5} exact suffix="Mbps" format={mbps} />
        <AmountField label="One-time fees (installation, modem)" value={c.upfront} onChange={(v) => setC({ ...c, upfront: v })} />
        <SliderField
          label="Lock-in"
          value={c.lockInMonths}
          onChange={(v) => setC({ ...c, lockInMonths: Math.round(v) })}
          min={0}
          max={36}
          step={1}
          format={(v) => (v === 0 ? 'None' : `${v} months`)}
        />
      </div>
      {err && (
        <p role="alert" className="ui rounded-[14px] bg-loss-soft px-4 py-3 text-[0.9375rem] text-loss">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary btn-sm">
          Add to the comparison
        </button>
        <button type="button" className="btn btn-soft btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */

function SideBySide({
  rows,
  best,
  s,
  set,
  togglePin,
}: {
  rows: { plan: InternetPlan; costs: PlanCosts }[]
  best: string | null
  s: Stored
  set: (p: Partial<Stored>) => void
  togglePin: (id: string) => void
}) {
  const [name, setName] = useState('')
  const maxContract = Math.max(...rows.map((r) => r.costs.contractTotal), 1)
  const metrics: [string, (r: { plan: InternetPlan; costs: PlanCosts }) => string][] = [
    ['Monthly price', (r) => pesoExact(r.costs.monthly)],
    ['Download', (r) => mbps(r.plan.downMbps) + (r.plan.speedNote ? '*' : '')],
    ['Upload', (r) => mbps(r.plan.upMbps)],
    ['₱ per Mbps', (r) => perMbps(r.costs.perMbps)],
    [
      'One-time fees',
      (r) =>
        (r.costs.upfrontUnknown ? 'Not stated' : pesoExact(r.costs.upfront)) +
        (r.plan.installInstalments ? ` + ${pesoExact(r.plan.installInstalments.total)} over ${r.plan.installInstalments.months} months` : ''),
    ],
    ['Lock-in', (r) => lockIn(r.plan.lockInMonths)],
    ['First-year cost', (r) => pesoExact(r.costs.firstYear)],
    ['Contract cost', (r) => `${pesoExact(r.costs.contractTotal)} over ${r.costs.horizon} months${r.costs.horizonAssumed ? '†' : ''}`],
    ['Effective monthly', (r) => pesoExact(r.costs.effectiveMonthly)],
    ['Data', (r) => (r.plan.dataCap === 'unlimited' ? 'Unlimited' : r.plan.dataCap)],
  ]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="side-by-side">
      <div className="card overflow-x-auto p-5 sm:p-7">
        <h3 className="text-[1.5rem] leading-tight">Side by side</h3>
        <table className="ui mt-5 w-full min-w-[560px] border-collapse text-[0.9375rem]">
          <thead>
            <tr>
              <th scope="col" className="w-[150px]">
                <span className="sr-only">Measure</span>
              </th>
              {rows.map((r) => (
                <th key={r.plan.id} scope="col" className="px-2 pb-4 text-left align-bottom font-normal">
                  <span className="flex items-center gap-2">
                    <ProviderTile providerId={r.plan.providerId} size={32} />
                    <button
                      type="button"
                      onClick={() => togglePin(r.plan.id)}
                      className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-surface"
                    >
                      <X aria-hidden="true" size={15} />
                      <span className="sr-only">Stop comparing {r.plan.name}</span>
                    </button>
                  </span>
                  <span className="mt-2 block font-semibold">{r.plan.name}</span>
                  {r.plan.id === best && rows.length > 1 && (
                    <span className="mt-1 inline-block rounded-full bg-gain-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-gain">Best value per Mbps</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(([label, fn]) => (
              <tr key={label} className="border-t border-line">
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-muted">
                  {label}
                </th>
                {rows.map((r) => (
                  <td key={r.plan.id} className="tabular px-2 py-2.5">
                    {fn(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ui mt-3 text-[0.8125rem] text-muted">* Advertised as a floor or range. † No lock-in, or none stated: 24 months is used as a reference period.</p>
      </div>

      <Panel title="Upfront versus long-term" intro="One-time fees against what you pay month after month, over each plan’s contract period." as="section">
        <ul className="m-0 grid list-none gap-4 p-0" data-testid="upfront-vs-longterm">
          {rows.map((r) => {
            const recurring = r.costs.contractTotal - r.costs.upfront
            return (
              <li key={r.plan.id}>
                <div className="ui flex items-baseline justify-between gap-3 text-[0.9375rem]">
                  <span className="font-medium">{r.plan.name}</span>
                  <span className="tabular font-semibold">{pesoExact(r.costs.contractTotal)}</span>
                </div>
                <div
                  className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-surface"
                  role="img"
                  aria-label={`${pesoExact(r.costs.upfront)} upfront and ${pesoExact(recurring)} in monthly charges over ${r.costs.horizon} months`}
                >
                  <span className="h-full bg-sun" style={{ width: `${(r.costs.upfront / maxContract) * 100}%` }} />
                  <span className="h-full bg-accent" style={{ width: `${(recurring / maxContract) * 100}%` }} />
                </div>
                <p className="ui mt-1 text-[0.8125rem] text-muted">
                  {r.costs.upfrontUnknown ? 'Upfront fees not stated' : `${pesoExact(r.costs.upfront)} upfront`} · {pesoExact(recurring)} over {r.costs.horizon} months
                </p>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel title="Save this comparison" as="section">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const label = name.trim() || `Comparison ${s.saved.length + 1}`
            set({ saved: [{ id: newId('cmp'), name: label.slice(0, 60), planIds: s.pinned, savedOn: new Date().toISOString().slice(0, 10) }, ...s.saved].slice(0, 20) })
            setName('')
          }}
        >
          <div className="ui min-w-[200px] flex-1">
            <label htmlFor="cmp-name" className="field-label">
              Name
            </label>
            <input id="cmp-name" className="field-input" value={name} maxLength={60} placeholder="e.g. Options for the new apartment" onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">
            <BookmarkPlus aria-hidden="true" size={18} /> Save
          </button>
        </form>
        {s.saved.length > 0 && (
          <ul className="m-0 mt-5 grid list-none gap-0 p-0" data-testid="saved-comparisons">
            {s.saved.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-t border-line py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c.name}</span>
                  <span className="ui block text-[0.8125rem] text-muted">
                    {c.planIds.length} plans · saved {dateLabel(c.savedOn)}
                  </span>
                </span>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => set({ pinned: c.planIds.filter((id) => planById(id) || s.custom.some((x) => x.id === id)).slice(0, MAX_PINNED) })}>
                  <Check aria-hidden="true" size={16} /> Load
                </button>
                <button
                  type="button"
                  onClick={() => set({ saved: s.saved.filter((x) => x.id !== c.id) })}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-loss-soft hover:text-loss"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  <span className="sr-only">Delete {c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="ui mt-4 text-[0.8125rem] text-muted">Saved only in this browser, on this device.</p>
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Location() {
  const [loc, setLoc] = useState<{ id: string; label: string } | null>(null)
  const place = loc ? HOUSING_LOCATIONS.find((l) => l.id === loc.id) : null
  return (
    <Panel
      title="Available where you live?"
      intro="Coverage is street by street, and providers do not publish data we can check. So the list above is not filtered by place: use each provider’s own address check."
      as="section"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Combobox
          label="Your city or municipality"
          value={loc}
          onChange={(o) => setLoc(o ? { id: o.id, label: o.label } : null)}
          search={(q) => searchLocations(q).map((l) => ({ id: l.id, label: l.name, hint: l.within }))}
          placeholder="e.g. Quezon City, Cebu City"
        />
        <div data-testid="location-result">
          {place ? (
            <p className="text-ink-2">
              We could not verify which plans reach <strong className="font-semibold text-ink">{place.name}</strong>. Check your exact address with:
            </p>
          ) : (
            <p className="text-ink-2">Pick a place to see where to check coverage.</p>
          )}
          <ul className="ui m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {PROVIDERS.map((p) => (
              <li key={p.id}>
                <a href={p.site} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-ground py-1.5 pr-4 pl-1.5 text-[0.875rem] font-medium hover:bg-accent-soft">
                  <ProviderTile providerId={p.id} size={28} /> {p.short}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  )
}

function Methodology() {
  return (
    <Disclosure title="How the numbers work, sources and limits" id="methodology">
      <div className="grid gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
        <p>
          <strong className="font-semibold text-ink">₱ per Mbps</strong> = monthly price ÷ advertised download speed. ₱1,500 for 200 Mbps is ₱7.50 per Mbps. Prepaid loads are turned into a monthly
          figure: load price × 365 ÷ load days ÷ 12, because a 30-day load is bought about 12.2 times a year.
        </p>
        <p>
          <strong className="font-semibold text-ink">First-year cost</strong> = one-time fees + 12 months of charges, with any promo months and installation instalments.{' '}
          <strong className="font-semibold text-ink">Contract cost</strong> = one-time fees + monthly charges × lock-in months; with no lock-in, 24 months is used as a reference.{' '}
          <strong className="font-semibold text-ink">Effective monthly</strong> = contract cost ÷ its months.
        </p>
        <p>
          <strong className="font-semibold text-ink">Sources.</strong> Every plan links to the provider page it was read from on {dateLabel(CHECKED)}. Promotions are shown apart from regular prices.
          “Not stated” means the provider does not publish it; nothing is guessed. Advertised speeds are maximums, not guarantees.
        </p>
        <div>
          <p className="font-semibold text-ink">Providers we could not verify</p>
          <ul className="m-0 mt-2 grid list-none gap-2 p-0">
            {NOT_VERIFIED.map((n) => (
              <li key={n.name}>
                <a href={n.site} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                  {n.name}
                </a>
                : {n.reason}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[0.8125rem] text-muted">Prices are for estimation and comparison only, not quotations. Confirm the latest rates, terms and charges with the provider.</p>
      </div>
    </Disclosure>
  )
}
