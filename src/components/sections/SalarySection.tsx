import { AnimatePresence } from 'motion/react'
import { ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { salaryBreakdown, type BudgetResult, type GroupKey } from '../../calculators/budget'
import { calculateMp2 } from '../../calculators/mp2'
import { D } from '../../calculators/money'
import { PAYS_PER_MONTH, type PayFrequency, type PayrollResult } from '../../calculators/payroll'
import { calculateSavings } from '../../calculators/savings'
import { SalaryCharts } from '../../charts/lazy'
import { banks, latestFuel, latestMp2, recentAverageInflation } from '../../data'
import { safe, type ScenarioState } from '../../hooks/useScenario'
import { CATALOGUE, GROUP_LABELS, useSalary, type SalaryHook } from '../../hooks/useSalary'
import { dateLabel, peso, perLiter } from '../../utils/format'
import { AmountField, NumberField, Segmented, Toggle } from '../ui/fields'
import { AnimatedNumber, Reveal, motion, useReducedMotion, EASE } from '../ui/motion'
import { StatusTag } from '../ui/Status'
import { useRouter } from '../../router'

/** Fixed colour per category; colour follows the entity, never its rank. */
export const GROUP_COLORS: Record<GroupKey | 'government' | 'payroll' | 'remaining', string> = {
  government: '#3d3c38',
  payroll: '#8a877f',
  housing: 'var(--color-s1)',
  transport: 'var(--color-s2)',
  food: 'var(--color-s3)',
  personal: 'var(--color-s4)',
  commitments: 'var(--color-s8)',
  custom: 'var(--color-s5)',
  savings: 'var(--color-s7)',
  remaining: '#2e6a46',
}

const FREQ_LABEL: Record<PayFrequency, string> = {
  monthly: 'once a month',
  semiMonthly: 'twice a month',
  weekly: 'every week',
  biweekly: 'every two weeks',
}

const STATUS = {
  positive: { field: 'bg-gain-soft', dot: 'bg-gain', text: 'May natitira ka pang budget this month!', sub: 'Your take-home pay covers your expenses and savings.' },
  tight: { field: 'bg-warn-soft', dot: 'bg-warn', text: 'Halos ubos na ang budget mo. Check your biggest expenses.', sub: 'Less than 5% of your take-home pay is left.' },
  negative: { field: 'bg-loss-soft', dot: 'bg-loss', text: 'Mas mataas ang expenses mo kaysa sa available salary mo.', sub: 'Your expenses and savings are more than your take-home pay this month.' },
} as const

/* ------------------------------------------------------------------ */

function Card({ title, children, aside, id }: { title: string; children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="bg-paper p-5 sm:p-7" id={id}>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[1.5rem] leading-tight">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  )
}

function SalaryInputs({ h }: { h: SalaryHook }) {
  const [more, setMore] = useState(false)
  const s = h.state.salary
  return (
    <Card title="Sweldo">
      <form className="grid gap-6" onSubmit={(e) => e.preventDefault()}>
        <AmountField label="Basic monthly salary" value={s.basic} onChange={(v) => h.setSalary({ basic: v })} />
        <Segmented<PayFrequency>
          label="How often you are paid"
          wrap
          value={s.frequency}
          onChange={(v) => h.setSalary({ frequency: v })}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'semiMonthly', label: 'Semi-monthly' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Biweekly' },
          ]}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <AmountField label="Taxable allowances (monthly)" value={s.taxableAllowances} onChange={(v) => h.setSalary({ taxableAllowances: v })} hint="Allowances on your payslip that are taxed." />
          <AmountField label="Non-taxable allowances (monthly)" value={s.nonTaxableAllowances} onChange={(v) => h.setSalary({ nonTaxableAllowances: v })} hint="De minimis benefits like rice or laundry allowance, within BIR limits." />
        </div>
        <AmountField label="Other taxable income (monthly)" value={s.otherTaxable} onChange={(v) => h.setSalary({ otherTaxable: v })} hint="Commissions, honoraria or taxable incentives from your employer." />
        <Toggle
          label="I earn the statutory minimum wage"
          checked={s.minimumWageEarner}
          onChange={(v) => h.setSalary({ minimumWageEarner: v })}
          description="Minimum wage, overtime and holiday pay are exempt from income tax. Contributions still apply."
        />
        <div>
          <button type="button" className="btn btn-quiet px-0" aria-expanded={more} aria-controls="salary-more" onClick={() => setMore((v) => !v)}>
            {more ? 'Hide overtime, bonuses and other deductions' : 'Overtime, bonuses and other deductions'}
          </button>
          <AnimatePresence initial={false}>
            {more && (
              <motion.div id="salary-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                <div className="grid gap-6 pt-5 sm:grid-cols-2">
                  <AmountField label="Overtime and holiday pay (monthly)" value={s.overtime} onChange={(v) => h.setSalary({ overtime: v })} />
                  <AmountField label="Other payroll deductions (monthly)" value={s.otherDeductions} onChange={(v) => h.setSalary({ otherDeductions: v })} hint="Salary or SSS loans, co-op dues. Taken after tax." />
                  <AmountField label="13th month pay and bonuses (per year)" value={s.annualBonus} onChange={(v) => h.setSalary({ annualBonus: v })} hint="Tax-free up to ₱90,000 a year. Shown separately, not in the monthly budget." />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </Card>
  )
}

function Deductions({ p, view }: { p: PayrollResult; view: (n: number) => number }) {
  const rows = [
    { label: 'SSS', value: p.sss.employee, note: `5% of your ₱${p.sss.msc.toNumber().toLocaleString('en-PH')} monthly salary credit${p.sss.mpf.gt(0) ? `, including ${peso(p.sss.mpf)} to the provident fund` : ''}`, rule: p.rules.sss },
    { label: 'PhilHealth', value: p.philhealth, note: 'Your half of the 5% premium on basic salary', rule: p.rules.philhealth },
    { label: 'Pag-IBIG', value: p.pagibig, note: 'Mandatory share, on up to ₱10,000 of salary', rule: p.rules.pagibig },
    { label: 'Withholding tax', value: p.withholdingMonthly, note: p.withholdingMonthly.isZero() ? 'None: your taxable pay is below the BIR threshold' : `BIR table on ${peso(p.taxableIncome)} taxable pay a month`, rule: p.rules.tax },
  ]
  return (
    <Card title="Government deductions" aside={<span className="ui text-[0.9375rem] text-ink-2">Estimated automatically</span>}>
      <ul data-ui className="ui m-0 grid list-none gap-1 p-0">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 bg-ground px-4 py-3">
            <span className="font-semibold">{r.label}</span>
            <span className="tabular text-right font-semibold">{peso(view(r.value.toNumber()))}</span>
            <span className="col-span-2 text-[0.9375rem] text-ink-2">
              {r.note}.{' '}
              <a className="link" href={r.rule.sourceUrl} target="_blank" rel="noreferrer">
                Source
              </a>
            </span>
          </li>
        ))}
        {p.otherDeductions.gt(0) && (
          <li className="grid grid-cols-[1fr_auto] gap-x-4 bg-ground px-4 py-3">
            <span className="font-semibold">Other payroll deductions</span>
            <span className="tabular text-right font-semibold">{peso(view(p.otherDeductions.toNumber()))}</span>
          </li>
        )}
      </ul>
      {p.bonus.gross.gt(0) && (
        <p className="ui mt-4 text-[0.9375rem] text-ink-2">
          13th month and bonuses this year: {peso(p.bonus.gross)}, of which {peso(p.bonus.exempt)} is tax-free. Estimated extra tax on the rest: {peso(p.bonus.estimatedTax)}.
        </p>
      )}
      {p.assumptions.length > 0 && (
        <ul className="ui mt-4 grid list-disc gap-1 pl-5 text-[0.9375rem] text-ink-2">
          {p.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Group({ group, h, budget, children, defaultOpen = false }: { group: GroupKey; h: SalaryHook; budget: BudgetResult | null; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const reduce = useReducedMotion()
  const id = useId()
  const off = h.state.disabled.includes(group)
  const total = budget?.byGroup[group].toNumber() ?? 0
  return (
    <div className={`bg-paper transition-opacity ${off ? 'opacity-70' : ''}`}>
      <div className="flex items-stretch">
        <button type="button" className="ui flex flex-1 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-ground sm:px-7" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: GROUP_COLORS[group] }} />
          <span className="flex-1 text-[1.0625rem] font-semibold">{GROUP_LABELS[group]}</span>
          <span className="tabular text-[1.0625rem]">{off ? 'Off' : peso(total)}</span>
          <ChevronDown aria-hidden="true" size={20} className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: EASE }} className="overflow-hidden">
            <div className="px-5 pb-6 sm:px-7">
              <div className="mb-5">
                <Toggle label={`Include ${GROUP_LABELS[group].toLowerCase()} in my budget`} checked={!off} onChange={() => h.toggleGroup(group)} />
              </div>
              <fieldset disabled={off} className="m-0 min-w-0 border-0 p-0">
                <legend className="sr-only">{GROUP_LABELS[group]}</legend>
                {children}
              </fieldset>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Items({ group, h }: { group: Exclude<GroupKey, 'custom'>; h: SalaryHook }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {CATALOGUE[group].map((d) => {
        const computed = d.id === 'carFuel' && h.state.fuel.on
        if (computed) return null
        return <AmountField key={d.id} label={d.label} value={h.state.amounts[d.id] ?? 0} onChange={(v) => h.setAmount(d.id, v)} hint={d.hint} />
      })}
    </div>
  )
}

function FuelEstimator({ h }: { h: SalaryHook }) {
  const f = h.state.fuel
  return (
    <div className="mt-6 bg-ground p-5">
      <Toggle
        label="Estimate car gasoline from distance"
        checked={f.on}
        onChange={(v) => h.setFuel({ on: v })}
        description="Uses kilometers per day, travel days, your car's fuel efficiency and the price you pay."
      />
      {f.on && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <NumberField label="Kilometers a day (round trip)" min={0} max={2000} step={1} value={f.kmPerDay} onChange={(v) => h.setFuel({ kmPerDay: v })} suffix="km" />
          <NumberField label="Travel days a week" min={0} max={7} step={1} value={f.daysPerWeek} onChange={(v) => h.setFuel({ daysPerWeek: v })} suffix="days" />
          <NumberField label="Fuel efficiency" min={1} max={100} step={0.5} value={f.kmPerLiter} onChange={(v) => h.setFuel({ kmPerLiter: v })} suffix="km/L" />
          <NumberField
            label="Price you pay per liter"
            min={0}
            max={500}
            step={0.01}
            value={f.pricePerLiter}
            onChange={(v) => h.setFuel({ pricePerLiter: v })}
            suffix="₱/L"
            hint={`Pump prices differ by area, so enter your station's price. DOE's latest gasoline move (${dateLabel(latestFuel.effectiveDate)}): ${perLiter(latestFuel.gasoline.min, latestFuel.gasoline.max)}.`}
          />
          <p className="ui sm:col-span-2" aria-live="polite">
            {!h.fuel ? null : h.fuel.ok ? (
              f.pricePerLiter > 0 ? (
                <>
                  About <strong className="tabular">{Math.round(h.fuel.value.km.toNumber()).toLocaleString('en-PH')} km</strong> and{' '}
                  <strong className="tabular">{h.fuel.value.liters.toFixed(1)} L</strong> a month: <strong className="tabular">{peso(h.fuel.value.cost)}</strong> for car gasoline.
                </>
              ) : (
                'Enter the price per liter to estimate your gasoline cost.'
              )
            ) : (
              <span className="field-error">{h.fuel.error}</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

function CustomItems({ h }: { h: SalaryHook }) {
  return (
    <div className="grid gap-4">
      {h.state.custom.length === 0 && <p className="ui text-ink-2">Add anything that is not on the lists above.</p>}
      <ul className="m-0 grid list-none gap-4 p-0">
        {h.state.custom.map((c, i) => (
          <li key={c.id} className="grid items-end gap-3 sm:grid-cols-[1fr_12rem_auto]">
            <div className="ui">
              <label htmlFor={`${c.id}-name`} className="mb-2 block text-[0.9375rem] font-medium">
                Expense name
              </label>
              <input id={`${c.id}-name`} className="field-input" value={c.label} placeholder={`Custom expense ${i + 1}`} maxLength={60} onChange={(e) => h.updateCustom(c.id, { label: e.target.value })} />
            </div>
            <AmountField label="Amount per month" value={c.amount} onChange={(v) => h.updateCustom(c.id, { amount: v })} />
            <button type="button" className="btn btn-quiet h-12 justify-self-start no-underline hover:text-loss" onClick={() => h.removeCustom(c.id)}>
              <Trash2 aria-hidden="true" size={18} />
              <span className="sr-only">Remove {c.label || `custom expense ${i + 1}`}</span>
              <span aria-hidden="true">Remove</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-paper justify-self-start bg-ground hover:bg-surface" onClick={h.addCustom}>
        <Plus aria-hidden="true" size={18} /> Add an expense
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Summary({ h, p, b, unit }: { h: SalaryHook; p: PayrollResult; b: BudgetResult; unit: { f: (n: number) => number; label: string } }) {
  const st = STATUS[b.status]
  const v = (n: { toNumber: () => number }) => unit.f(n.toNumber())
  return (
    <div className="bg-paper p-5 sm:p-7" aria-live="polite">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="ui text-[0.9375rem] font-semibold">Natitirang sweldo mo</p>
        {p.paysPerMonth !== 1 && (
          <div className="w-[15rem]">
            <Segmented
              label="Show amounts"
              hideLabel
              value={h.view}
              onChange={h.setView}
              options={[
                { value: 'monthly', label: 'Per month' },
                { value: 'perPay', label: 'Per payday' },
              ]}
            />
          </div>
        )}
      </div>
      <div data-ui>
      <p data-testid="remaining" className={`tabular text-[clamp(2.75rem,5vw,4.25rem)] leading-none font-medium tracking-[-0.03em] ${b.remaining.lt(0) ? 'text-loss' : ''}`}>
        <AnimatedNumber value={v(b.remaining)} format={(n) => (n < 0 ? `−${peso(Math.abs(n))}` : peso(n))} />
      </p>
      <p className="ui mt-2 text-[0.9375rem] text-ink-2">{unit.label}, after deductions, expenses and savings</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={b.status} data-ui initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className={`mt-6 ${st.field} p-4`}>
          <p className="flex items-start gap-2.5 font-medium">
            <span aria-hidden="true" className={`mt-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
            {st.text}
          </p>
          <p className="ui mt-1 pl-5 text-[0.9375rem] text-ink-2">{st.sub}</p>
        </motion.div>
      </AnimatePresence>

      <dl data-ui className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5">
        {[
          { label: 'Gross salary', value: v(p.grossMonthly) },
          { label: 'Estimated take-home pay', value: v(p.takeHomeMonthly) },
          { label: 'Total expenses', value: v(b.expenses) },
          { label: 'Savings and investments', value: v(b.savings) },
        ].map((x) => (
          <div key={x.label} className="flex flex-col-reverse justify-end">
            <dt className="ui mt-1 text-[0.9375rem] text-ink-2">{x.label}</dt>
            <dd className="m-0 tabular text-[1.5rem] leading-tight font-medium">
              <AnimatedNumber value={x.value} format={peso} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="ui mt-5 text-[0.9375rem] text-ink-2">
        Government deductions: {peso(v(p.governmentTotal))} {unit.label.toLowerCase()}. An estimate: actual payroll can differ with your employer's practices.
      </p>
    </div>
  )
}

function Projection({ remaining, s }: { remaining: number; s: ScenarioState }) {
  const suggestion = Math.max(0, Math.floor(remaining / 100) * 100)
  const [amount, setAmount] = useState<number | null>(null)
  const monthly = amount ?? suggestion
  const years = 5
  const inflationRate = recentAverageInflation.value
  const rows = useMemo(() => {
    if (monthly <= 0) return []
    const out: { label: string; final: number; real: number; note: string }[] = []
    const m = safe(() => calculateMp2({ initial: 0, contribution: monthly, frequency: 'monthly', years, startMonth: new Date().getMonth() + 1, dividendRatePct: latestMp2.rate, payout: 'compounded', inflationPct: inflationRate }))
    if (m.ok) out.push({ label: 'Pag-IBIG MP2', final: m.value.maturityValue.toNumber(), real: m.value.real.realEnding.toNumber(), note: `${latestMp2.rate}% (${latestMp2.year} rate, not guaranteed), tax-free` })
    for (const id of ['maya-savings', 'tonik-solo-stash', 'gotyme-goalsave']) {
      const p = banks.products.find((x) => x.id === id)
      if (!p) continue
      const r = safe(() => calculateSavings({ initial: 0, monthly, years, product: p, inflationPct: inflationRate }))
      if (r.ok) out.push({ label: `${p.bank} ${p.product}`, final: r.value.finalBalance.toNumber(), real: r.value.real.realEnding.toNumber(), note: `${p.baseTiers[0].rate}% base rate, after 20% tax` })
    }
    return out
  }, [monthly, inflationRate])

  const { navigate } = useRouter()
  function useInMp2() {
    s.setScenario((x) => ({ ...x, monthly, initial: 0, years }))
    navigate('/mp2')
  }

  if (remaining <= 0) return null
  return (
    <div className="bg-surface p-5 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h3 className="text-[1.5rem] leading-tight">Paano kung i-invest mo ang natitira?</h3>
          <p className="mt-3 text-ink-2">What if you invest part of what is left each month for {years} years? Projections use published rates and {inflationRate}% inflation.</p>
          <div className="mt-6">
            <AmountField label="Amount to invest each month" value={monthly} onChange={(v) => setAmount(v)} hint={`Up to ${peso(remaining)} is left this month.`} />
          </div>
          <button type="button" className="btn btn-ink mt-6" onClick={useInMp2} disabled={monthly <= 0}>
            Use in the MP2 calculator
          </button>
        </div>
        <ul data-ui className="ui m-0 grid list-none content-start gap-2 p-0 lg:col-span-8">
          {rows.map((r) => (
            <li key={r.label} className="grid gap-1 bg-paper px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-6">
              <span>
                <span className="block font-semibold">{r.label}</span>
                <span className="block text-[0.9375rem] text-ink-2">{r.note}</span>
              </span>
              <span className="tabular sm:text-right">
                <span className="block text-[1.25rem] font-medium">{peso(r.final)}</span>
                <span className="block text-[0.8125rem] text-ink-2">after {years} years</span>
              </span>
              <span className="tabular sm:text-right">
                <span className="block text-[1.25rem] font-medium">{peso(r.real)}</span>
                <span className="block text-[0.8125rem] text-ink-2">in today's pesos</span>
              </span>
            </li>
          ))}
          {rows.length > 0 && <li className="px-1 pt-1 text-[0.9375rem] text-ink-2">You would put in {peso(monthly * 12 * years)}. Projections, not guaranteed returns.</li>}
        </ul>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function SalarySection({ s }: { s: ScenarioState }) {
  const h = useSalary()
  const p = h.payroll
  const b = h.budget
  const freq = h.state.salary.frequency
  const perPay = h.view === 'perPay' && freq !== 'monthly'
  const unit = perPay ? { f: (n: number) => n / PAYS_PER_MONTH[freq], label: `Per payday (${FREQ_LABEL[freq]})` } : { f: (n: number) => n, label: 'Per month' }

  const charts = useMemo(() => {
    if (!p.ok || !b?.ok) return null
    const bd = safe(() => salaryBreakdown(p.value.grossMonthly, p.value.governmentTotal, p.value.otherDeductions, b.value, GROUP_LABELS))
    const { segments, shortfall } = bd.ok ? bd.value : { segments: [], shortfall: new D(0) }
    return {
      donut: {
        slices: segments.map((x) => ({ key: x.key, label: x.label, value: x.amount.toNumber(), color: GROUP_COLORS[x.key as keyof typeof GROUP_COLORS] })),
        total: p.value.grossMonthly.toNumber(),
        shortfall: shortfall.toNumber(),
        centerLabel: 'Gross per month',
        centerValue: peso(p.value.grossMonthly),
      },
      ranking: b.value.ranking.map((r) => ({ key: r.group, label: GROUP_LABELS[r.group], value: r.amount.toNumber(), color: GROUP_COLORS[r.group] })),
      compare: [
        { key: 'gross', label: 'Gross', value: p.value.grossMonthly.toNumber(), color: '#3d3c38' },
        { key: 'take-home', label: 'Net pay', value: p.value.takeHomeMonthly.toNumber(), color: 'var(--color-s1)' },
        { key: 'spending', label: 'Expenses', value: b.value.expenses.toNumber(), color: 'var(--color-s2)' },
        { key: 'left', label: 'Left', value: b.value.remaining.toNumber(), color: b.value.remaining.lt(0) ? '#a43a30' : '#2e6a46' },
      ],
    }
  }, [p, b])

  return (
    <section id="sweldo" aria-labelledby="sweldo-title" className="pt-[clamp(24px,4vw,56px)]">
      <div className="wrap">
        <div className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <h1 id="sweldo-title" className="text-step-head">
              Saan napupunta ang sweldo ko?
            </h1>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5 lg:pt-3">
            <p className="text-[1.1875rem] leading-relaxed">
              Alamin kung magkano ang tunay na natitira sa sweldo mo pagkatapos ng deductions, bills, at everyday expenses.
            </p>
            <p className="ui mt-3 text-[0.9375rem] text-ink-2">Enter your salary, check the deductions, add your expenses, see what is left. Everything stays in your browser.</p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-2 lg:grid-cols-12 lg:items-start">
          {/* Inputs */}
          <div className="grid gap-2 lg:col-span-7">
            <SalaryInputs h={h} />
            {p.ok ? <Deductions p={p.value} view={unit.f} /> : <p role="alert" className="ui bg-loss-soft p-5 text-loss">{p.error}</p>}

            <div className="bg-paper px-5 pt-6 pb-4 sm:px-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-[1.5rem] leading-tight">Buwanang gastos</h3>
                <button type="button" className="btn btn-quiet px-0 text-[0.9375rem]" onClick={h.fillSample}>
                  Fill a sample budget
                </button>
              </div>
              <p className="ui mt-2 text-[0.9375rem] text-ink-2">Monthly amounts. Leave anything that does not apply at ₱0. Open a category to edit it.</p>
            </div>
            <div className="grid gap-1">
              <Group group="housing" h={h} budget={b?.ok ? b.value : null} defaultOpen>
                <Items group="housing" h={h} />
              </Group>
              <Group group="transport" h={h} budget={b?.ok ? b.value : null}>
                <Items group="transport" h={h} />
                <FuelEstimator h={h} />
              </Group>
              <Group group="food" h={h} budget={b?.ok ? b.value : null}>
                <Items group="food" h={h} />
              </Group>
              <Group group="personal" h={h} budget={b?.ok ? b.value : null}>
                <Items group="personal" h={h} />
              </Group>
              <Group group="commitments" h={h} budget={b?.ok ? b.value : null}>
                <Items group="commitments" h={h} />
              </Group>
              <Group group="custom" h={h} budget={b?.ok ? b.value : null}>
                <CustomItems h={h} />
              </Group>
            </div>
            <div className="mt-1 grid gap-1">
              <div className="bg-paper px-5 pt-6 pb-2 sm:px-7">
                <h3 className="text-[1.5rem] leading-tight">Ipon at investments</h3>
                <p className="ui mt-2 text-[0.9375rem] text-ink-2">Money you set aside. It lowers what is left to spend, but it is not an expense.</p>
              </div>
              <Group group="savings" h={h} budget={b?.ok ? b.value : null} defaultOpen>
                <Items group="savings" h={h} />
              </Group>
            </div>
          </div>

          {/* Results */}
          <div className="grid gap-2 lg:sticky lg:top-[76px] lg:col-span-5">
            {p.ok && b?.ok ? <Summary h={h} p={p.value} b={b.value} unit={unit} /> : <p className="ui bg-loss-soft p-5 text-loss">{b && !b.ok ? b.error : 'Check the salary inputs.'}</p>}
            <div className="ui flex flex-wrap items-center gap-x-5 gap-y-3 bg-paper px-5 py-4 text-[0.9375rem] sm:px-7">
              <Toggle
                label="Remember on this device"
                checked={h.remember}
                onChange={h.setRemember}
                description="Saves your entries in this browser only. Nothing is sent anywhere. Off by default."
              />
              <div className="flex gap-4">
                <button type="button" className="btn btn-quiet px-0" onClick={h.reset}>
                  <RotateCcw aria-hidden="true" size={16} /> Reset
                </button>
                {h.remember && (
                  <button type="button" className="btn btn-quiet px-0" onClick={h.clearSaved}>
                    Clear saved data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {charts && (
          <div className="mt-2 bg-paper p-5 sm:p-8">
            <SalaryCharts donut={charts.donut} ranking={charts.ranking} compare={charts.compare} />
          </div>
        )}
        {p.ok && b?.ok && (
          <div className="mt-2">
            <Projection remaining={b.value.remaining.toNumber()} s={s} />
          </div>
        )}
        {p.ok && (
          <p className="ui mt-6 max-w-[80ch] text-[0.9375rem] leading-relaxed text-ink-2">
            Estimates using {p.value.rules.sss.issuance}; {p.value.rules.philhealth.issuance}; {p.value.rules.pagibig.issuance}; and {p.value.rules.tax.issuance}. <StatusTag status={p.value.rules.philhealth.status} extra="PhilHealth and Pag-IBIG rates cross-checked" />
          </p>
        )}
      </div>

      {/* Phone: keep the answer in view while editing a long list */}
      {p.ok && b?.ok && (
        <div className="ui sticky bottom-0 z-30 mt-6 bg-surface px-[var(--gutter)] py-3 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[0.9375rem] font-medium">Natitira {perPay ? 'per payday' : 'per month'}</span>
            <span className={`tabular text-[1.375rem] font-semibold ${b.value.remaining.lt(0) ? 'text-loss' : ''}`}>
              {b.value.remaining.lt(0) ? `−${peso(Math.abs(unit.f(b.value.remaining.toNumber())))}` : peso(unit.f(b.value.remaining.toNumber()))}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
