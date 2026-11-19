/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  EDGE_EXAMPLES,
  cardProblem,
  cardRepayment,
  debtCycle,
  expectedLoss,
  futureValue,
  gamblingProblem,
  installmentLoad,
  loanCost,
  loanProblem,
  type CardResult,
  type Frequency,
  type Installment,
} from '../../calculators/iwasan'
import { peso, pesoExact } from '../../utils/format'
import { AmountField, NumberField, Segmented, SliderField } from '../ui/fields'
import { ResultHero, Stat } from '../ui/Result'
import { Tabs, type TabDef } from '../ui/Tabs'
import { Bar, Cite } from './shared'
import { t, tv } from '../../i18n'
import { tx } from '../../i18n/react'

type TabId = 'betting' | 'loans' | 'card' | 'installments' | 'savings'
const TABS: TabDef<TabId>[] = [
  { id: 'betting', label: 'Betting', short: 'Betting' },
  { id: 'loans', label: 'Loans', short: 'Loans' },
  { id: 'card', label: 'Credit card', short: 'Card' },
  { id: 'installments', label: 'Installments', short: 'Installs' },
  { id: 'savings', label: 'If you saved it', short: 'Savings' },
]

/** Inputs on one side, the answer on the other. */
function Calc({ inputs, result, note }: { inputs: ReactNode; result: ReactNode; note?: ReactNode }) {
  return (
    <div className="card grid gap-6 p-5 sm:p-7 lg:grid-cols-2 lg:gap-10">
      <div className="grid content-start gap-5">{inputs}</div>
      <div className="grid content-start gap-4" aria-live="polite">
        {result}
        {note && <p className="ui text-[0.8125rem] leading-relaxed text-muted">{tv(note)}</p>}
      </div>
    </div>
  )
}

const Problem = ({ text }: { text: string }) => (
  <p role="alert" className="ui rounded-[14px] bg-loss-soft px-4 py-3 text-loss">
    {text}
  </p>
)

export function Calculators() {
  const [tab, setTab] = useState<TabId>('betting')
  return (
    <section id="calculators" aria-labelledby="calculators-title" className="wrap mt-[clamp(72px,8vw,120px)] scroll-mt-24">
      <h2 id="calculators-title" className="text-step-head">{t("Check your own numbers")}</h2>
      <p className="mt-3 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-2">{t("Everything runs in your browser. Nothing you enter is saved or sent.")}</p>
      <div className="mt-8">
        <Tabs tabs={TABS} value={tab} onChange={setTab} label={t("Calculators")}>
          {tab === 'betting' && <Betting />}
          {tab === 'loans' && <Loans />}
          {tab === 'card' && <Card />}
          {tab === 'installments' && <Installments />}
          {tab === 'savings' && <Savings />}
        </Tabs>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Betting() {
  const [perSession, setPerSession] = useState(1000)
  const [sessions, setSessions] = useState(3)
  const [edge, setEdge] = useState(2.7)
  const input = { perSession, sessionsPerWeek: sessions, houseEdge: edge, weeks: 52 }
  const problem = gamblingProblem(input)
  const r = problem ? null : expectedLoss(input)
  return (
    <Calc
      inputs={
        <>
          <SliderField label={t("Total bet per session")} value={perSession} onChange={setPerSession} min={50} max={20000} step={50} exact suffix="₱" format={peso} testId="g-per-session" />
          <SliderField label={t("Sessions a week")} value={sessions} onChange={(v) => setSessions(Math.round(v))} min={1} max={21} step={1} format={(v) => `${v}`} />
          <SliderField label={t("House edge")} value={edge} onChange={setEdge} min={0} max={15} step={0.01} exact suffix="%" format={(v) => `${v.toFixed(2)}%`} testId="g-edge" />
          <div className="ui flex flex-wrap gap-2">
            {EDGE_EXAMPLES.map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => setEdge(e.edge)}
                title={tv(e.derivation)}
                className={`cursor-pointer rounded-full border-0 px-3 py-2 text-[0.875rem] font-medium ${edge === e.edge ? 'bg-alarm text-white' : 'bg-ground text-ink hover:bg-alarm-soft'}`}
              >
                {tv(e.label)} · {e.edge}%
              </button>
            ))}
          </div>
        </>
      }
      result={
        r ? (
          <>
            <ResultHero
              label={t("Expected loss in a year")}
              value={r.expectedLoss}
              format={pesoExact}
              tone="loss"
              testId="g-expected-loss"
              caption={
                <>{tx("On {span} bet in a year.", { span: (<span data-testid="g-total-wagered">{pesoExact(r.totalWagered)}</span>), })}</>
              }
            />
            <dl className="m-0 grid grid-cols-2 gap-4">
              <Stat label={t("A week")} value={peso(r.perWeek)} testId="g-week" />
              <Stat label={t("A month")} value={peso(r.perMonth)} testId="g-month" />
            </dl>
          </>
        ) : (
          <Problem text={problem!} />
        )
      }
      note={t("An average over many bets, not a prediction: you could lose much more or less. Winnings you bet again count as new bets.")}
    />
  )
}

