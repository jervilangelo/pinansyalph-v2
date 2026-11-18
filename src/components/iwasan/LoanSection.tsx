import { ArrowRight, HandCoins, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { cycleProblem, debtCycle, loanCost, loanProblem, type InterestMethod } from '../../calculators/iwasan'
import { peso, pesoExact } from '../../utils/format'
import { AmountField, NumberField, Segmented, SliderField } from '../ui/fields'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { Bar, Better, Cite, Concepts, RuleBox, SectionHead, Warning } from './shared'

const CYCLE = [
  { step: 'An emergency', bad: false },
  { step: 'A quick loan app', bad: false },
  { step: 'Fees taken out first', bad: true },
  { step: 'A short due date', bad: true },
  { step: 'Late charges', bad: true },
  { step: 'Another loan to pay the first', bad: true },
  { step: 'More fees, a bigger balance', bad: true },
]

export function LoanSection() {
  return (
    <section id="utang" aria-labelledby="utang-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="utang"
        icon={HandCoins}
        title="Ang siklo ng utang"
        lede="A small, fast loan can help in an emergency. The trouble starts when fees, short due dates and borrowing again to pay the last loan feed each other."
      />

      <ol className="ui m-0 mt-10 flex list-none flex-wrap items-center gap-2 p-0" aria-label="How a borrowing cycle builds">
        {CYCLE.map((c, i) => (
          <li key={c.step} className="flex items-center gap-2">
            <span className={`rounded-full px-3.5 py-2 text-[0.9375rem] font-semibold ${c.bad ? 'bg-alarm-soft text-alarm-deep' : 'bg-paper text-ink'}`}>{c.step}</span>
            {i < CYCLE.length - 1 ? <ArrowRight aria-hidden="true" size={16} className="text-muted" /> : <RotateCcw aria-hidden="true" size={18} className="text-alarm" />}
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Concepts
          items={[
            { term: 'Principal', body: 'The amount the loan is for, the figure an app usually advertises.' },
            { term: 'Nominal interest', body: 'The stated rate, such as 6% a month. Alone it can hide how much the loan really costs.' },
            { term: 'Processing and service fees', body: 'Charges for granting the loan. Often deducted at the start, so you receive less cash than the principal but repay the full principal.' },
            { term: 'Effective borrowing cost', body: 'Everything you pay beyond the cash you actually received, as a rate. It combines interest and fees, and is the number to compare loans with.' },
            { term: 'Late payment charges', body: 'Penalties when a payment is missed. They are added on top of interest and fees.' },
            { term: 'Total repayment', body: 'Every peso you pay back: principal, interest, fees and any penalties.' },
          ]}
        />
      </div>

      <div className="mt-12 grid gap-4">
        <TrueCost />
        <CycleSim />
        <div className="grid gap-4 lg:grid-cols-2">
          <RuleBox title="Your rights against harassment and contact-list collection">
            <p>
              Lending apps may not harvest your phone contacts or social media contacts to collect a debt or to harass you or the people you know, and may not use your photo to embarrass you.
              <Cite id="npc-20-01" /> Since 2022, they may only contact the character references and guarantors you chose yourself.
              <Cite id="npc-2022-02" />
            </p>
            <p>
              Unfair debt collection by lending and financing companies is prohibited.
              <Cite id="sec-mc18-2019" />
            </p>
          </RuleBox>
          <Better title="Before you borrow">
            <ul className="m-0 grid list-disc gap-1.5 pl-5">
              <li>
                Check that the app belongs to a company on the SEC’s list.
                <Cite id="sec-olp-list" />
              </li>
              <li>Ask for the total you will repay, in pesos, and compare it with the cash you will actually receive.</li>
              <li>If you are about to borrow to pay another loan, run the numbers in the simulator above first.</li>
            </ul>
          </Better>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function TrueCost() {
  const [principal, setPrincipal] = useState(10000)
  const [fees, setFees] = useState(1500)
  const [rate, setRate] = useState(6)
  const [method, setMethod] = useState<InterestMethod>('add-on')
  const [months, setMonths] = useState(1)
  const [installments, setInstallments] = useState(1)
  const [other, setOther] = useState(0)
  const [late, setLate] = useState(0)
  const input = { principal, deductedFees: fees, monthlyRate: rate, method, months, installments, otherCharges: other, lateFees: late }
  const problem = loanProblem(input)
  const r = problem ? null : loanCost(input)
  const covered = principal <= 10000 && months <= 4
  const max = r ? Math.max(principal, r.totalRepayment) : 1

  return (
    <CalcGrid
      inputs={
        <Panel title="Magkano talaga ang utang mo?" intro="Copy the figures from the loan offer or agreement. Lenders compute differently; their disclosure statement is the authority." as="section">
          <div className="grid gap-5">
            <AmountField label="Loan amount (as advertised)" value={principal} onChange={setPrincipal} />
            <AmountField label="Fees deducted before you get the cash" value={fees} onChange={setFees} hint="Processing, service or other fees taken out of the loan." />
            <NumberField label="Interest rate a month" value={rate} onChange={setRate} min={0} max={100} step={0.01} suffix="% a month" />
            <Segmented<InterestMethod>
              label="How interest is charged"
              value={method}
              onChange={setMethod}
              options={[
                { value: 'add-on', label: 'Add-on (on the full amount)' },
                { value: 'diminishing', label: 'Diminishing balance' },
              ]}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <SliderField label="Loan length" value={months} onChange={setMonths} min={0.5} max={24} step={0.5} format={(v) => `${v} ${v === 1 ? 'month' : 'months'}`} testId="l-months" />
              <SliderField label="Number of payments" value={installments} onChange={(v) => setInstallments(Math.round(v))} min={1} max={48} step={1} format={(v) => `${v}`} testId="l-installments" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <AmountField label="Other disclosed charges" value={other} onChange={setOther} />
              <AmountField label="Late fees you expect" value={late} onChange={setLate} hint="Leave at 0 if you will pay on time." />
            </div>
          </div>
        </Panel>
      }
      result={
        <>
          <ResultHero
            label="What the loan costs you"
            value={r?.totalCost ?? 0}
            format={pesoExact}
            tone={r ? 'loss' : 'soft'}
            testId="l-total-cost"
            caption={
              r ? (
                <>
                  You receive <span data-testid="l-cash">{pesoExact(r.cashReceived)}</span> and repay <span data-testid="l-repay">{pesoExact(r.totalRepayment)}</span>: {r.costPercent.toFixed(2)}% more
                  than the cash in your hand.
                </>
              ) : (
                problem
              )
            }
          />
          {r && (
            <Panel>
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-5">
                <Stat label="Less than advertised" value={pesoExact(r.shortfall)} testId="l-shortfall" />
                <Stat label={installments === 1 ? 'Payment' : `Each of ${installments} payments`} value={pesoExact(r.installment)} testId="l-installment" />
                <Stat label="Effective cost a month" value={r.effectiveMonthly == null ? '—' : `${r.effectiveMonthly.toFixed(2)}%`} testId="l-eir" note="On the cash received, fees included" />
                <Stat
                  label="Effective cost a year"
                  value={r.effectiveAnnual == null ? '—' : `${r.effectiveAnnual.toLocaleString('en-PH', { maximumFractionDigits: 0 })}%`}
                  testId="l-ear"
                  note="Compounded: (1 + monthly)¹² − 1"
                />
              </dl>
              <div className="mt-6 grid gap-3 border-t border-line pt-5">
                <Bar label="Advertised loan" value={principal} max={max} display={pesoExact(principal)} tone="muted" />
                <Bar label="Cash you receive" value={r.cashReceived} max={max} display={pesoExact(r.cashReceived)} tone="accent" />
                <Bar label="Total you repay" value={r.totalRepayment} max={max} display={pesoExact(r.totalRepayment)} tone="alarm" />
              </div>
            </Panel>
          )}
          {covered && (
            <RuleBox title="The BSP ceiling for small, short loans">
              <p data-testid="l-ceiling">
                For unsecured loans of up to ₱10,000 and up to four months from lending and financing companies and their apps: interest of at most 6% a month, an effective rate of at most 15% a month
                including fees (excluding late penalties), late penalties of at most 5% a month, and total charges of at most 100% of the amount borrowed.
                <Cite id="bsp-1133" />
                <Cite id="sec-mc3-2022" />
              </p>
              <p className="text-[0.875rem] text-ink-2">
                The estimate above is computed from the payment schedule and may differ from how a regulator or lender computes the rate. If you think a loan breaks these limits, keep your documents
                and contact the SEC.
              </p>
            </RuleBox>
          )}
        </>
      }
    />
  )
}

/* ------------------------------------------------------------------ */

function CycleSim() {
  const [principal, setPrincipal] = useState(5000)
  const [feePct, setFeePct] = useState(10)
  const [rate, setRate] = useState(5)
  const [months, setMonths] = useState(1)
  const [cycles, setCycles] = useState(3)
  const [own, setOwn] = useState(0)
  const input = { principal, feePercent: feePct, monthlyRate: rate, months, cycles, ownPayment: own }
  const problem = cycleProblem(input)
  const r = problem ? null : debtCycle(input)
  const max = r ? Math.max(...r.rounds.map((x) => x.amountDue)) : 1

  return (
    <section aria-labelledby="cycle-title" className="card grid gap-6 p-5 sm:p-8 lg:grid-cols-12" data-testid="cycle-sim">
      <div className="grid content-start gap-5 lg:col-span-5">
        <div>
          <h3 id="cycle-title" className="text-[1.5rem] leading-tight">
            Utang cycle simulator
          </h3>
          <p className="mt-2 text-[1rem] leading-relaxed text-ink-2">
            At each due date, pay what you can, then borrow just enough (after the new loan’s fees) to cover the rest. See what that does to what you owe.
          </p>
        </div>
        <AmountField label="First loan" value={principal} onChange={setPrincipal} />
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField label="Fees deducted" value={feePct} onChange={setFeePct} min={0} max={99} step={0.5} suffix="% of loan" />
          <NumberField label="Add-on interest" value={rate} onChange={setRate} min={0} max={100} step={0.5} suffix="% a month" />
        </div>
        <SliderField label="Months to each due date" value={months} onChange={setMonths} min={0.5} max={6} step={0.5} format={(v) => `${v} ${v === 1 ? 'month' : 'months'}`} />
        <SliderField label="Times you borrow again" value={cycles} onChange={(v) => setCycles(Math.round(v))} min={0} max={8} step={1} format={(v) => `${v}`} testId="c-cycles" />
        <AmountField label="Your own money at each due date" value={own} onChange={setOwn} hint="Paying part of each due amount yourself shrinks the next loan." />
      </div>
      <div className="lg:col-span-7" aria-live="polite">
        {r ? (
          <>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              <Stat label="Cash you got to use" value={peso(r.firstCash)} />
              <Stat label="Still owed at the end" value={pesoExact(r.finalDue)} tone={r.finalDue > 0 ? 'loss' : 'gain'} testId="c-final" />
              <Stat label="All fees and interest" value={pesoExact(r.totalCost)} tone="loss" testId="c-cost" />
              <Stat label="Your own money paid" value={peso(r.totalOwnPaid)} />
            </dl>
            <ol className="m-0 mt-6 grid list-none gap-3 p-0" data-testid="c-rounds">
              {r.rounds.map((x) => (
                <li key={x.round}>
                  <Bar
                    label={
                      <>
                        Loan {x.round}: borrowed {peso(x.borrowed)}, fees {peso(x.fees)}
                        {x.paidOwn > 0 ? `, you paid ${peso(x.paidOwn)}` : ''}
                      </>
                    }
                    value={x.amountDue}
                    max={max}
                    display={`${pesoExact(x.amountDue)} due`}
                    tone={x.round === 1 ? 'accent' : 'alarm'}
                  />
                </li>
              ))}
            </ol>
            <div className="mt-6">
              {r.clearedEarly ? (
                <Better title="Paid off">Your own payment covered a due date, so no new loan was needed. Borrowing again is not always harmful: what matters is whether it ends.</Better>
              ) : (
                <Warning title="What borrowing again did">
                  The {peso(r.firstCash)} you received has become {pesoExact(r.finalDue)} owed. Every new loan paid for the last one, and its fees were taken out first.
                </Warning>
              )}
            </div>
          </>
        ) : (
          <p role="alert" className="ui rounded-[14px] bg-loss-soft px-4 py-3 text-loss">
            {problem}
          </p>
        )}
      </div>
    </section>
  )
}
