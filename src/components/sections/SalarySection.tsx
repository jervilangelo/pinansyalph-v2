/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { AnimatePresence } from 'motion/react'
import { ArrowRight, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { salaryBreakdown, type BudgetResult, type GroupKey } from '../../calculators/budget'
import { calculateMp2 } from '../../calculators/mp2'
import { D } from '../../calculators/money'
import { PAYS_PER_MONTH, type PayFrequency, type PayrollResult } from '../../calculators/payroll'
import { calculateSavings } from '../../calculators/savings'
import { SalaryCharts } from '../../charts/lazy'
import { banks, latestFuel, latestMp2, recentAverageInflation } from '../../data'
import { safe, type ScenarioState } from '../../hooks/useScenario'
import { CATALOGUE, GROUP_LABELS, useSalary, type SalaryHook } from '../../hooks/useSalary'
import { Link, useRouter } from '../../router'
import { dateLabel, peso, perLiter } from '../../utils/format'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, NumberField, Segmented, Toggle } from '../ui/fields'
import { AnimatedNumber, DUR, EASE, Reveal, motion } from '../ui/motion'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

/** Fixed colour per category; colour follows the entity, never its rank. */
export const GROUP_COLORS: Record<GroupKey | 'government' | 'payroll' | 'remaining', string> = {
  government: 'var(--color-ink-2)',
  payroll: 'var(--color-placeholder)',
  housing: 'var(--color-s1)',
  transport: 'var(--color-s2)',
  food: 'var(--color-s3)',
  personal: 'var(--color-s4)',
  commitments: 'var(--color-s8)',
  custom: 'var(--color-s5)',
  savings: 'var(--color-s7)',
  remaining: 'var(--color-gain)',
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

type Unit = { f: (n: number) => number; label: string }

/* ----------------------------- Step 1: pay ----------------------------- */

function SalaryInputs({ h }: { h: SalaryHook }) {
  const s = h.state.salary
  return (
    <Panel as="form" title={t("Your pay")} intro={t("Your basic salary is enough to start. Add the rest only if it is on your payslip.")}>
      <div className="grid gap-6">
        <AmountField label={t("Basic monthly salary")} value={s.basic} onChange={(v) => h.setSalary({ basic: v })} />
        <Segmented<PayFrequency>
          label={t("How often you are paid")}
          wrap
          value={s.frequency}
          onChange={(v) => h.setSalary({ frequency: v })}
          options={[
            { value: 'monthly', label: t("Monthly") },
            { value: 'semiMonthly', label: t("Semi-monthly") },
            { value: 'weekly', label: t("Weekly") },
            { value: 'biweekly', label: t("Biweekly") },
          ]}
        />
        <Toggle
          label={t("I earn the statutory minimum wage")}
          checked={s.minimumWageEarner}
          onChange={(v) => h.setSalary({ minimumWageEarner: v })}
          description={t("Minimum wage, overtime and holiday pay are exempt from income tax. Contributions still apply.")}
        />
        <Disclosure title={t("Allowances, overtime and bonuses")} summary={extrasSummary(h)} tone="ground" size="sm">
          <div className="grid gap-6 pt-2 sm:grid-cols-2">
            <AmountField label={t("Taxable allowances (monthly)")} value={s.taxableAllowances} onChange={(v) => h.setSalary({ taxableAllowances: v })} hint={t("Allowances on your payslip that are taxed.")} />
            <AmountField label={t("Non-taxable allowances (monthly)")} value={s.nonTaxableAllowances} onChange={(v) => h.setSalary({ nonTaxableAllowances: v })} hint={t("De minimis benefits like rice or laundry allowance, within BIR limits.")} />
            <AmountField label={t("Other taxable income (monthly)")} value={s.otherTaxable} onChange={(v) => h.setSalary({ otherTaxable: v })} hint={t("Commissions, honoraria or taxable incentives from your employer.")} />
            <AmountField label={t("Overtime and holiday pay (monthly)")} value={s.overtime} onChange={(v) => h.setSalary({ overtime: v })} />
            <AmountField label={t("Other payroll deductions (monthly)")} value={s.otherDeductions} onChange={(v) => h.setSalary({ otherDeductions: v })} hint={t("Salary or SSS loans, co-op dues. Taken after tax.")} />
            <AmountField label={t("13th month pay and bonuses (per year)")} value={s.annualBonus} onChange={(v) => h.setSalary({ annualBonus: v })} hint={t("Tax-free up to ₱90,000 a year. Shown separately, not in the monthly budget.")} />
          </div>
        </Disclosure>
      </div>
    </Panel>
  )
}

function extrasSummary(h: SalaryHook) {
  const s = h.state.salary
  const n = [s.taxableAllowances, s.nonTaxableAllowances, s.otherTaxable, s.overtime, s.otherDeductions, s.annualBonus].filter((x) => x > 0).length
  return n ? t('{n} added', { n }) : t('Optional')
}

function Deductions({ p, unit }: { p: PayrollResult; unit: Unit }) {
  const rows = [
    { label: 'SSS', value: p.sss.employee, note: `5% of your ₱${p.sss.msc.toNumber().toLocaleString('en-PH')} monthly salary credit${p.sss.mpf.gt(0) ? `, including ${peso(p.sss.mpf)} to the provident fund` : ''}`, rule: p.rules.sss },
    { label: 'PhilHealth', value: p.philhealth, note: 'Your half of the 5% premium on basic salary', rule: p.rules.philhealth },
    { label: 'Pag-IBIG', value: p.pagibig, note: 'Mandatory share, on up to ₱10,000 of salary', rule: p.rules.pagibig },
    { label: 'Withholding tax', value: p.withholdingMonthly, note: p.withholdingMonthly.isZero() ? 'None: your taxable pay is below the BIR threshold' : `BIR table on ${peso(p.taxableIncome)} taxable pay a month`, rule: p.rules.tax },
  ]
  return (
    <>
      <ul data-ui className="ui m-0 grid list-none gap-1.5 p-0">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 rounded-[16px] bg-ground px-4 py-3">
            <span className="font-semibold">{tv(r.label)}</span>
            <span className="tabular text-right font-semibold">{peso(unit.f(r.value.toNumber()))}</span>
            <span className="col-span-2 text-[0.875rem] leading-snug text-muted">
              {tv(r.note)}.{' '}
              <a className="link" href={r.rule.sourceUrl} target="_blank" rel="noopener noreferrer">{t("Source")}</a>
            </span>
          </li>
        ))}
        {p.otherDeductions.gt(0) && (
          <li className="grid grid-cols-[1fr_auto] gap-x-4 rounded-[16px] bg-ground px-4 py-3">
            <span className="font-semibold">{t("Other payroll deductions")}</span>
            <span className="tabular text-right font-semibold">{peso(unit.f(p.otherDeductions.toNumber()))}</span>
          </li>
        )}
      </ul>
      {p.bonus.gross.gt(0) && (
        <p className="ui mt-4 text-[0.9375rem] text-ink-2">{tx("13th month and bonuses this year: {gross}, of which {exempt} is tax-free. Estimated extra tax on the rest: {estimatedTax}.", { gross: (peso(p.bonus.gross)), exempt: (peso(p.bonus.exempt)), estimatedTax: (peso(p.bonus.estimatedTax)), })}</p>
      )}
      {p.assumptions.length > 0 && (
        <ul className="ui mt-4 grid list-disc gap-1 pl-5 text-[0.875rem] text-muted">
          {p.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </>
  )
}

function PayResult({ h, p, unit }: { h: SalaryHook; p: PayrollResult; unit: Unit }) {
  const gov = unit.f(p.governmentTotal.toNumber())
  return (
    <>
      <ResultHero
        label={t("Estimated take-home pay")}
        value={unit.f(p.takeHomeMonthly.toNumber())}
        format={peso}
        testId="take-home"
        caption={
          <>{tx("{v0}. From {peso} gross, {gov} goes to SSS, PhilHealth, Pag-IBIG and tax{v3}.", { v0: (unit.label.toLowerCase()), peso: (peso(unit.f(p.grossMonthly.toNumber()))), gov: (peso(gov)), v3: (p.otherDeductions.gt(0) ? t(", and {v0} to other deductions", { v0: peso(unit.f(p.otherDeductions.toNumber())) }) : ''), })}</>
        }
      >
        {p.paysPerMonth !== 1 && (
          <div className="mt-6 max-w-[17rem] [&_.bg-surface]:bg-white/15 [&_.text-ink-2]:text-white/85 [&_.text-ink-2:hover]:text-white">
            <Segmented
              label={t("Show amounts")}
              hideLabel
              value={h.view}
              onChange={h.setView}
              options={[
                { value: 'monthly', label: t("Per month") },
                { value: 'perPay', label: t("Per payday") },
              ]}
            />
          </div>
        )}
      </ResultHero>
      <div className="card p-2">
        <Disclosure title={t("Where the deductions go")} summary={peso(gov)} tone="plain" id="deductions">
          <Deductions p={p} unit={unit} />
        </Disclosure>
      </div>
      <Link to="/underpaid-ba-ko" className="card group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent-soft sm:px-6">
        <span>
          <span className="block font-semibold">{t("Underpaid ba ko?")}</span>
          <span className="ui block text-[0.875rem] text-muted">{t("Compare your pay with official PSA wage data for your job and region.")}</span>
        </span>
        <ArrowRight aria-hidden="true" size={20} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </>
  )
}

/* ---------------------------- Step 2: budget ---------------------------- */

function Group({ group, h, budget, children, defaultOpen = false }: { group: GroupKey; h: SalaryHook; budget: BudgetResult | null; children: ReactNode; defaultOpen?: boolean }) {
  const off = h.state.disabled.includes(group)
  const total = budget?.byGroup[group].toNumber() ?? 0
  return (
    <Disclosure
      tone="paper"
      defaultOpen={defaultOpen}
      title={
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: GROUP_COLORS[group] }} />
          {tv(GROUP_LABELS[group])}
        </span>
      }
      summary={off ? t("Off") : peso(total)}
    >
      <div className={`transition-opacity ${off ? 'opacity-70' : ''}`}>
        <div className="mb-5">
          <Toggle label={t("Include {v0} in my budget", { v0: tv(GROUP_LABELS[group]).toLowerCase() })} checked={!off} onChange={() => h.toggleGroup(group)} />
        </div>
        <fieldset disabled={off} className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{tv(GROUP_LABELS[group])}</legend>
          {children}
        </fieldset>
      </div>
    </Disclosure>
  )
}

