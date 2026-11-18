import { AnimatePresence } from 'motion/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { annualCost, budgetCheck, monthlyCost, sanitizeEntries, simulateCancel, summarize, upcomingRenewals, yourShare, type SubEntry, type Summary } from '../../calculators/subscriptions'
import { BILLING, CHECKED, SERVICES, draftFor, serviceById, type SubCategory } from '../../data/subscriptions'
import { dateLabel, peso, pesoExact } from '../../utils/format'
import { ToolMark } from '../brand/ToolMark'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { AmountField } from '../ui/fields'
import { AnimatedNumber, DUR, EASE, motion, useReducedMotion } from '../ui/motion'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { Tabs, type TabDef } from '../ui/Tabs'
import { SubLogo } from './subscriptions/SubLogo'
import { SubscriptionForm } from './subscriptions/SubscriptionForm'

const STORE = 'pp-subscriptions-v1'
const CAT_COLOR: Record<SubCategory, string> = {
  entertainment: 'var(--color-s1)',
  productivity: 'var(--color-s3)',
  ai: 'var(--color-s7)',
  gaming: 'var(--color-s2)',
  lifestyle: 'var(--color-s5)',
  other: 'var(--color-s4)',
}
const per = (b: SubEntry['billing']) => BILLING.find((x) => x.id === b)!.per

