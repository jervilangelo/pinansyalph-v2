import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { CARD_LIMIT_MONTHS, cardProblem, cardRepayment, type CardResult } from '../../calculators/iwasan'
import { peso, pesoExact } from '../../utils/format'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, NumberField, Segmented } from '../ui/fields'
import { Panel } from '../ui/Result'
import { Better, Cite, Concepts, RuleBox, SectionHead, Warning } from './shared'

const duration = (m: number | null, never = false) => (m == null ? (never ? 'Never at this rate' : `More than ${CARD_LIMIT_MONTHS / 12} years`) : m < 12 ? `${m} months` : `${Math.floor(m / 12)} yr${m >= 24 ? 's' : ''}${m % 12 ? ` ${m % 12} mo` : ''}`)

export function CardSection() {
  return (
    <section id="credit-card" aria-labelledby="credit-card-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="credit-card"
        icon={CreditCard}
        title="Ang bitag ng minimum payment"
        lede="A credit card is free money only for a month or so. Carry a balance and finance charges start; pay only the minimum and the balance can last for years."
      />
      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Concepts
            items={[
              { term: 'Outstanding balance', body: 'Everything you owe on the card. Paying it in full by the due date usually avoids finance charges on purchases; check your card’s terms.' },
              { term: 'Minimum amount due', body: 'The least you must pay to stay current. It keeps the account in good standing, not interest-free.' },
              { term: 'Finance charges and revolving credit', body: 'Interest on the balance you carry into the next month. Whatever you do not pay keeps revolving, and keeps being charged.' },
              { term: 'Cash advances', body: 'Withdrawing cash with the card. It has its own fee and is charged interest under the card’s terms.' },
              { term: 'Installments and Buy Now, Pay Later', body: 'Purchases split into monthly amounts. Each one uses your future income, and several together add up fast.' },
              { term: 'Credit limit psychology', body: 'A limit can feel like money you have. It is only how much you are allowed to owe.' },
            ]}
          />
        </div>
        <div className="grid content-start gap-4 lg:col-span-5">
          <Warning title="Paying the minimum amount due does not necessarily mean you avoid interest.">
            The unpaid part of your balance can keep earning finance charges under your card’s terms, month after month.
          </Warning>
          <RuleBox title="The BSP ceilings on credit cards">
            <p>
              Interest or finance charges on credit card transactions may not exceed 36% a year. Installment loans on a card may carry an add-on rate of at most 1% a month. A cash advance may carry no
              other fee besides a processing fee of at most ₱200 per transaction. The BSP reviews these ceilings every six months.
              <Cite id="bsp-1165" />
            </p>
            <p className="text-[0.875rem] text-ink-2">These are maximums: your card may charge less. Your statement and card terms show your actual rate.</p>
          </RuleBox>
        </div>
      </div>
      <div className="mt-12">
        <CardSim />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

type Plan = 'minimum' | 'fixed' | 'aggressive'
const COLORS: Record<Plan, string> = { minimum: 'var(--color-alarm)', fixed: 'var(--color-accent)', aggressive: 'var(--color-gain)' }

function CardSim() {
  const [balance, setBalance] = useState(30000)
  const [rate, setRate] = useState(3)
  const [minPct, setMinPct] = useState(3)
  const [minAmt, setMinAmt] = useState(500)
  const [spend, setSpend] = useState(0)
  const [fixed, setFixed] = useState(2000)
  const [aggressive, setAggressive] = useState(5000)
  const [view, setView] = useState<Plan>('minimum')
  const input = { balance, monthlyRate: rate, minPercent: minPct, minAmount: minAmt, newSpending: spend }
  const problem = cardProblem(input)
  const plans: { id: Plan; label: string; r: CardResult | null }[] = [
    { id: 'minimum', label: 'Minimum only', r: problem ? null : cardRepayment(input, { kind: 'minimum' }) },
    { id: 'fixed', label: `${peso(fixed)} a month`, r: problem || fixed <= 0 ? null : cardRepayment(input, { kind: 'fixed', amount: fixed }) },
    { id: 'aggressive', label: `${peso(aggressive)} a month`, r: problem || aggressive <= 0 ? null : cardRepayment(input, { kind: 'fixed', amount: aggressive }) },
  ]
  const current = plans.find((p) => p.id === view)!.r

  return (
    <div className="grid gap-4">
      <Panel title="Magkano ang totoong gastos ng credit card mo?" intro="Use the figures on your statement. Issuers set their own rates and minimums within the BSP ceilings." as="section">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AmountField label="Outstanding balance" value={balance} onChange={setBalance} />
          <NumberField label="Finance charge" value={rate} onChange={setRate} min={0} max={10} step={0.01} suffix="% a month" />
          <NumberField label="Minimum due" value={minPct} onChange={setMinPct} min={0.1} max={100} step={0.1} suffix="% of balance" />
          <AmountField label="Or at least" value={minAmt} onChange={setMinAmt} hint="The minimum is the larger of the two." />
          <AmountField label="New spending each month" value={spend} onChange={setSpend} />
          <AmountField label="Fixed payment" value={fixed} onChange={setFixed} />
          <AmountField label="Higher payment" value={aggressive} onChange={setAggressive} />
        </div>
        {problem && (
          <p role="alert" className="ui mt-5 rounded-[14px] bg-loss-soft px-4 py-3 text-loss">
            {problem}
          </p>
        )}
      </Panel>

      {!problem && (
        <>
          <div className="grid gap-4 md:grid-cols-3" data-testid="card-compare">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-[24px] p-5 sm:p-6 ${p.id === 'minimum' ? 'bg-alarm-soft' : p.id === 'aggressive' ? 'bg-gain-soft' : 'bg-paper'}`} data-testid={`card-${p.id}`}>
                <p className="ui flex items-center gap-2 text-[0.9375rem] font-semibold">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[p.id] }} />
                  {p.label}
                </p>
                {p.r ? (
                  <dl className="m-0 mt-4 grid gap-3">
                    <div>
                      <dt className="ui text-[0.8125rem] text-muted">Time to pay off</dt>
                      <dd className="figure m-0 text-[1.75rem] leading-tight" data-testid={`card-${p.id}-months`}>
                        {duration(p.r.months, p.r.neverPaysOff)}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="ui text-[0.8125rem] text-muted">Finance charges</dt>
                        <dd className="tabular m-0 font-semibold" data-testid={`card-${p.id}-interest`}>
                          {pesoExact(p.r.totalInterest)}
                        </dd>
                      </div>
                      <div>
                        <dt className="ui text-[0.8125rem] text-muted">Total paid</dt>
                        <dd className="tabular m-0 font-semibold">{pesoExact(p.r.totalPaid)}</dd>
                      </div>
                    </div>
                    {p.r.months == null && (
                      <dd className="ui m-0 text-[0.875rem] text-alarm-deep">
                        {p.r.neverPaysOff
                          ? 'The payment does not cover the finance charge and new spending, so the balance does not go down.'
                          : `Still not paid after ${CARD_LIMIT_MONTHS / 12} years.`}
                      </dd>
                    )}
                  </dl>
                ) : (
                  <p className="ui mt-4 text-[0.9375rem] text-muted">Enter a payment above ₱0.</p>
                )}
              </div>
            ))}
          </div>

          <Panel>
            <BalanceChart plans={plans} />
          </Panel>

          {current && (
            <Disclosure title="Month-by-month schedule" id="card-schedule">
              <div className="grid gap-4">
                <Segmented<Plan> label="Schedule for" value={view} onChange={setView} options={plans.map((p) => ({ value: p.id, label: p.label }))} />
                <div className="overflow-x-auto">
                  <table className="ui w-full min-w-[480px] border-collapse text-[0.9375rem]" data-testid="card-schedule-table">
                    <thead>
                      <tr className="border-b border-line text-left text-[0.8125rem] text-muted">
                        <th scope="col" className="py-2 font-medium">
                          Month
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Balance
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Finance charge
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Payment
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Left after
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.schedule.slice(0, 120).map((m) => (
                        <tr key={m.month} className="border-b border-line last:border-b-0">
                          <td className="py-2">{m.month}</td>
                          <td className="tabular py-2 text-right">{pesoExact(m.opening)}</td>
                          <td className="tabular py-2 text-right text-alarm">{pesoExact(m.interest)}</td>
                          <td className="tabular py-2 text-right">{pesoExact(m.payment)}</td>
                          <td className="tabular py-2 text-right font-semibold">{pesoExact(m.closing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {current.schedule.length > 120 && <p className="ui text-[0.875rem] text-muted">Showing the first 10 years of {current.schedule.length} months.</p>}
              </div>
            </Disclosure>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Better title="What lowers the cost">
              Paying the full statement balance when you can. Otherwise, a fixed amount well above the minimum, and no new spending on the card while you pay it down.
            </Better>
            <div className="ui rounded-[22px] bg-paper p-5 text-[0.875rem] leading-relaxed text-ink-2 sm:p-6">
              <p className="font-semibold text-ink">How this is computed</p>
              <p className="mt-1">
                Each month: finance charge = balance carried × monthly rate; then new spending is added and the payment subtracted. The minimum is the larger of its percent of the balance and its peso
                floor. Issuers usually compute charges on average daily balances and may treat new purchases, fees and payment order differently, so your statement will differ.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function BalanceChart({ plans }: { plans: { id: Plan; label: string; r: CardResult | null }[] }) {
  const W = 640
  const H = 220
  const series = plans.filter((p) => p.r).map((p) => ({ id: p.id, points: [p.r!.schedule[0]?.opening ?? 0, ...p.r!.schedule.map((m) => m.closing)] }))
  const months = Math.min(Math.max(...series.map((s) => s.points.length - 1), 1), 360)
  const max = Math.max(...series.flatMap((s) => s.points.slice(0, months + 1)), 1)
  const x = (i: number) => (i / months) * W
  const y = (v: number) => H - (v / max) * H
  return (
    <figure className="m-0">
      <figcaption className="ui text-[0.9375rem] font-semibold">Balance over time</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label="Card balance falling over time for each payment plan; the minimum-only line takes longest">
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--color-surface-2)" strokeWidth={2} />
        {series.map((s) => (
          <polyline
            key={s.id}
            fill="none"
            stroke={COLORS[s.id]}
            strokeWidth={2.5}
            points={s.points
              .slice(0, months + 1)
              .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
              .join(' ')}
          />
        ))}
      </svg>
      <p className="ui mt-2 text-[0.8125rem] text-muted">
        Across: months, up to {months} ({(months / 12).toFixed(1)} years). Up: balance, up to {peso(max)}.
      </p>
    </figure>
  )
}
