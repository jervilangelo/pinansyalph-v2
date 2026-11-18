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
        {note && <p className="ui text-[0.8125rem] leading-relaxed text-muted">{note}</p>}
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
      <h2 id="calculators-title" className="text-step-head">
        Check your own numbers
      </h2>
      <p className="mt-3 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-2">Everything runs in your browser. Nothing you enter is saved or sent.</p>
      <div className="mt-8">
        <Tabs tabs={TABS} value={tab} onChange={setTab} label="Calculators">
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
          <SliderField label="Total bet per session" value={perSession} onChange={setPerSession} min={50} max={20000} step={50} exact suffix="₱" format={peso} testId="g-per-session" />
          <SliderField label="Sessions a week" value={sessions} onChange={(v) => setSessions(Math.round(v))} min={1} max={21} step={1} format={(v) => `${v}`} />
          <SliderField label="House edge" value={edge} onChange={setEdge} min={0} max={15} step={0.01} exact suffix="%" format={(v) => `${v.toFixed(2)}%`} testId="g-edge" />
          <div className="ui flex flex-wrap gap-2">
            {EDGE_EXAMPLES.map((e) => (
              <button
                key={e.label}
                type="button"
                onClick={() => setEdge(e.edge)}
                title={e.derivation}
                className={`cursor-pointer rounded-full border-0 px-3 py-2 text-[0.875rem] font-medium ${edge === e.edge ? 'bg-alarm text-white' : 'bg-ground text-ink hover:bg-alarm-soft'}`}
              >
                {e.label} · {e.edge}%
              </button>
            ))}
          </div>
        </>
      }
      result={
        r ? (
          <>
            <ResultHero
              label="Expected loss in a year"
              value={r.expectedLoss}
              format={pesoExact}
              tone="loss"
              testId="g-expected-loss"
              caption={
                <>
                  On <span data-testid="g-total-wagered">{pesoExact(r.totalWagered)}</span> bet in a year.
                </>
              }
            />
            <dl className="m-0 grid grid-cols-2 gap-4">
              <Stat label="A week" value={peso(r.perWeek)} testId="g-week" />
              <Stat label="A month" value={peso(r.perMonth)} testId="g-month" />
            </dl>
          </>
        ) : (
          <Problem text={problem!} />
        )
      }
      note="An average over many bets, not a prediction: you could lose much more or less. Winnings you bet again count as new bets."
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
          <AmountField label="Loan amount" value={principal} onChange={setPrincipal} />
          <AmountField label="Fees taken out first" value={fees} onChange={setFees} />
          <NumberField label="Interest a month" value={rate} onChange={setRate} min={0} max={100} step={0.1} suffix="% a month" />
          <SliderField label="Months until due" value={months} onChange={setMonths} min={0.5} max={12} step={0.5} format={(v) => `${v} ${v === 1 ? 'month' : 'months'}`} testId="l-months" />
          <SliderField label="Times you borrow again to pay it" value={again} onChange={(v) => setAgain(Math.round(v))} min={0} max={6} step={1} format={(v) => `${v}`} testId="l-again" />
        </>
      }
      result={
        r ? (
          <>
            <ResultHero
              label="What the loan costs you"
              value={c ? c.totalCost : r.totalCost}
              format={pesoExact}
              tone="loss"
              testId="l-total-cost"
              caption={
                c ? (
                  <>
                    You get {pesoExact(c.firstCash)} but end up owing <span data-testid="l-owed">{pesoExact(c.finalDue)}</span>.
                  </>
                ) : (
                  <>
                    You get <span data-testid="l-cash">{pesoExact(r.cashReceived)}</span> and repay <span data-testid="l-repay">{pesoExact(r.totalRepayment)}</span>.
                  </>
                )
              }
            />
            <dl className="m-0 grid grid-cols-2 gap-4">
              <Stat label="Less than advertised" value={pesoExact(r.shortfall)} testId="l-shortfall" />
              <Stat label="Real cost a month" value={r.effectiveMonthly == null ? '—' : `${r.effectiveMonthly.toFixed(2)}%`} testId="l-eir" />
            </dl>
          </>
        ) : (
          <Problem text={problem!} />
        )
      }
      note={
        <>
          Interest is charged on the full amount (add-on), paid in one go. For loans up to ₱10,000 and 4 months, the BSP caps the real cost at 15% a month, fees included.
          <Cite id="bsp-1133" />
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
          <AmountField label="Card balance" value={balance} onChange={setBalance} />
          <NumberField label="Finance charge" value={rate} onChange={setRate} min={0} max={10} step={0.1} suffix="% a month" />
          <NumberField label="Minimum due" value={minPct} onChange={setMinPct} min={0.1} max={100} step={0.1} suffix="% of balance" />
          <AmountField label="What you’ll pay each month" value={pay} onChange={setPay} />
        </>
      }
      result={
        problem ? (
          <Problem text={problem} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2" data-testid="card-compare">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-[22px] p-5 ${p.id === 'minimum' ? 'bg-alarm-soft' : 'bg-gain-soft'}`} data-testid={`card-${p.id}`}>
                <p className="ui text-[0.9375rem] font-semibold">{p.label}</p>
                {p.r ? (
                  <dl className="m-0 mt-3 grid gap-3">
                    <Stat label="Time to pay off" value={<span data-testid={`card-${p.id}-months`}>{time(p.r)}</span>} />
                    <Stat label="Interest paid" value={<span data-testid={`card-${p.id}-interest`}>{peso(p.r.totalInterest)}</span>} />
                  </dl>
                ) : (
                  <p className="ui mt-3 text-[0.9375rem] text-muted">Enter an amount.</p>
                )}
              </div>
            ))}
          </div>
        )
      }
      note={
        <>
          Assumes no new purchases and a ₱500 minimum floor; your card’s terms may differ. The BSP caps card interest at 36% a year.
          <Cite id="bsp-1165" />
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
          <AmountField label="Take-home pay a month" value={income} onChange={setIncome} />
          <ul className="m-0 grid list-none gap-2 p-0" data-testid="inst-list">
            {list.map((x) => (
              <li key={x.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-end gap-2">
                <div className="ui min-w-0">
                  <label htmlFor={`${x.id}-n`} className="field-label !text-[0.8125rem]">
                    What
                  </label>
                  <input id={`${x.id}-n`} className="field-input !min-h-11 !py-2" value={x.name} maxLength={40} onChange={(e) => set(x.id, { name: e.target.value })} />
                </div>
                <div className="ui min-w-0">
                  <label htmlFor={`${x.id}-m`} className="field-label !text-[0.8125rem]">
                    A month
                  </label>
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
                  <label htmlFor={`${x.id}-l`} className="field-label !text-[0.8125rem]">
                    Months left
                  </label>
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
                  <span className="sr-only">Remove {x.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-soft btn-sm w-fit" onClick={() => setList((l) => [...l, row('Another', 1000, 12)])}>
            <Plus aria-hidden="true" size={16} /> Add one
          </button>
        </>
      }
      result={
        <>
          <ResultHero
            label="Installments every month"
            value={r.totalMonthly}
            format={pesoExact}
            tone={r.percentOfIncome != null && r.percentOfIncome >= 30 ? 'loss' : 'accent'}
            testId="inst-total"
            caption={
              r.percentOfIncome != null ? (
                <>
                  <span data-testid="inst-pct">{r.percentOfIncome.toFixed(1)}%</span> of your pay. <span data-testid="inst-left">{pesoExact(r.remainingIncome!)}</span> left for everything else.
                </>
              ) : (
                'Enter your take-home pay.'
              )
            }
          />
          <Stat label="Still to pay in total" value={pesoExact(r.totalRemaining)} testId="inst-remaining" />
        </>
      }
      note="Example entries to start; replace them with yours."
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
          <AmountField label="Amount" value={amount} onChange={setAmount} />
          <Segmented<Frequency>
            label="How often"
            value={freq}
            onChange={setFreq}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
          <SliderField label="For" value={years} onChange={(v) => setYears(Math.round(v))} min={1} max={30} step={1} format={(v) => `${v} ${v === 1 ? 'year' : 'years'}`} testId="s-years" />
          <SliderField label="Assumed return a year" value={ret} onChange={setRet} min={0} max={10} step={0.5} format={(v) => `${v}%`} testId="s-return" />
        </>
      }
      result={
        <>
          <ResultHero
            label={`Saved after ${years} ${years === 1 ? 'year' : 'years'}`}
            value={r.futureValue}
            format={pesoExact}
            tone="accent"
            testId="s-fv"
            caption={
              <>
                <span data-testid="s-contrib">{pesoExact(r.contributions)}</span> put aside{r.growth > 0 ? `, plus ${pesoExact(r.growth)} from returns` : ''}.
              </>
            }
          />
          <div className="grid gap-3" data-testid="s-scenarios">
            {scenarios.map((s) => (
              <Bar key={s.ret} label={s.ret === 0 ? 'Kept aside, 0%' : `At ${s.ret}% a year`} value={s.fv} max={max} display={peso(s.fv)} tone={s.ret === 0 ? 'muted' : 'gain'} />
            ))}
          </div>
        </>
      }
      note="Returns are assumptions, not guarantees. Inflation and taxes are not included."
    />
  )
}