/** One tap adds a common plan at its official price. */
const QUICK: [string, string][] = [
  ['netflix', 'standard'],
  ['spotify', 'individual'],
  ['youtube-premium', 'individual'],
  ['icloud', '50gb'],
  ['chatgpt', 'plus'],
  ['disney', 'standard'],
]

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s${Date.now()}${Math.random().toString(36).slice(2, 8)}`)
const todayManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

interface Stored {
  entries: SubEntry[]
  budget: number
}

function load(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Stored> | null
    const budget = typeof raw?.budget === 'number' && raw.budget >= 0 && raw.budget <= 1_000_000 ? raw.budget : 0
    return { entries: sanitizeEntries(raw?.entries), budget }
  } catch {
    return { entries: [], budget: 0 }
  }
}

/** Entries and budget, kept in this browser's localStorage and nowhere else. */
function useSubscriptions() {
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
      /* storage full or blocked: the list still works for this visit */
    }
  }, [state])
  return {
    ...state,
    add: (e: Omit<SubEntry, 'id'>) =>
      setState((s) => ({
        ...s,
        entries: [...s.entries, { ...e, id: newId() }],
      })),
    update: (id: string, e: Omit<SubEntry, 'id'>) =>
      setState((s) => ({
        ...s,
        entries: s.entries.map((x) => (x.id === id ? { ...e, id } : x)),
      })),
    remove: (id: string) =>
      setState((s) => ({
        ...s,
        entries: s.entries.filter((x) => x.id !== id),
      })),
    clear: () => setState((s) => ({ ...s, entries: [] })),
    setBudget: (budget: number) => setState((s) => ({ ...s, budget })),
  }
}

type TabId = 'breakdown' | 'cancel' | 'budget' | 'renewals'
const TABS: TabDef<TabId>[] = [
  { id: 'breakdown', label: 'Saan napupunta', short: 'Breakdown' },
  { id: 'cancel', label: 'Kung i-cancel ko', short: 'Cancel' },
  { id: 'budget', label: 'Budget', short: 'Budget' },
  { id: 'renewals', label: 'Renewals', short: 'Renewals' },
]

export function SubscriptionSection() {
  const subs = useSubscriptions()
  const [editing, setEditing] = useState<SubEntry | null>(null)
  const [tab, setTab] = useState<TabId>('breakdown')
  const summary = useMemo(() => summarize(subs.entries), [subs.entries])
  const listRef = useRef<HTMLDivElement>(null)

  const quickAdd = (serviceId: string, planId: string) => {
    const s = serviceById(serviceId)!
    const p = s.plans.find((x) => x.id === planId)!
    subs.add({ ...draftFor(s, p), people: 1 })
  }

  return (
    <section id="subscriptions" aria-labelledby="subs-title">
      <ToolHeader
        path="/magkano-subscription"
        id="subs-title"
        title={
          <span className="flex items-start gap-4">
            <ToolMark path="/magkano-subscription" size={56} className="mt-1 hidden sm:block" />
            <span>Magkano ba Subscription Ko?</span>
          </span>
        }
        lede={
          <>
            <span className="font-semibold text-ink">Akala mo maliit lang? Tingnan natin kung magkano lahat.</span> Add what you subscribe to and see your real monthly and yearly total, where it goes,
            and what cancelling would save.
          </>
        }
        meta={<StatusTag status="verified" extra={`Philippine prices from each service’s own page, checked ${dateLabel(CHECKED)}`} />}
      />

      <div className="wrap grid gap-4">
        <CalcGrid
          inputs={
            <>
              <Panel
                title={editing ? `Edit ${editing.name}` : 'Add a subscription'}
                intro={editing ? undefined : 'Search for the app, pick your plan, then adjust the amount to what you really pay.'}
                as="section"
              >
                <SubscriptionForm
                  key={editing?.id ?? 'new'}
                  editing={editing}
                  onSubmit={(e) => {
                    if (editing) {
                      subs.update(editing.id, e)
                      setEditing(null)
                      requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'nearest' }))
                    } else subs.add(e)
                  }}
                  onCancel={editing ? () => setEditing(null) : undefined}
                />
              </Panel>

              <div ref={listRef}>
                <Panel title="Your subscriptions" as="section">
                  <SubList entries={subs.entries} summary={summary} onEdit={setEditing} onRemove={subs.remove} onQuickAdd={quickAdd} />
                  {subs.entries.length > 0 && (
                    <div className="ui mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[0.8125rem] text-muted">
                      <p>Saved only in this browser, on this device. Nothing is sent anywhere.</p>
                      <button
                        type="button"
                        className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-loss underline-offset-4 hover:underline"
                        onClick={() => {
                          if (window.confirm('Remove all your subscriptions from this browser?')) {
                            subs.clear()
                            setEditing(null)
                          }
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </Panel>
              </div>
            </>
          }
          result={<Totals summary={summary} budget={subs.budget} />}
        />

        {summary.count > 0 && <AnnualShock summary={summary} />}

        {summary.count > 0 && (
          <Tabs tabs={TABS} value={tab} onChange={setTab} label="Subscription tools">
            {tab === 'breakdown' && <Breakdown summary={summary} />}
            {tab === 'cancel' && <CancelSim entries={subs.entries} />}
            {tab === 'budget' && <Budget monthly={summary.monthly} budget={subs.budget} setBudget={subs.setBudget} />}
            {tab === 'renewals' && <Renewals entries={subs.entries} onEdit={setEditing} />}
          </Tabs>
        )}

        <Sources />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function SubList({
  entries,
  summary,
  onEdit,
  onRemove,
  onQuickAdd,
}: {
  entries: SubEntry[]
  summary: Summary
  onEdit: (e: SubEntry) => void
  onRemove: (id: string) => void
  onQuickAdd: (s: string, p: string) => void
}) {
  const reduce = useReducedMotion()
  const have = new Set(entries.map((e) => e.serviceId))
  const quick = QUICK.filter(([s]) => !have.has(s))
  const chips = quick.length > 0 && (
    <div className={entries.length ? 'mt-5 border-t border-line pt-4' : ''}>
      <p className={entries.length ? 'ui text-[0.875rem] font-semibold text-muted' : 'text-ink-2'}>{entries.length ? 'Quick add' : 'Nothing added yet. Start with the ones most people have:'}</p>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
        {quick.map(([s, p]) => {
          const svc = serviceById(s)!
          const plan = svc.plans.find((x) => x.id === p)!
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onQuickAdd(s, p)}
                className="ui flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-ground py-1.5 pr-4 pl-1.5 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-accent-soft"
              >
                <SubLogo name={svc.name} logo={svc.logo} size={32} />
                {svc.name} {plan.name}
                <Plus aria-hidden="true" size={15} className="text-muted" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
  if (!entries.length) return <div data-testid="subs-empty">{chips}</div>
  const rank = new Map(summary.top.map((t, i) => [t.entry.id, i]))
  return (
    <>
      <ul className="m-0 grid list-none gap-0 p-0" data-testid="subs-list">
        <AnimatePresence initial={false}>
          {entries.map((e) => {
            const svc = e.serviceId ? serviceById(e.serviceId) : undefined
            return (
              <motion.li
                key={e.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: DUR.base, ease: EASE },
                }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0"
                data-testid="sub-row"
              >
                <SubLogo name={e.name} logo={svc?.logo} icon={e.icon} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-snug font-semibold">
                    <span>{e.name}</span>
                    {rank.get(e.id) === 0 && entries.length > 1 && <span className="ui rounded-full bg-sun-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-warn">Pinakamahal</span>}
                  </p>
                  <p className="ui mt-0.5 text-[0.8125rem] leading-snug text-muted">
                    {[e.planName, `${pesoExact(e.price)} ${per(e.billing)}`, e.people > 1 ? `split ${e.people} ways, you pay ${pesoExact(yourShare(e))}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="figure m-0 text-right text-[1.125rem] leading-tight whitespace-nowrap">
                  {peso(monthlyCost(e))}
                  <span className="ui block text-[0.75rem] font-medium text-muted">/month</span>
                </p>
                <div className="flex shrink-0 flex-col sm:flex-row">
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
                    onClick={() => onRemove(e.id)}
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
      {chips}
    </>
  )
}