/* ------------------------------------------------------------------ */

function Loans() {
  const [principal, setPrincipal] = useState(10000)
  const [fees, setFees] = useState(1500)
  const [rate, setRate] = useState(6)
  const [months, setMonths] = useState(1)
  const [again, setAgain] = useState(0)
  const input = { principal, deductedFees: fees, monthlyRate: rate, method: 'add-on' as const, months, installments: 1, otherCharges: 0, lateFees: 0 }
  const problem = loanProblem(input)
  const r = problem ? null : loanCost(input)
  const c = r && again > 0 ? debtCycle({ principal, feePercent: (fees / principal) * 100, monthlyRate: rate, months, cycles: again, ownPayment: 0 }) : null
  return (
    <Calc
      inputs={
        <>
          <AmountField label={t("Loan amount")} value={principal} onChange={setPrincipal} />
          <AmountField label={t("Fees taken out first")} value={fees} onChange={setFees} />
          <NumberField label={t("Interest a month")} value={rate} onChange={setRate} min={0} max={100} step={0.1} suffix="% a month" />
          <SliderField label={t("Months until due")} value={months} onChange={setMonths} min={0.5} max={12} step={0.5} format={(v) => `${v} ${v === 1 ? t('month') : t('months')}`} testId="l-months" />
          <SliderField label={t("Times you borrow again to pay it")} value={again} onChange={(v) => setAgain(Math.round(v))} min={0} max={6} step={1} format={(v) => `${v}`} testId="l-again" />
        </>
      }
      result={
        r ? (
          <>
            <ResultHero
              label={t("What the loan costs you")}
              value={c ? c.totalCost : r.totalCost}
              format={pesoExact}
              tone="loss"
              testId="l-total-cost"
              caption={
                c ? (
                  <>{tx("You get {firstCash} but end up owing {span}.", { firstCash: (pesoExact(c.firstCash)), span: (<span data-testid="l-owed">{pesoExact(c.finalDue)}</span>), })}</>
                ) : (
                  <>{tx("You get {span} and repay {span2}.", { span: (<span data-testid="l-cash">{pesoExact(r.cashReceived)}</span>), span2: (<span data-testid="l-repay">{pesoExact(r.totalRepayment)}</span>), })}</>
                )
              }
            />
            <dl className="m-0 grid grid-cols-2 gap-4">
              <Stat label={t("Less than advertised")} value={pesoExact(r.shortfall)} testId="l-shortfall" />
              <Stat label={t("Real cost a month")} value={r.effectiveMonthly == null ? '—' : `${r.effectiveMonthly.toFixed(2)}%`} testId="l-eir" />
            </dl>
          </>
        ) : (
          <Problem text={problem!} />
        )
      }
      note={
        <>{t("Interest is charged on the full amount (add-on), paid in one go. For loans up to ₱10,000 and 4 months, the BSP caps the real cost at 15% a month, fees included.")}<Cite id="bsp-1133" />
        </>
      }
    />
  )
}

/* ------------------------------------------------------------------ */

