import { Brain, PiggyBank, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cashVsInstallment, futureValue, installmentLoad, type Frequency, type Installment } from '../../calculators/iwasan'
import { IWASAN_SOURCES } from '../../data/iwasanSources'
import { dateLabel, peso, pesoExact } from '../../utils/format'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, Segmented, SliderField } from '../ui/fields'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { Bar, Better, Cite, Concepts, SectionHead, Warning } from './shared'

/* ------------------------------------------------------------------ */
/* Installments                                                         */
/* ------------------------------------------------------------------ */

let nid = 0
const row = (name: string, monthly: number, monthsLeft: number): Installment => ({ id: `i${++nid}`, name, monthly, monthsLeft })

export function InstallmentSection() {
  return (
    <section id="installment" aria-labelledby="installment-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="installment"
        icon={ShoppingBag}
        title="Ang bitag ng maliliit na bayarin"
        lede="Each installment looks small on its own. Four or five of them together can take a large part of every payday, for months."
      />
      <div className="mt-10">
        <Concepts
          items={[
            {
              term: 'Eligible is not the same as affordable',
              body: 'Being approved for an installment means a lender will let you. Whether you can afford it depends on everything else you already pay.',
            },
            { term: 'Total cost versus the monthly amount', body: 'The monthly figure is what is advertised. Multiply it by the months and add the fees to see what the item really costs.' },
            { term: 'Stacked obligations', body: 'Small plans started at different times overlap. Their total is what leaves your account every month.' },
            { term: 'Late penalties', body: 'A missed installment usually brings a fee, and on a card, finance charges too.' },
          ]}
        />
      </div>
      <div className="mt-12 grid gap-4">
        <InstallmentLoad />
        <CashOrInstallment />
      </div>
    </section>
  )
}