/* ------------------------------------------------------------------ */

function Totals({ summary, budget }: { summary: Summary; budget: number }) {
  const empty = summary.count === 0
  const b = budget > 0 ? budgetCheck(summary.monthly, budget) : null
  const top = summary.top[0]
  return (
    <>
      <ResultHero
        label="Every month, sa subscriptions"
        value={summary.monthly}
        format={pesoExact}
        tone={empty ? 'soft' : b?.over ? 'loss' : 'accent'}
        testId="subs-monthly"
        caption={
          empty ? (
            'Add a subscription to see your total.'
          ) : (
            <>
              <span data-testid="subs-annual">{pesoExact(summary.annual)}</span> a year, about <span data-testid="subs-weekly">{pesoExact(summary.weekly)}</span> a week. Yearly and quarterly plans are
              spread across their months; shared plans count only your share.
            </>
          )
        }
      >
        {b && (
          <div className="ui mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${Math.min(100, b.used)}%` }} />
            </div>
            <p className="mt-2 text-[0.875rem] text-white/85">
              {b.used}% of your {peso(b.budget)} budget
              {b.over ? `, ${peso(-b.left)} over` : ''}
            </p>
          </div>
        )}
      </ResultHero>
      {!empty && (
        <Panel>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-5">
            <Stat label="Active subscriptions" value={summary.count} testId="subs-count" />
            <Stat label="Average each" value={`${peso(summary.average)}/mo`} testId="subs-average" />
            <div className="col-span-2">
              <Stat label="Most expensive" value={<span data-testid="subs-top">{top.entry.name}</span>} note={`${pesoExact(top.monthly)} a month, ${pesoExact(annualCost(top.entry))} a year`} />
            </div>
          </dl>
        </Panel>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */

function AnnualShock({ summary }: { summary: Summary }) {
  const perDay = Math.round((summary.annual / 365) * 100) / 100
  return (
    <section aria-labelledby="shock-title" className="relative overflow-hidden rounded-[28px] bg-night p-6 text-night-ink sm:p-10 lg:p-14" data-testid="annual-shock">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <h2 id="shock-title" className="ui text-[0.9375rem] font-semibold text-night-muted">
            Sa isang taon
          </h2>
          <p className="figure mt-3 text-[clamp(3rem,1.6rem+7vw,7.5rem)] leading-[0.9] tracking-[-0.03em]">
            <AnimatedNumber value={summary.annual} format={peso} />
          </p>
          <p className="mt-5 max-w-[34ch] text-step-lead leading-snug">
            ang napupunta sa {summary.count} {summary.count === 1 ? 'subscription' : 'subscriptions'} mo. That is {pesoExact(perDay)} every single day.
          </p>
        </div>
        <ul className="ui m-0 grid list-none gap-3 p-0 text-[0.9375rem] lg:col-span-4">
          {summary.byCategory.slice(0, 4).map((c) => (
            <li key={c.category} className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-3">
              <span className="flex items-center gap-2 text-night-muted">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLOR[c.category] }} />
                {c.label}
              </span>
              <span className="tabular font-semibold">{peso(c.monthly * 12)}/yr</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Breakdown({ summary }: { summary: Summary }) {
  const max = summary.top[0]?.monthly || 1
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      <Panel title="By category" intro="Monthly cost and share of your total.">
        <div className="flex h-3.5 overflow-hidden rounded-full bg-surface" role="img" aria-label={summary.byCategory.map((c) => `${c.label} ${c.percent}%`).join(', ')}>
          {summary.byCategory.map((c) => (
            <span
              key={c.category}
              className="h-full"
              style={{
                width: `${c.percent}%`,
                background: CAT_COLOR[c.category],
              }}
            />
          ))}
        </div>
        <table className="ui mt-5 w-full border-collapse text-[0.9375rem]" data-testid="category-table">
          <caption className="sr-only">Spending by category</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Subscriptions</th>
              <th scope="col">Per month</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {summary.byCategory.map((c) => (
              <tr key={c.category} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2.5 text-left font-medium">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CAT_COLOR[c.category] }} />
                    {c.label}
                  </span>
                </th>
                <td className="py-2.5 text-right text-muted">{c.count}×</td>
                <td className="tabular py-2.5 pl-3 text-right font-semibold">{pesoExact(c.monthly)}</td>
                <td className="tabular w-[4.5rem] py-2.5 text-right text-muted">{c.percent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Highest cost first" intro="Each subscription’s monthly cost, as a share of your total.">
        <ol className="ui m-0 grid list-none gap-3 p-0" data-testid="top-list">
          {summary.top.slice(0, 8).map(({ entry, monthly }) => (
            <li key={entry.id} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
                <span className="truncate font-medium">{entry.name}</span>
                <span className="tabular shrink-0 font-semibold">
                  {pesoExact(monthly)} <span className="font-normal text-muted">· {summary.monthly ? ((monthly / summary.monthly) * 100).toFixed(1) : '0.0'}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(monthly / max) * 100}%`,
                    background: CAT_COLOR[entry.category],
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
        {summary.byBilling.length > 0 && (
          <dl className="m-0 mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-3" data-testid="billing-split">
            {summary.byBilling.map((b) => (
              <Stat key={b.billing} label={`Billed ${b.label.toLowerCase()}`} value={`${peso(b.monthly)}/mo`} note={`${b.count} ${b.count === 1 ? 'subscription' : 'subscriptions'}`} />
            ))}
          </dl>
        )}
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CancelSim({ entries }: { entries: SubEntry[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const valid = new Set([...picked].filter((id) => entries.some((e) => e.id === id)))
  const r = simulateCancel(entries, valid)
  const toggle = (id: string) => setPicked((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])))
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Which would you cancel?" intro="Tick the ones you could live without. Nothing is removed from your list.">
        <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-1 p-0">
          {entries.map((e) => {
            const svc = e.serviceId ? serviceById(e.serviceId) : undefined
            return (
              <li key={e.id}>
                <label className="ui flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] px-2 py-1.5 hover:bg-ground has-[:checked]:bg-loss-soft">
                  <input type="checkbox" checked={valid.has(e.id)} onChange={() => toggle(e.id)} className="h-5 w-5 shrink-0 accent-[var(--color-loss)]" />
                  <SubLogo name={e.name} logo={svc?.logo} icon={e.icon} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">
                    {e.name}
                    {e.planName ? ` ${e.planName}` : ''}
                  </span>
                  <span className="tabular shrink-0 text-[0.9375rem] whitespace-nowrap text-ink-2">{pesoExact(monthlyCost(e))}/mo</span>
                </label>
              </li>
            )
          })}
        </ul>
      </Panel>
      <ResultHero
        label={valid.size ? `Kung i-cancel mo ang ${valid.size}` : 'Pick something to cancel'}
        value={r.savedAnnual}
        format={pesoExact}
        tone={valid.size ? 'accent' : 'soft'}
        testId="cancel-annual"
        caption={valid.size ? 'saved in a year.' : 'Your savings will show here.'}
      >
        {valid.size > 0 && (
          <dl className="m-0 mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/20 pt-5">
            {[
              ['Saved each month', pesoExact(r.savedMonthly), 'cancel-monthly'],
              ['Spending cut', `${r.reduction.toFixed(1)}%`, 'cancel-pct'],
              ['New monthly total', pesoExact(r.newMonthly), 'cancel-new'],
              ['New yearly total', pesoExact(r.newAnnual), 'cancel-new-annual'],
            ].map(([l, v, t]) => (
              <div key={t}>
                <dt className="ui text-[0.8125rem] text-white/80">{l}</dt>
                <dd className="figure m-0 mt-1 text-[1.5rem] leading-tight" data-testid={t}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </ResultHero>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Budget({ monthly, budget, setBudget }: { monthly: number; budget: number; setBudget: (n: number) => void }) {
  const b = budgetCheck(monthly, budget)
  const max = Math.max(10000, Math.ceil((Math.max(budget, monthly) * 1.25) / 500) * 500)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="My subscription budget" intro="How much you want subscriptions to cost you each month. Saved with your list.">
        <div className="grid gap-4">
          <div className="ui">
            <label htmlFor="budget-range" className="field-label flex items-baseline justify-between">
              <span>Monthly budget</span>
              <span className="figure text-[1.375rem] tracking-normal">{peso(budget)}</span>
            </label>
            <input
              id="budget-range"
              type="range"
              min={0}
              max={max}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="h-11 w-full"
              aria-valuetext={`${peso(budget)} a month`}
            />
          </div>
          <AmountField label="Exact budget" value={budget} onChange={(v) => setBudget(Math.min(v, 1_000_000))} />
        </div>
      </Panel>
      <div className={`card p-6 sm:p-8 ${b.over ? 'bg-loss-soft' : ''}`} aria-live="polite" data-testid="budget-result">
        {budget === 0 ? (
          <p className="text-ink-2">Set a budget to see how much of it your subscriptions already use.</p>
        ) : (
          <>
            <p className="ui text-[0.9375rem] font-semibold text-ink-2">{b.over ? 'Lampas na sa budget' : 'Pasok pa sa budget'}</p>
            <p className={`figure mt-3 text-[clamp(2.5rem,2rem+2vw,3.5rem)] leading-none ${b.over ? 'text-loss' : ''}`} data-testid="budget-used">
              {b.used.toFixed(1)}%
            </p>
            <p className="ui mt-2 text-[0.9375rem] text-ink-2">
              of {peso(b.budget)} used: {pesoExact(b.spent)} a month.
            </p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface">
              <div className={`h-full rounded-full transition-[width] duration-500 ${b.over ? 'bg-loss' : 'bg-accent'}`} style={{ width: `${Math.min(100, b.used)}%` }} />
            </div>
            <p className="ui mt-4 text-[1.0625rem] font-semibold" data-testid="budget-left">
              {b.over ? `${pesoExact(-b.left)} over budget` : `${pesoExact(b.left)} left this month`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Renewals({ entries, onEdit }: { entries: SubEntry[]; onEdit: (e: SubEntry) => void }) {
  const today = todayManila()
  const list = upcomingRenewals(entries, today, 31)
  const missing = entries.filter((e) => !e.renewal)
  const due = list.reduce((s, r) => s + r.amount, 0)
  return (
    <Panel title="Coming up in the next 31 days" intro="Renewal dates you entered, rolled forward by each billing period. These are reminders on this page only; there are no notifications.">
      {list.length ? (
        <>
          <ol className="m-0 grid list-none gap-0 p-0" data-testid="renewal-list">
            {list.map((r) => (
              <li key={r.entry.id} className="flex items-center gap-4 border-b border-line py-3 last:border-b-0">
                <span className="w-16 shrink-0 text-center">
                  <span className="figure block text-[1.5rem] leading-none">{Number(r.date.slice(8))}</span>
                  <span className="ui block text-[0.75rem] font-semibold tracking-[0.06em] text-muted uppercase">{new Date(`${r.date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short' })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.entry.name}</span>
                  <span className="ui block text-[0.8125rem] text-muted">{r.inDays === 0 ? 'Today' : r.inDays === 1 ? 'Tomorrow' : `In ${r.inDays} days`}</span>
                </span>
                <span className="figure text-[1.125rem]">{pesoExact(r.amount)}</span>
              </li>
            ))}
          </ol>
          <p className="ui mt-4 text-[0.9375rem]">
            Expected charges: <strong className="tabular font-semibold">{pesoExact(due)}</strong>
          </p>
        </>
      ) : (
        <p className="text-ink-2">
          No renewals in the next 31 days
          {missing.length ? ' among the dates you entered' : ''}.
        </p>
      )}
      {missing.length > 0 && (
        <div className="ui mt-5 border-t border-line pt-4 text-[0.875rem] text-muted">
          <p>No renewal date yet:</p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
            {missing.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onEdit(e)} className="cursor-pointer rounded-full border-0 bg-ground px-3 py-1.5 text-[0.875rem] font-medium text-ink hover:bg-accent-soft">
                  {e.name} · add date
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

function Sources() {
  const priced = SERVICES.filter((s) => s.plans.some((p) => p.prices.length))
  const usd = SERVICES.filter((s) => s.plans.some((p) => p.usd?.length))
  const unverified = SERVICES.filter((s) => s.plans.every((p) => !p.prices.length && !p.usd?.length))
  return (
    <Disclosure title="Where the prices come from" id="sources">
      <div className="grid gap-5 text-[0.9375rem] leading-relaxed text-ink-2">
        <p>
          Every peso price was read from the service’s own Philippine pricing page on {dateLabel(CHECKED)}. Nothing is converted from US dollars, and promotional prices are shown apart from the
          regular price. Prices change: if yours differs, enter what you actually pay.
        </p>
        <div>
          <h3 className="ui text-[0.9375rem] font-semibold text-ink">Official Philippine prices ({priced.length})</h3>
          <ul className="m-0 mt-2 grid list-none gap-1 p-0 sm:grid-cols-2">
            {priced.map((s) => (
              <li key={s.id}>
                <a href={s.source!.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p>
          <strong className="font-semibold text-ink">Billed in US dollars ({usd.length}):</strong> {usd.map((s) => s.name).join(', ')}. Their dollar prices are shown for reference; enter the peso
          charge from your statement.
        </p>
        <p>
          <strong className="font-semibold text-ink">No verified Philippine price ({unverified.length}):</strong> {unverified.map((s) => s.name).join(', ')}. These are priced in the app at checkout,
          sold only after sign-in, or not officially sold here. Enter what you pay.
        </p>
        <p className="text-[0.8125rem] text-muted">
          Logos are from Simple Icons (CC0) and are trademarks of their owners, shown only to identify each service. Services without a logo there are shown with their initials.
        </p>
      </div>
    </Disclosure>
  )
}