function Card() {
  const [balance, setBalance] = useState(30000)
  const [rate, setRate] = useState(3)
  const [minPct, setMinPct] = useState(3)
  const [pay, setPay] = useState(2000)
  const input = { balance, monthlyRate: rate, minPercent: minPct, minAmount: 500, newSpending: 0 }
  const problem = cardProblem(input)
  const plans: { id: string; label: string; r: CardResult | null }[] = problem
    ? []
    : [
        { id: 'minimum', label: 'Minimum only', r: cardRepayment(input, { kind: 'minimum' }) },
        { id: 'fixed', label: `${peso(pay)} a month`, r: pay > 0 ? cardRepayment(input, { kind: 'fixed', amount: pay }) : null },
      ]
  const time = (r: CardResult) =>
    r.months == null
      ? r.neverPaysOff
        ? 'Never'
        : 'Over 50 years'
      : r.months < 12
        ? `${r.months} months`
        : `${Math.floor(r.months / 12)} yr${r.months >= 24 ? 's' : ''}${r.months % 12 ? ` ${r.months % 12} mo` : ''}`
  return (
    <Calc
      inputs={
        <>
          <AmountField label={t("Card balance")} value={balance} onChange={setBalance} />
          <NumberField label={t("Finance charge")} value={rate} onChange={setRate} min={0} max={10} step={0.1} suffix="% a month" />
          <NumberField label={t("Minimum due")} value={minPct} onChange={setMinPct} min={0.1} max={100} step={0.1} suffix="% of balance" />
          <AmountField label={t("What you’ll pay each month")} value={pay} onChange={setPay} />
        </>
      }
      result={
        problem ? (
          <Problem text={problem} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2" data-testid="card-compare">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-[22px] p-5 ${p.id === 'minimum' ? 'bg-alarm-soft' : 'bg-gain-soft'}`} data-testid={`card-${p.id}`}>
                <p className="ui text-[0.9375rem] font-semibold">{tv(p.label)}</p>
                {p.r ? (
                  <dl className="m-0 mt-3 grid gap-3">
                    <Stat label={t("Time to pay off")} value={<span data-testid={`card-${p.id}-months`}>{time(p.r)}</span>} />
                    <Stat label={t("Interest paid")} value={<span data-testid={`card-${p.id}-interest`}>{peso(p.r.totalInterest)}</span>} />
                  </dl>
                ) : (
                  <p className="ui mt-3 text-[0.9375rem] text-muted">{t("Enter an amount.")}</p>
                )}
              </div>
            ))}
          </div>
        )
      }
      note={
        <>{t("Assumes no new purchases and a ₱500 minimum floor; your card’s terms may differ. The BSP caps card interest at 36% a year.")}<Cite id="bsp-1165" />
        </>
      }
    />
  )
}

/* ------------------------------------------------------------------ */

let nid = 0
const row = (name: string, monthly: number, monthsLeft: number): Installment => ({ id: `i${++nid}`, name, monthly, monthsLeft })