function Items({ group, h }: { group: Exclude<GroupKey, 'custom'>; h: SalaryHook }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {CATALOGUE[group].map((d) => {
        if (d.id === 'carFuel' && h.state.fuel.on) return null
        return <AmountField key={d.id} label={tv(d.label)} value={h.state.amounts[d.id] ?? 0} onChange={(v) => h.setAmount(d.id, v)} hint={tv(d.hint)} />
      })}
    </div>
  )
}

function FuelEstimator({ h }: { h: SalaryHook }) {
  const f = h.state.fuel
  return (
    <div className="tile mt-6 p-5">
      <Toggle label={t("Estimate car gasoline from distance")} checked={f.on} onChange={(v) => h.setFuel({ on: v })} description={t("Uses kilometers per day, travel days, your car's fuel efficiency and the price you pay.")} />
      {f.on && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <NumberField label={t("Kilometers a day (round trip)")} min={0} max={2000} step={1} value={f.kmPerDay} onChange={(v) => h.setFuel({ kmPerDay: v })} suffix="km" />
          <NumberField label={t("Travel days a week")} min={0} max={7} step={1} value={f.daysPerWeek} onChange={(v) => h.setFuel({ daysPerWeek: v })} suffix="days" />
          <NumberField label={t("Fuel efficiency")} min={1} max={100} step={0.5} value={f.kmPerLiter} onChange={(v) => h.setFuel({ kmPerLiter: v })} suffix="km/L" />
          <NumberField
            label={t("Price you pay per liter")}
            min={0}
            max={500}
            step={0.01}
            value={f.pricePerLiter}
            onChange={(v) => h.setFuel({ pricePerLiter: v })}
            suffix="₱/L"
            hint={t("Pump prices differ by area, so enter your station's price. DOE's latest gasoline move ({effectiveDate}): {min}.", { effectiveDate: dateLabel(latestFuel.effectiveDate), min: perLiter(latestFuel.gasoline.min, latestFuel.gasoline.max) })}
          />
          <p className="ui sm:col-span-2" aria-live="polite">
            {!h.fuel ? null : h.fuel.ok ? (
              f.pricePerLiter > 0 ? (
                <>{tx("About {strong} and {strong2} a month: {strong22} for car gasoline.", { strong: (<strong className="tabular">{tx("{v0} km", { v0: (Math.round(h.fuel.value.km.toNumber()).toLocaleString('en-PH')), })}</strong>), strong2: (<strong className="tabular">{h.fuel.value.liters.toFixed(1)}{' '}{t("L")}</strong>), strong22: (<strong className="tabular">{peso(h.fuel.value.cost)}</strong>), })}</>
              ) : (
                t('Enter the price per liter to estimate your gasoline cost.')
              )
            ) : (
              <span className="field-error">{tv(h.fuel.error)}</span>
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
      {h.state.custom.length === 0 && <p className="ui text-[0.9375rem] text-muted">{t("Add anything that is not on the lists above.")}</p>}
      <ul className="m-0 grid list-none gap-4 p-0">
        <AnimatePresence initial={false}>
          {h.state.custom.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className="grid items-end gap-3 sm:grid-cols-[1fr_12rem_auto]"
            >
              <div className="ui">
                <label htmlFor={`${c.id}-name`} className="field-label">{t("Expense name")}</label>
                <input id={`${c.id}-name`} className="field-input" value={c.label} placeholder={t("Custom expense {v0}", { v0: i + 1 })} maxLength={60} onChange={(e) => h.updateCustom(c.id, { label: e.target.value })} />
              </div>
              <AmountField label={t("Amount per month")} value={c.amount} onChange={(v) => h.updateCustom(c.id, { amount: v })} />
              <button type="button" className="btn btn-soft h-[52px] justify-self-start hover:text-loss" onClick={() => h.removeCustom(c.id)}>
                <Trash2 aria-hidden="true" size={18} />
                <span className="sr-only">{tx("Remove {v0}", { v0: (tv(c.label) || t("custom expense {v0}", { v0: i + 1 })), })}</span>
                <span aria-hidden="true">{t("Remove")}</span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <button type="button" className="btn btn-soft justify-self-start" onClick={h.addCustom}>
        <Plus aria-hidden="true" size={18} />{' '}{t("Add an expense")}</button>
    </div>
  )
}

function BudgetResult({ h, p, b, unit, empty }: { h: SalaryHook; p: PayrollResult; b: BudgetResult; unit: Unit; empty: boolean }) {
  const st = STATUS[b.status]
  const v = (n: { toNumber: () => number }) => unit.f(n.toNumber())
  const negative = b.remaining.lt(0)
  return (
    <>
      <ResultHero
        label={t("Natitirang sweldo mo")}
        tone={empty ? 'soft' : negative ? 'loss' : 'accent'}
        value={v(b.remaining)}
        format={(n) => (n < -0.5 ? `−${peso(Math.abs(n))}` : peso(n))}
        testId="remaining"
        caption={empty ? t("Nothing added yet, so this is your whole take-home pay. Open a category to add your bills.") : t("{label}, after deductions, expenses and savings.", { label: unit.label })}
      />
      <div className="card p-5 sm:p-7">
        <AnimatePresence mode="wait" initial={false}>
          {!empty && <motion.div key={b.status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className={`rounded-[18px] ${st.field} p-4`}>
            <p className="flex items-start gap-2.5 font-semibold">
              <span aria-hidden="true" className={`mt-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
              {tv(st.text)}
            </p>
            <p className="ui mt-1 pl-5 text-[0.9375rem] text-ink-2">{tv(st.sub)}</p>
          </motion.div>}
        </AnimatePresence>
        <dl data-ui className={`m-0 grid ${empty ? '' : 'mt-6'} grid-cols-2 gap-x-5 gap-y-5`}>
          <Stat label={t("Take-home pay")} value={<AnimatedNumber value={v(p.takeHomeMonthly)} format={peso} />} />
          <Stat label={t("Total expenses")} value={<AnimatedNumber value={v(b.expenses)} format={peso} />} />
          <Stat label={t("Savings and investments")} value={<AnimatedNumber value={v(b.savings)} format={peso} />} />
          <Stat label={t("Government deductions")} value={<AnimatedNumber value={v(p.governmentTotal)} format={peso} />} />
        </dl>
      </div>
      <div className="card ui flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 text-[0.9375rem] sm:px-7">
        <Toggle label={t("Remember on this device")} checked={h.remember} onChange={h.setRemember} description={t("Saves your entries in this browser only. Nothing is sent anywhere. Off by default.")} />
        <div className="flex gap-4">
          <button type="button" className="btn btn-quiet" onClick={h.reset}>
            <RotateCcw aria-hidden="true" size={16} />{' '}{t("Reset")}</button>
          {h.remember && (
            <button type="button" className="btn btn-quiet" onClick={h.clearSaved}>{t("Clear saved data")}</button>
          )}
        </div>
      </div>
    </>
  )
}

/* ------------------------- Step 3: what if you invest ------------------------- */

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
    <section aria-labelledby="invest-title" className="card-soft p-5 sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="invest-title" className="text-[clamp(1.625rem,1.3rem+1.2vw,2.25rem)] leading-tight">{t("Paano kung i-invest mo ang natitira?")}</h2>
          <p className="mt-3 text-ink-2">{tx("Set aside part of what is left each month for {years} years. Projections use published rates and {inflationRate}% inflation.", { years: (years), inflationRate: (inflationRate), })}</p>
          <div className="mt-6">
            <AmountField label={t("Amount to invest each month")} value={monthly} onChange={(v) => setAmount(v)} hint={t("Up to {remaining} is left this month.", { remaining: peso(remaining) })} />
          </div>
          <button type="button" className="btn btn-ink mt-6" onClick={useInMp2} disabled={monthly <= 0}>{t("Use in the MP2 calculator")}</button>
        </div>
        <ul data-ui className="ui m-0 grid list-none content-start gap-2 p-0 lg:col-span-7">
          {rows.map((r) => (
            <li key={r.label} className="grid gap-2 rounded-[20px] bg-paper px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-6">
              <span>
                <span className="block font-semibold">{tv(r.label)}</span>
                <span className="block text-[0.875rem] text-muted">{tv(r.note)}</span>
              </span>
              <span className="tabular sm:text-right">
                <span className="block text-[1.25rem] font-semibold">{peso(r.final)}</span>
                <span className="block text-[0.8125rem] text-muted">{tx("after {years} years", { years: (years), })}</span>
              </span>
              <span className="tabular sm:text-right">
                <span className="block text-[1.25rem] font-semibold">{peso(r.real)}</span>
                <span className="block text-[0.8125rem] text-muted">{t("in today's pesos")}</span>
              </span>
            </li>
          ))}
          {rows.length > 0 && <li className="px-1 pt-1 text-[0.875rem] text-muted">{tx("You would put in {peso}. Projections, not guaranteed returns.", { peso: (peso(monthly * 12 * years)), })}</li>}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export function SalarySection({ s }: { s: ScenarioState }) {
  const h = useSalary()
  const p = h.payroll
  const b = h.budget
  const freq = h.state.salary.frequency
  const perPay = h.view === 'perPay' && freq !== 'monthly'
  const unit: Unit = perPay ? { f: (n: number) => n / PAYS_PER_MONTH[freq], label: t('Per payday ({freq})', { freq: t(FREQ_LABEL[freq]) }) } : { f: (n: number) => n, label: t('Per month') }
  const budgetOk = p.ok && b?.ok ? b.value : null
  const hasBudget = !!budgetOk && (budgetOk.expenses.gt(0) || budgetOk.savings.gt(0))

  const charts = useMemo(() => {
    if (!p.ok || !b?.ok) return null
    const bd = safe(() => salaryBreakdown(p.value.grossMonthly, p.value.governmentTotal, p.value.otherDeductions, b.value, GROUP_LABELS))
    const { segments, shortfall } = bd.ok ? bd.value : { segments: [], shortfall: new D(0) }
    return {
      donut: {
        slices: segments.map((x) => ({ key: x.key, label: x.label, value: x.amount.toNumber(), color: GROUP_COLORS[x.key as keyof typeof GROUP_COLORS] })),
        total: p.value.grossMonthly.toNumber(),
        shortfall: shortfall.toNumber(),
        centerLabel: t('Gross per month'),
        centerValue: peso(p.value.grossMonthly),
      },
      ranking: b.value.ranking.map((r) => ({ key: r.group, label: tv(GROUP_LABELS[r.group]), value: r.amount.toNumber(), color: GROUP_COLORS[r.group] })),
      compare: [
        { key: 'gross', label: 'Gross', value: p.value.grossMonthly.toNumber(), color: 'var(--color-ink-2)' },
        { key: 'take-home', label: 'Net pay', value: p.value.takeHomeMonthly.toNumber(), color: 'var(--color-s1)' },
        { key: 'spending', label: 'Expenses', value: b.value.expenses.toNumber(), color: 'var(--color-s2)' },
        { key: 'left', label: 'Left', value: b.value.remaining.toNumber(), color: b.value.remaining.lt(0) ? 'var(--color-loss)' : 'var(--color-gain)' },
      ],
    }
  }, [p, b])

  return (
    <section id="sweldo" aria-labelledby="sweldo-title">
      <ToolHeader
        path="/sweldo"
        id="sweldo-title"
        title={t("Saan napupunta ang sweldo ko?")}
        lede={t("Alamin kung magkano ang tunay na natitira sa sweldo mo. Start with your salary; add your bills only if you want to.")}
        meta={<p className="ui text-[0.875rem] text-muted">{t("Everything stays in your browser.")}</p>}
      />

      <div className="wrap grid gap-[clamp(72px,8vw,120px)]">
        {/* Step 1 */}
        {p.ok ? (
          <CalcGrid inputs={<SalaryInputs h={h} />} result={<PayResult h={h} p={p.value} unit={unit} />} />
        ) : (
          <CalcGrid
            inputs={<SalaryInputs h={h} />}
            result={
              <p role="alert" className="ui rounded-[22px] bg-loss-soft p-5 text-loss">
                {tv(p.error)}
              </p>
            }
          />
        )}

        {/* Step 2 */}
        <section aria-labelledby="budget-title">
          <Reveal className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <h2 id="budget-title" className="text-step-head lg:col-span-7">{t("Buwanang gastos")}</h2>
            <div className="lg:col-span-5">
              <p className="text-ink-2">{t("Add your monthly bills and savings to see what is left after everything. Open a category to edit it; leave anything that does not apply at ₱0.")}</p>
              <button type="button" className="btn btn-soft btn-sm mt-4" onClick={h.fillSample}>{t("Fill a sample budget")}</button>
            </div>
          </Reveal>

          <CalcGrid
            className="mt-10"
            inputs={
              <>
                <div className="grid gap-2">
                  <Group group="housing" h={h} budget={budgetOk} defaultOpen>
                    <Items group="housing" h={h} />
                  </Group>
                  <Group group="transport" h={h} budget={budgetOk}>
                    <Items group="transport" h={h} />
                    <FuelEstimator h={h} />
                  </Group>
                  <Group group="food" h={h} budget={budgetOk}>
                    <Items group="food" h={h} />
                  </Group>
                  <Group group="personal" h={h} budget={budgetOk}>
                    <Items group="personal" h={h} />
                  </Group>
                  <Group group="commitments" h={h} budget={budgetOk}>
                    <Items group="commitments" h={h} />
                  </Group>
                  <Group group="custom" h={h} budget={budgetOk}>
                    <CustomItems h={h} />
                  </Group>
                </div>
                <div className="grid gap-2">
                  <div className="px-2 pt-4">
                    <h3 className="text-[1.5rem] leading-tight">{t("Ipon at investments")}</h3>
                    <p className="ui mt-1.5 text-[0.9375rem] text-muted">{t("Money you set aside. It lowers what is left to spend, but it is not an expense.")}</p>
                  </div>
                  <Group group="savings" h={h} budget={budgetOk}>
                    <Items group="savings" h={h} />
                  </Group>
                </div>
              </>
            }
            result={
              p.ok && budgetOk ? (
                <BudgetResult h={h} p={p.value} b={budgetOk} unit={unit} empty={!hasBudget} />
              ) : (
                <p className="ui rounded-[22px] bg-loss-soft p-5 text-loss">{b && !b.ok ? b.error : t("Check the salary inputs.")}</p>
              )
            }
          />
        </section>

        {/* Optional depth */}
        <div className="grid gap-3">
          {charts && (
            <Disclosure title={t("See your sweldo as charts")} summary={hasBudget ? undefined : t("Add a budget first for the full picture")} size="lg" headingLevel={2}>
              <SalaryCharts donut={charts.donut} ranking={charts.ranking} compare={charts.compare} />
            </Disclosure>
          )}
          {p.ok && (
            <Disclosure title={t("How this is calculated")} size="lg" headingLevel={2}>
              <div className="grid max-w-[72ch] gap-3 text-[0.9375rem] leading-relaxed text-ink-2">
                <p>{tx("Contributions and tax use {issuance}; {issuance2}; {issuance22}; and {issuance222}.", { issuance: (p.value.rules.sss.issuance), issuance2: (p.value.rules.philhealth.issuance), issuance22: (p.value.rules.pagibig.issuance), issuance222: (p.value.rules.tax.issuance), })}</p>
                <p>{t("Withholding tax uses the BIR table for your pay frequency, applied to taxable pay after SSS, PhilHealth and Pag-IBIG. It is an estimate: your actual payroll can differ with your employer's practices, cut-off dates and year-end adjustment.")}</p>
                <StatusTag status={p.value.rules.philhealth.status} extra={t("PhilHealth and Pag-IBIG rates cross-checked")} />
              </div>
            </Disclosure>
          )}
        </div>

        {p.ok && budgetOk && hasBudget && <Projection remaining={budgetOk.remaining.toNumber()} s={s} />}
      </div>

      {/* Phone: keep the answer in view while editing a long list */}
      {p.ok && budgetOk && (
        <div data-sticky-bar className="ui sticky bottom-0 z-30 mt-8 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
          <div className="flex items-center justify-between gap-4 rounded-[20px] bg-night px-5 py-3.5 text-night-ink shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]">
            <span className="text-[0.9375rem] font-medium">{hasBudget ? t("Natitira") : t("Take-home")} {perPay ? t("per payday") : t("per month")}</span>
            <span className={`figure text-[1.375rem] ${hasBudget && budgetOk.remaining.lt(0) ? 'text-loss' : ''}`}>
              {(() => {
                const n = unit.f((hasBudget ? budgetOk.remaining : p.value.takeHomeMonthly).toNumber())
                return n < -0.5 ? `−${peso(Math.abs(n))}` : peso(n)
              })()}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