function InstallmentLoad() {
  const [income, setIncome] = useState(25000)
  const [list, setList] = useState<Installment[]>(() => [row('Phone', 1500, 10), row('Appliance', 1200, 6), row('Gadget', 900, 3)])
  const r = installmentLoad(list, income)
  const max = Math.max(...r.nextMonths, 1)
  const set = (id: string, patch: Partial<Installment>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  return (
    <CalcGrid
      inputs={
        <Panel title="Kaya ko ba ang monthly installments?" intro="Example entries to start; replace them with yours." as="section">
          <div className="grid gap-5">
            <AmountField label="Take-home pay a month" value={income} onChange={setIncome} />
            <ul className="m-0 grid list-none gap-3 p-0" data-testid="inst-list">
              {list.map((x) => (
                <li key={x.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-end gap-2 rounded-[18px] bg-ground p-3">
                  <div className="ui min-w-0">
                    <label htmlFor={`${x.id}-n`} className="field-label !text-[0.8125rem]">
                      What
                    </label>
                    <input id={`${x.id}-n`} className="field-input !min-h-11 !bg-paper !py-2" value={x.name} maxLength={40} onChange={(e) => set(x.id, { name: e.target.value })} />
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
                      className="field-input !min-h-11 !bg-paper !py-2"
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
                      className="field-input !min-h-11 !bg-paper !py-2"
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
            <button type="button" className="btn btn-soft btn-sm w-fit" onClick={() => setList((l) => [...l, row('Another installment', 1000, 12)])}>
              <Plus aria-hidden="true" size={16} /> Add an installment
            </button>
          </div>
        </Panel>
      }
      result={
        <>
          <ResultHero
            label="Every month, sa installments"
            value={r.totalMonthly}
            format={pesoExact}
            tone={r.percentOfIncome != null && r.percentOfIncome >= 30 ? 'loss' : 'accent'}
            testId="inst-total"
            caption={
              r.percentOfIncome != null ? (
                <>
                  <span data-testid="inst-pct">{r.percentOfIncome.toFixed(1)}%</span> of your take-home pay, leaving <span data-testid="inst-left">{pesoExact(r.remainingIncome!)}</span> for everything
                  else. Still to pay in total: <span data-testid="inst-remaining">{pesoExact(r.totalRemaining)}</span>.
                </>
              ) : (
                'Enter your take-home pay to see the share it takes.'
              )
            }
          />
          <Panel>
            <p className="ui text-[0.9375rem] font-semibold">The next 12 months</p>
            <div
              className="mt-4 flex h-36 items-end gap-1.5"
              role="img"
              aria-label={`Monthly installments over the next 12 months, from ${peso(r.nextMonths[0])} to ${peso(r.nextMonths[11])}`}
              data-testid="inst-chart"
            >
              {r.nextMonths.map((v, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t-[6px] bg-alarm transition-[height] duration-500" style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0 }} title={`Month ${i + 1}: ${peso(v)}`} />
                </div>
              ))}
            </div>
            <p className="ui mt-2 flex justify-between text-[0.8125rem] text-muted">
              <span>This month</span>
              <span>In 12 months</span>
            </p>
          </Panel>
        </>
      }
    />
  )
}

function CashOrInstallment() {
  const [price, setPrice] = useState(12000)
  const [monthly, setMonthly] = useState(1100)
  const [months, setMonths] = useState(12)
  const [fees, setFees] = useState(0)
  const r = cashVsInstallment(price, monthly, months, fees)
  return (
    <section aria-labelledby="cash-title" className="card grid gap-6 p-5 sm:p-8 lg:grid-cols-12" data-testid="cash-vs-installment">
      <div className="grid content-start gap-5 lg:col-span-6">
        <h3 id="cash-title" className="text-[1.5rem] leading-tight">
          Installment o ipon muna?
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <AmountField label="Cash price" value={price} onChange={setPrice} />
          <AmountField label="Installment a month" value={monthly} onChange={setMonthly} />
          <SliderField label="Months" value={months} onChange={(v) => setMonths(Math.round(v))} min={1} max={36} step={1} format={(v) => `${v}`} />
          <AmountField label="Fees on the installment" value={fees} onChange={setFees} />
        </div>
      </div>
      <div className="grid content-start gap-4 lg:col-span-6" aria-live="polite">
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-5">
          <Stat label="Installment total" value={pesoExact(r.installmentTotal)} testId="cvi-total" />
          <Stat
            label={r.extraCost > 0 ? 'Extra over cash' : r.extraCost < 0 ? 'Less than cash' : 'Same as cash'}
            value={pesoExact(Math.abs(r.extraCost))}
            tone={r.extraCost > 0 ? 'loss' : 'gain'}
            testId="cvi-extra"
          />
          <div className="col-span-2">
            <Stat label="Saving the same amount instead" value={`${r.monthsToSave} ${r.monthsToSave === 1 ? 'month' : 'months'} to pay cash`} testId="cvi-save" />
          </div>
        </dl>
        <Better>A 0% installment with no fees costs the same as cash; it is a fair tool when the monthly amount fits your budget alongside everything else you already pay.</Better>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Psychology                                                           */
/* ------------------------------------------------------------------ */

const BIASES: { term: string; cite: string[]; what: string; example: string; cost: string; spot: string; avoid: string }[] = [
  {
    term: 'Loss aversion',
    cite: ['kahneman-tversky-1979'],
    what: 'Losing ₱1,000 feels worse than winning ₱1,000 feels good, so people take bigger risks to avoid locking in a loss.',
    example: 'Down ₱3,000 at an online casino, Mark keeps playing “para makabawi” instead of stopping.',
    cost: 'Chasing a loss adds new bets, each with the same negative average.',
    spot: 'You are betting or spending to get back to where you were.',
    avoid: 'Decide your limit before you start, and treat money already lost as gone.',
  },
  {
    term: 'Near-miss effect',
    cite: ['clark-2009'],
    what: 'An almost-win feels like progress, though it pays nothing.',
    example: 'Two matching symbols and the third just above the line: Ana feels she was close and spins again.',
    cost: 'More play at the same expected loss per bet.',
    spot: '“Muntik na!” makes you want one more try.',
    avoid: 'Remember a near-miss is a loss. Set a number of rounds or a time and stop there.',
  },
  {
    term: 'Variable rewards',
    cite: ['ferster-skinner-1957', 'haw-2008'],
    what: 'Rewards that arrive unpredictably keep people trying longer than steady ones.',
    example: 'Occasional small wins in an online game app keep Jun opening it every night.',
    cost: 'Frequent sessions add up even when each bet is small.',
    spot: 'You check or play “just in case” this time pays.',
    avoid: 'Remove the app, use self-exclusion or betting limits, and track what you spend each week.',
  },
  {
    term: 'Instant gratification',
    cite: ['laibson-1997'],
    what: 'People weigh what they can have now much more than what they would have later, even when later is better.',
    example: 'A new phone today on installment feels better than the same phone, paid in cash, in eight months.',
    cost: 'Fees and interest, and future paydays already spent.',
    spot: 'The deal feels urgent and waiting feels like losing.',
    avoid: 'Wait a set time, such as a week, before any purchase you did not plan.',
  },
  {
    term: 'Minimum payment anchoring',
    cite: ['stewart-2009'],
    what: 'Showing a minimum payment pulls people’s chosen payment down toward it.',
    example: 'The statement says ₱1,500 minimum; Liza pays exactly that every month.',
    cost: 'Years of finance charges on a balance that barely moves. See the simulator above.',
    spot: 'You decide your payment by looking at the minimum.',
    avoid: 'Decide a fixed payment from your budget first, then check it is above the minimum.',
  },
  {
    term: 'Mental accounting',
    cite: ['thaler-1999'],
    what: 'Money is treated differently depending on where it came from or which “pocket” it sits in.',
    example: 'A ₱5,000 bonus feels like “extra”, so it goes to a gadget while a credit card balance keeps charging interest.',
    cost: 'Paying finance charges while holding cash that could clear the debt.',
    spot: 'You call some money “pang-luho lang” or “libre”.',
    avoid: 'Every peso is the same peso: compare what each use earns or saves you.',
  },
  {
    term: 'Lifestyle inflation',
    cite: ['brickman-1978'],
    what: 'After a raise or a new comfort, people adapt and the new level soon feels normal.',
    example: 'After a promotion, Paolo upgrades his phone plan, subscriptions and car, and saves no more than before.',
    cost: 'Higher fixed costs that are hard to cut, and no extra savings.',
    spot: 'Your income rose but your savings did not.',
    avoid: 'When pay rises, raise your automatic savings first, then spend the rest.',
  },
  {
    term: 'Sunk cost fallacy',
    cite: ['arkes-blumer-1985'],
    what: 'Continuing something because of what has already been spent on it, not because of what it will bring.',
    example: '“Sayang ang naipon na points” keeps Rina buying from a site she no longer needs.',
    cost: 'More money into something that no longer pays off.',
    spot: 'Your reason to continue is what you already put in.',
    avoid: 'Ask only: from today, is the next peso worth it?',
  },
]

export function PsychologySection() {
  return (
    <section id="psychology" aria-labelledby="psychology-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="psychology"
        icon={Brain}
        tone="accent"
        title="Bakit ang hirap tumigil?"
        lede="These are ordinary ways every brain works, not personal failings. Knowing them makes them easier to notice, and to work around."
      />
      <ul className="m-0 mt-10 grid list-none gap-3 p-0 lg:grid-cols-2" data-testid="biases">
        {BIASES.map((b) => (
          <li key={b.term}>
            <Disclosure
              title={
                <span>
                  {b.term}
                  {b.cite.map((c) => (
                    <Cite key={c} id={c} />
                  ))}
                </span>
              }
            >
              <dl className="m-0 grid gap-3 text-[1rem] leading-relaxed">
                {(
                  [
                    ['What it is', b.what],
                    ['Halimbawa', b.example],
                    ['What it costs', b.cost],
                    ['How to spot it', b.spot],
                    ['What helps', b.avoid],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="ui text-[0.875rem] font-semibold text-muted">{k}</dt>
                    <dd className="m-0">{v}</dd>
                  </div>
                ))}
              </dl>
            </Disclosure>
          </li>
        ))}
      </ul>
      <p className="ui mt-4 text-[0.875rem] text-muted">The names in the examples are illustrative, not real cases. These are tendencies described in research, not a diagnosis of anyone.</p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Kung inipon mo sana                                                  */
/* ------------------------------------------------------------------ */

const FREQ_LABEL: Record<Frequency, string> = { daily: 'a day', weekly: 'a week', monthly: 'a month' }

export function SavingsSection() {
  const [amount, setAmount] = useState(100)
  const [freq, setFreq] = useState<Frequency>('daily')
  const [years, setYears] = useState(5)
  const [ret, setRet] = useState(4)
  const r = futureValue(amount, freq, years, ret)
  const scenarios = [0, 3, 6].map((x) => ({ ret: x, fv: futureValue(amount, freq, years, x).futureValue }))
  const max = Math.max(r.futureValue, ...scenarios.map((s) => s.fv), 1)
  const yearly = futureValue(amount, freq, 1, 0).contributions

  return (
    <section id="kung-inipon" aria-labelledby="kung-inipon-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="kung-inipon"
        icon={PiggyBank}
        tone="gain"
        title="Kung inipon mo sana"
        lede="What a regular amount becomes if it is set aside instead of spent. Small daily amounts are the easiest to underestimate."
      />
      <div className="mt-10">
        <CalcGrid
          inputs={
            <Panel as="section" title="Your amount">
              <div className="grid gap-5">
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
                <SliderField
                  label="Assumed return a year"
                  value={ret}
                  onChange={setRet}
                  min={0}
                  max={10}
                  step={0.5}
                  format={(v) => `${v}%`}
                  testId="s-return"
                  hint="A hypothetical rate. Use 0% for money kept aside without interest."
                />
                <p className="ui rounded-[14px] bg-ground px-4 py-3 text-[0.9375rem]" data-testid="s-yearly">
                  {peso(amount)} {FREQ_LABEL[freq]} is <strong className="font-semibold">{peso(yearly)}</strong> a year.
                </p>
              </div>
            </Panel>
          }
          result={
            <>
              <ResultHero
                label={`After ${years} ${years === 1 ? 'year' : 'years'}`}
                value={r.futureValue}
                format={pesoExact}
                testId="s-fv"
                caption={
                  <>
                    <span data-testid="s-contrib">{pesoExact(r.contributions)}</span> set aside, plus <span data-testid="s-growth">{pesoExact(r.growth)}</span> from an assumed {ret}% a year.
                  </>
                }
              />
              <Panel>
                <div className="grid gap-3" data-testid="s-scenarios">
                  <p className="ui text-[0.875rem] font-semibold text-muted">Hypothetical returns, same amount and years</p>
                  {scenarios.map((s) => (
                    <Bar key={s.ret} label={s.ret === 0 ? '0%: kept aside' : `${s.ret}% a year`} value={s.fv} max={max} display={peso(s.fv)} tone={s.ret === 0 ? 'muted' : 'gain'} />
                  ))}
                </div>
              </Panel>
            </>
          }
        />
      </div>
      <p className="ui mt-4 max-w-[80ch] text-[0.875rem] leading-relaxed text-muted">
        An educational illustration. Returns are assumptions, not guaranteed; inflation and taxes are not included. Contributions are made at the end of each period, with the yearly rate converted to
        the same rate per period. Money not gambled or spent is not automatically money earned: it only becomes savings if it is actually set aside.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Protect                                                              */
/* ------------------------------------------------------------------ */

export function ProtectSection() {
  const groups: { title: string; items: React.ReactNode[] }[] = [
    {
      title: 'Sugal',
      items: [
        'Set a spending limit and a time limit before you start, and keep them.',
        'Never gamble with borrowed money or money meant for bills.',
        'Do not chase losses.',
        <>
          Warning signs: hiding it, borrowing for it, or feeling unable to stop. PAGCOR offers self-exclusion for 6 months, 1 year or 5 years, and family members can request exclusion too.
          <Cite id="pagcor-exclusion" />
        </>,
      ],
    },
    {
      title: 'Loan apps',
      items: [
        <>
          Check that the lender is recorded with the SEC.
          <Cite id="sec-olp-list" />
        </>,
        'Know the total repayment in pesos before you agree, and read the agreement.',
        'Do not borrow to repay another loan without running the numbers.',
        <>
          Lenders may not use your contact list to collect or harass. Report abusive collection.
          <Cite id="npc-2022-02" />
          <Cite id="sec-mc18-2019" />
        </>,
      ],
    },
    {
      title: 'Credit cards',
      items: [
        'Know your statement balance and due date.',
        'Pay the full statement balance whenever you can; avoid relying on the minimum.',
        'Keep track of every installment running on the card.',
        'Turn on spending alerts in your bank’s app, and avoid purchases you cannot reasonably repay.',
      ],
    },
    {
      title: 'Installments',
      items: [
        'Work out the total repayment, not just the monthly amount.',
        'Add it to what you already pay each month first.',
        'Avoid running many plans at once.',
        'Compare the total with the cash price.',
      ],
    },
  ]
  return (
    <section id="protektahan" aria-labelledby="protektahan-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="protektahan"
        icon={ShieldCheck}
        tone="gain"
        title="Protektahan ang pera mo"
        lede="Practical steps, and where to go for help. If you are already in debt or finding it hard to stop, you are not alone, and it is not too late to change course."
      />
      <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="serif text-[1.375rem] leading-tight">{g.title}</h3>
            <ul className="m-0 mt-3 grid list-none gap-2.5 p-0 text-[1rem] leading-relaxed">
              {g.items.map((it, i) => (
                <li key={i} className="flex gap-2.5">
                  <ShieldCheck aria-hidden="true" size={18} className="mt-1 shrink-0 text-gain" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Better title="Where to ask for help">
          <ul className="m-0 grid list-disc gap-2 pl-5">
            <li>
              Bank or credit card problem: first the bank’s own complaints channel; if unresolved, the BSP Consumer Assistance Mechanism through its BSP Online Buddy chatbot.
              <Cite id="bsp-cam" />
            </li>
            <li>
              Gambling: PAGCOR’s responsible gaming and exclusion programs.
              <Cite id="pagcor-rg" />
            </li>
            <li>
              Lending app collection or privacy abuse: the SEC for lending companies and the National Privacy Commission for misuse of your personal data.
              <Cite id="npc-20-01" />
            </li>
            <li>
              Other consumer concerns: the{' '}
              <a href="https://www.dti.gov.ph/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
                Department of Trade and Industry
              </a>
              .
            </li>
          </ul>
        </Better>
        <Warning title="Not a substitute for advice">
          This page explains how these products and habits work, from published rules and research. It is not legal, financial or medical advice. For your own situation, talk to the institution
          involved or a qualified professional.
        </Warning>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Sources                                                              */
/* ------------------------------------------------------------------ */

const STATUS: Record<string, string> = {
  read: 'Document read',
  crossref: 'Details checked with Crossref',
  'not-opened': 'Site refused automated reading; cited for its title and role',
}

export function SourcesSection() {
  return (
    <section id="sources" aria-labelledby="sources-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <h2 id="sources-title" className="text-step-head">
        Sources
      </h2>
      <p className="mt-3 max-w-[70ch] text-[1rem] leading-relaxed text-ink-2">
        Every rule and figure on this page, with what it supports. Rules can change: check the issuing agency for the latest version.
      </p>
      <ol className="m-0 mt-8 grid list-none gap-0 p-0" data-testid="iwasan-sources">
        {IWASAN_SOURCES.map((s, i) => (
          <li key={s.id} id={`src-${s.id}`} className="grid scroll-mt-28 gap-1 border-t border-line py-4 sm:grid-cols-[3rem_minmax(0,1fr)]">
            <span className="figure text-[1.125rem] text-muted">[{i + 1}]</span>
            <div className="min-w-0">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2 [overflow-wrap:anywhere]">
                {s.title}
              </a>
              <p className="ui mt-1 text-[0.875rem] text-ink-2">
                {s.org} · {s.date} · {s.section}
              </p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed">{s.supports}</p>
              <p className="ui mt-1 text-[0.8125rem] text-muted">
                {STATUS[s.status]} · checked {dateLabel(s.verified)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