function Installments() {
  const [income, setIncome] = useState(25000)
  const [list, setList] = useState<Installment[]>(() => [row('Phone', 1500, 10), row('Appliance', 1200, 6), row('Gadget', 900, 3)])
  const r = installmentLoad(list, income)
  const set = (id: string, patch: Partial<Installment>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  return (
    <Calc
      inputs={
        <>
          <AmountField label={t("Take-home pay a month")} value={income} onChange={setIncome} />
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="inst-list">
            {list.map((x) => (
              <li key={x.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-end gap-2">
                <div className="ui min-w-0">
                  <label htmlFor={`${x.id}-n`} className="field-label !text-[0.8125rem]">{t("What")}</label>
                  <input id={`${x.id}-n`} className="field-input !min-h-11 !py-2" value={x.name} maxLength={40} onChange={(e) => set(x.id, { name: e.target.value })} />
                </div>
                <div className="ui min-w-0">
                  <label htmlFor={`${x.id}-m`} className="field-label !text-[0.8125rem]">{t("A month")}</label>
                  <input
                    id={`${x.id}-m`}
                    type="number"
                    min={0}
                    inputMode="decimal"
                    className="field-input !min-h-11 !py-2"
                    value={x.monthly}
                    onChange={(e) => set(x.id, { monthly: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
                <div className="ui min-w-0">
                  <label htmlFor={`${x.id}-l`} className="field-label !text-[0.8125rem]">{t("Months left")}</label>
                  <input
                    id={`${x.id}-l`}
                    type="number"
                    min={0}
                    max={120}
                    className="field-input !min-h-11 !py-2"
                    value={x.monthsLeft}
                    onChange={(e) => set(x.id, { monthsLeft: Math.min(120, Math.max(0, Math.round(Number(e.target.value) || 0))) })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setList((l) => l.filter((y) => y.id !== x.id))}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-loss-soft hover:text-loss"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  <span className="sr-only">{tx("Remove {name}", { name: (tv(x.name)), })}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-soft btn-sm w-fit" onClick={() => setList((l) => [...l, row('Another', 1000, 12)])}>
            <Plus aria-hidden="true" size={16} />{' '}{t("Add one")}</button>
        </>
      }
      result={
        <>
          <ResultHero
            label={t("Installments every month")}
            value={r.totalMonthly}
            format={pesoExact}
            tone={r.percentOfIncome != null && r.percentOfIncome >= 30 ? 'loss' : 'accent'}
            testId="inst-total"
            caption={
              r.percentOfIncome != null ? (
                <>{tx("{span} of your pay. {span2} left for everything else.", { span: (<span data-testid="inst-pct">{r.percentOfIncome.toFixed(1)}%</span>), span2: (<span data-testid="inst-left">{pesoExact(r.remainingIncome!)}</span>), })}</>
              ) : (
                t('Enter your take-home pay.')
              )
            }
          />
          <Stat label={t("Still to pay in total")} value={pesoExact(r.totalRemaining)} testId="inst-remaining" />
        </>
      }
      note={t("Example entries to start; replace them with yours.")}
    />
  )
}

/* ------------------------------------------------------------------ */

function Savings() {
  const [amount, setAmount] = useState(100)
  const [freq, setFreq] = useState<Frequency>('daily')
  const [years, setYears] = useState(5)
  const [ret, setRet] = useState(0)
  const r = futureValue(amount, freq, years, ret)
  const scenarios = [0, 3, 6].map((x) => ({ ret: x, fv: futureValue(amount, freq, years, x).futureValue }))
  const max = Math.max(...scenarios.map((s) => s.fv), r.futureValue, 1)
  return (
    <Calc
      inputs={
        <>
          <AmountField label={t("Amount")} value={amount} onChange={setAmount} />
          <Segmented<Frequency>
            label={t("How often")}
            value={freq}
            onChange={setFreq}
            options={[
              { value: 'daily', label: t("Daily") },
              { value: 'weekly', label: t("Weekly") },
              { value: 'monthly', label: t("Monthly") },
            ]}
          />
          <SliderField label={t("For")} value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={30} step={1} format={(v) => `${v} ${v === 1 ? t('year') : t('years')}`} testId="s-years" />
          <SliderField label={t("Assumed return a year")} value={ret} onChange={setRet} min={0} max={10} step={0.5} format={(v) => `${v}%`} testId="s-return" />
        </>
      }
      result={
        <>
          <ResultHero
            label={t("Saved after {years} {v1}", { years, v1: years === 1 ? t('year') : t('years') })}
            value={r.futureValue}
            format={pesoExact}
            tone="accent"
            testId="s-fv"
            caption={
              <>{tx("{span} put aside{v0}.", { span: (<span data-testid="s-contrib">{pesoExact(r.contributions)}</span>), v0: (r.growth > 0 ? t(", plus {growth} from returns", { growth: pesoExact(r.growth) }) : ''), })}</>
            }
          />
          <div className="grid gap-3" data-testid="s-scenarios">
            {scenarios.map((s) => (
              <Bar key={s.ret} label={s.ret === 0 ? t("Kept aside, 0%") : t("At {ret}% a year", { ret: s.ret })} value={s.fv} max={max} display={peso(s.fv)} tone={s.ret === 0 ? 'muted' : 'gain'} />
            ))}
          </div>
        </>
      }
      note={t("Returns are assumptions, not guarantees. Inflation and taxes are not included.")}
    />
  )
}
