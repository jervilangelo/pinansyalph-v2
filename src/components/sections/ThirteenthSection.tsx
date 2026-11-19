/*
 * PinansyalPH (https://pinansyalph.site/)
 * Copyright (c) 2026 Jervil Angelo De Leon. All rights reserved.
 *
 * This source code is proprietary to its author. Copying,
 * reproducing, modifying, distributing, publishing or reusing it, in whole or
 * in part, without the author's prior written permission is not allowed.
 * See the LICENSE file at the root of this repository.
 */

import { AnimatePresence, useInView } from 'motion/react'
import { ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { FIRST_YEAR, calculateThirteenth, type MonthEntry, type MonthRow, type SalaryChange, type ThirteenthResult } from '../../calculators/thirteenth'
import { payrollRules } from '../../data'
import { safe } from '../../hooks/useScenario'
import { MONTH_NAMES, dateLabel, peso, pesoExact } from '../../utils/format'
import { AmountField, DateField, OptionalAmountField, SelectField, Toggle } from '../ui/fields'
import { AnimatedNumber, EASE, Reveal, motion, useReducedMotion } from '../ui/motion'
import { ToolHeader } from '../layout/Page'
import { Disclosure } from '../ui/Disclosure'
import { CalcGrid, Panel, ResultHero } from '../ui/Result'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface ThirteenthState {
  year: number
  monthlyBasic: number
  startDate: string
  endDate: string
  salaryChanges: SalaryChange[]
  months: MonthEntry[]
  previouslyPaid: number
  otherBenefits: number
  annualTaxable: number | null
  minimumWageEarner: boolean
}

export function defaultThirteenth(today = todayIso()): ThirteenthState {
  const year = Number(today.slice(0, 4))
  return {
    year,
    monthlyBasic: 25_000,
    startDate: `${year - 2}-01-15`,
    endDate: '',
    salaryChanges: [],
    months: Array.from({ length: 12 }, () => ({})),
    previouslyPaid: 0,
    otherBenefits: 0,
    annualTaxable: null,
    minimumWageEarner: false,
  }
}

export function useThirteenth() {
  const [today] = useState(todayIso)
  const [state, setState] = useState<ThirteenthState>(() => defaultThirteenth(today))
  const result = useMemo(
    () =>
      safe(() =>
        calculateThirteenth(
          {
            year: state.year,
            monthlyBasic: state.monthlyBasic,
            startDate: state.startDate,
            endDate: state.endDate || null,
            asOf: today,
            salaryChanges: state.salaryChanges,
            months: state.months,
            previouslyPaid: state.previouslyPaid,
            otherBenefits: state.otherBenefits,
            annualTaxableCompensation: state.annualTaxable,
            minimumWageEarner: state.minimumWageEarner,
          },
          payrollRules,
        ),
      ),
    [state, today],
  )
  const patch = (p: Partial<ThirteenthState>) => setState((s) => ({ ...s, ...p }))
  const setMonth = (i: number, p: Partial<MonthEntry>) => setState((s) => ({ ...s, months: s.months.map((m, j) => (j === i ? { ...m, ...p } : m)) }))
  return { state, setState, patch, setMonth, result, today, reset: () => setState(defaultThirteenth(today)) }
}
export type ThirteenthHook = ReturnType<typeof useThirteenth>

/* ------------------------------------------------------------------ */

function QuickInputs({ h }: { h: ThirteenthHook }) {
  const thisYear = Number(h.today.slice(0, 4))
  const years = Array.from({ length: thisYear + 1 - FIRST_YEAR + 1 }, (_, i) => String(FIRST_YEAR + i)).reverse()
  return (
    <Panel as="form" title={t("Your details")} intro={t("Basic salary and dates are enough. Payslip details go in the advanced calculator below.")}>
      <div className="grid gap-6">
      <AmountField
        label={t("Monthly basic salary")}
        value={h.state.monthlyBasic}
        onChange={(v) => h.patch({ monthlyBasic: v })}
        hint={t("Basic pay only. Leave out allowances, overtime, night differential and holiday pay unless your company counts them as basic.")}
      />
      <SelectField label={t("Calculation year")} value={String(h.state.year)} onChange={(v) => h.patch({ year: Number(v) })} options={years.map((y) => ({ value: y, label: y }))} />
      <div className="grid gap-6 sm:grid-cols-2">
        <DateField label={t("Employment start date")} value={h.state.startDate} onChange={(v) => h.patch({ startDate: v })} />
        <div>
          <DateField label={t("Employment end date")} optional value={h.state.endDate} onChange={(v) => h.patch({ endDate: v })} min={h.state.startDate || undefined} />
          {h.state.endDate && (
            <button type="button" className="btn btn-quiet mt-1 text-[0.875rem]" onClick={() => h.patch({ endDate: '' })}>{t("Clear end date (still employed)")}</button>
          )}
        </div>
      </div>
      <p className="ui text-[0.875rem] leading-relaxed text-muted">{t("Fill in the end date only if you resigned or were separated. Everything stays in your browser.")}</p>
      </div>
    </Panel>
  )
}

function Stat({ label, value, note, emphasis = false }: { label: string; value: ReactNode; note?: ReactNode; emphasis?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-[18px] p-4 sm:p-5 ${emphasis ? 'bg-accent-soft' : 'bg-ground'}`}>
      <dt className="ui text-[0.875rem] leading-snug font-medium text-muted">{tv(label)}</dt>
      <dd className="figure m-0 text-[1.5rem] leading-tight">
        {value}
      </dd>
      {note && <p className="ui text-[0.8125rem] leading-snug text-muted">{tv(note)}</p>}
    </div>
  )
}

function Results({ r, h }: { r: ThirteenthResult; h: ThirteenthHook }) {
  const year = h.state.year
  const deadline = r.separated ? 'when your employment ends, with your final pay' : `on or before December 24, ${year}`
  return (
    <>
      <ResultHero
        label={t("Estimated 13th month pay, {year}", { year })}
        value={r.fullYear.toNumber()}
        format={pesoExact}
        testId="thirteenth-total"
        caption={
          <>{tx("{totalEligible} eligible basic salary ÷ 12. Employers must pay it {deadline}.", { totalEligible: (peso(r.totalEligible)), deadline: (deadline), })}</>
        }
      >
        <div className="ui mt-5 flex flex-wrap gap-2 text-[0.8125rem] font-semibold">
          {r.hasProjection ? (
            <span className="rounded-full bg-white/15 px-3 py-1">{t("Includes projected months")}</span>
          ) : (
            <span className="rounded-full bg-white/15 px-3 py-1">{t("Based on months already earned")}</span>
          )}
          {r.separated && <span className="rounded-full bg-white/15 px-3 py-1">{t("Separated: prorated")}</span>}
          {r.hasPartialEstimate && <span className="rounded-full bg-white/15 px-3 py-1">{t("Partial month estimated")}</span>}
        </div>
      </ResultHero>

      <AnimatePresence initial={false}>
        {(r.belowOneMonth || r.overpaid.gt(0)) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="ui grid gap-2 text-[0.9375rem]">
              {r.belowOneMonth && (
                <p role="status" className="rounded-[18px] bg-warn-soft p-4">{tx("You worked less than one month in {year}. PD 851 covers employees who worked at least one month during the calendar year, so your employer may not be required to pay it.", { year: (year), })}</p>
              )}
              {r.overpaid.gt(0) && (
                <p role="status" className="rounded-[18px] bg-warn-soft p-4">{tx("You were already paid {overpaid} more than this estimate. Check with HR: the difference may be a bonus, not 13th month pay.", { overpaid: (pesoExact(r.overpaid)), })}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card p-3 sm:p-4">
        <dl className="m-0 grid gap-2 sm:grid-cols-2">
          <Stat label={t("Earned so far")} value={<AnimatedNumber value={r.earnedToDate.toNumber()} format={pesoExact} testId="earned-to-date" />} note={t("Months completed by {today}", { today: dateLabel(h.today) })} />
          <Stat emphasis label={t("Still to be paid")} value={<AnimatedNumber value={r.remaining.toNumber()} format={pesoExact} testId="remaining-entitlement" />} note={t("Full-year amount minus what was already paid")} />
          <Stat label={t("Total eligible basic salary")} value={<AnimatedNumber value={r.totalEligible.toNumber()} format={pesoExact} />} note={r.hasProjection ? t("{totalProjected} of this is projected", { totalProjected: pesoExact(r.totalProjected) }) : t("All earned")} />
          <Stat label={t("Already paid")} value={<AnimatedNumber value={r.previouslyPaid.toNumber()} format={pesoExact} />} note={t("Advances or installments received")} />
          <Stat
            label={t("Potentially taxable benefits")}
            value={<AnimatedNumber value={r.tax.potentiallyTaxable.toNumber()} format={pesoExact} testId="potentially-taxable" />}
            note={t("Above the {ceiling} combined exemption", { ceiling: peso(r.tax.ceiling) })}
          />
          <Stat label={t("Projected full year")} value={<AnimatedNumber value={r.fullYear.toNumber()} format={pesoExact} />} note={r.hasProjection ? t("Assumes your salary continues as entered") : t("Same as earned: nothing is projected")} />
        </dl>
      </div>
    </>
  )
}

/* ------------------------------ Advanced ------------------------------ */

function SalaryChanges({ h }: { h: ThirteenthHook }) {
  const changes = h.state.salaryChanges
  const set = (next: SalaryChange[]) => h.patch({ salaryChanges: next })
  return (
    <div>
      <h3 className="text-[1.375rem] leading-tight">{t("Salary increases or decreases")}</h3>
      <p className="ui mt-2 text-[0.9375rem] text-ink-2">{t("The new monthly basic salary applies from the month you choose until the next change.")}</p>
      <ul className="m-0 mt-5 grid list-none gap-3 p-0">
        <AnimatePresence initial={false}>
          {changes.map((c, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="tile grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <SelectField
                label={t("Starting")}
                value={String(c.month)}
                onChange={(v) => set(changes.map((x, j) => (j === i ? { ...x, month: Number(v) } : x)))}
                options={MONTH_NAMES.map((m, k) => ({ value: String(k + 1), label: m }))}
              />
              <AmountField label={t("New monthly basic salary")} value={c.monthly} onChange={(v) => set(changes.map((x, j) => (j === i ? { ...x, monthly: v } : x)))} />
              <button type="button" className="btn btn-paper h-[52px]" onClick={() => set(changes.filter((_, j) => j !== i))} aria-label={t("Remove the salary change starting {v0}", { v0: MONTH_NAMES[c.month - 1] })}>
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <button type="button" className="btn btn-quiet mt-3 px-0" onClick={() => set([...changes, { month: Math.min(12, (changes.at(-1)?.month ?? 6) + 1), monthly: h.state.monthlyBasic }])}>
        <Plus aria-hidden="true" size={18} />{' '}{t("Add a salary change")}</button>
    </div>
  )
}

function MonthEditor({ row, entry, h }: { row: MonthRow; entry: MonthEntry; h: ThirteenthHook }) {
  const [open, setOpen] = useState(false)
  const i = row.month - 1
  const name = MONTH_NAMES[i]
  const edited = entry.actual != null || !!entry.unpaidAbsences || !!entry.adjustment || !!entry.maternityDifferential
  const reduce = useReducedMotion()
  return (
    <li className="rounded-[18px] bg-ground">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ui flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-[18px] border-0 bg-transparent px-4 py-3 text-left text-[1rem] font-medium transition-colors hover:bg-surface"
      >
        <span className="flex items-center gap-2">
          {name}
          {edited && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.75rem] font-semibold text-accent">{t("Edited")}</span>}
          {row.partial && <span className="rounded-full bg-surface px-2.5 py-0.5 text-[0.75rem] font-semibold">{t("Partial")}</span>}
        </span>
        <span className="flex items-center gap-3">
          <span className="tabular text-ink-2">{pesoExact(row.total)}</span>
          <ChevronDown aria-hidden="true" size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 px-4 pt-1 pb-5 sm:grid-cols-2">
              <OptionalAmountField
                compact
                label={t("{name}: actual eligible basic salary", { name })}
                value={entry.actual ?? null}
                onChange={(v) => h.setMonth(i, { actual: v })}
                placeholder={t("Computed: {v0}", { v0: pesoExact(row.usesActual ? 0 : row.basic) })}
                hint={row.partial ? t("Estimated from {days} of {daysInMonth} days. Enter the figure on your payslip if you have it.", { days: row.partial.days, daysInMonth: row.partial.daysInMonth }) : t("Leave empty to use your monthly salary.")}
              />
              <OptionalAmountField compact label={t("{name}: unpaid absences deducted", { name })} value={entry.unpaidAbsences || null} onChange={(v) => h.setMonth(i, { unpaidAbsences: v ?? 0 })} placeholder="₱0" hint={t("Leave without pay, tardiness or undertime. Paid leave is not deducted.")} />
              <OptionalAmountField compact label={t("{name}: eligible salary adjustments", { name })} value={entry.adjustment || null} onChange={(v) => h.setMonth(i, { adjustment: v ?? 0 })} placeholder="₱0" hint={t("Retroactive basic pay or corrections credited for this month.")} />
              <OptionalAmountField
                compact
                label={t("{name}: maternity salary differential", { name })}
                value={entry.maternityDifferential || null}
                onChange={(v) => h.setMonth(i, { maternityDifferential: v ?? 0 })}
                placeholder="₱0"
                hint={t("The employer-paid top-up under RA 11210 counts. The SSS maternity benefit itself does not.")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Advanced({ h, r }: { h: ThirteenthHook; r: ThirteenthResult | null }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  return (
    <div className="card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="thirteenth-advanced"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-[28px] border-0 bg-transparent px-5 py-6 text-left text-ink transition-colors hover:bg-ink/[0.035] sm:px-8"
      >
        <span>
          <span className="serif block text-[1.5rem] leading-tight tracking-[-0.015em]">{t("Advanced calculator")}</span>
          <span className="ui mt-1 block text-[0.9375rem] text-muted">{t("Salary changes, partial months, unpaid absences, adjustments, maternity differential, earlier payments and other benefits.")}</span>
        </span>
        <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${open ? 'bg-ink text-ground' : 'bg-surface group-hover:bg-surface-2'}`}>
          <ChevronDown size={20} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="thirteenth-advanced"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="grid gap-12 px-5 pt-2 pb-10 sm:px-8 lg:grid-cols-12">
              <div className="grid content-start gap-10 lg:col-span-5">
                <SalaryChanges h={h} />
                <div>
                  <h3 className="text-[1.375rem] leading-tight">{t("Payments and other benefits")}</h3>
                  <div className="mt-5 grid gap-6">
                    <AmountField label={t("13th month pay already received this year")} value={h.state.previouslyPaid} onChange={(v) => h.patch({ previouslyPaid: v })} hint={t("Midyear advances or earlier installments.")} />
                    <AmountField
                      label={t("Other qualifying benefits this year")}
                      value={h.state.otherBenefits}
                      onChange={(v) => h.patch({ otherBenefits: v })}
                      hint={t("Christmas or productivity bonuses, and de minimis benefits above their limits. Used only for the tax check.")}
                    />
                  </div>
                </div>
                <button type="button" className="btn btn-quiet self-start px-0" onClick={h.reset}>
                  <RotateCcw aria-hidden="true" size={16} />{' '}{t("Reset everything")}</button>
              </div>
              <div className="lg:col-span-7">
                <h3 className="text-[1.375rem] leading-tight">{t("Month by month")}</h3>
                <p className="ui mt-2 text-[0.9375rem] text-muted">{t("Open a month to enter what your payslip shows. Entering an actual amount replaces the estimate for that month.")}</p>
                {r ? (
                  <ul className="m-0 mt-5 grid list-none gap-1 p-0">
                    {r.months
                      .filter((m) => m.status !== 'not-employed')
                      .map((m) => (
                        <MonthEditor key={m.month} row={m} entry={h.state.months[m.month - 1] ?? {}} h={h} />
                      ))}
                  </ul>
                ) : (
                  <p className="ui tile mt-5 p-4 text-ink-2">{t("Fix the dates above to edit months.")}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------ Breakdown ------------------------------ */

const STATUS_LABEL = { actual: 'Actual', projected: 'Projected', 'not-employed': 'Not employed' } as const
function StatusBadge({ row }: { row: MonthRow }) {
  const tone = row.status === 'actual' ? 'bg-gain-soft text-gain' : row.status === 'projected' ? 'bg-warn-soft text-warn' : 'bg-surface text-muted'
  return (
    <span className={`ui inline-block rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap ${tone}`}>
      {STATUS_LABEL[row.status]}
      {row.partial ? t(" · partial est.") : ''}
    </span>
  )
}
const adj = (r: MonthRow) => r.adjustment.plus(r.maternityDifferential).minus(r.unpaidAbsences)

function Breakdown({ r }: { r: ThirteenthResult }) {
  return (
    <Disclosure size="lg" headingLevel={2} title={<span id="breakdown-title">{t("Monthly breakdown")}</span>} summary={t("Total ÷ 12 = {fullYear}", { fullYear: pesoExact(r.fullYear) })}>
        <p className="ui max-w-[60ch] text-[0.9375rem] text-muted">{t("Actual months have already ended. Projected months assume your salary continues and are not yet earned.")}</p>
      {/* Wide screens: a table */}
      <table className="data-table ui mt-6 hidden md:table">
        <caption className="sr-only">{t("Eligible earnings by month")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("Month")}</th>
            <th scope="col" className="!text-right">{t("Eligible basic salary")}</th>
            <th scope="col" className="!text-right">{t("Adjustments")}</th>
            <th scope="col" className="!text-right">{t("Total eligible earnings")}</th>
            <th scope="col">{t("Status")}</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {r.months.map((m) => (
            <tr key={m.month} className={m.status === 'not-employed' ? 'text-muted' : ''}>
              <th scope="row" className="font-medium">{MONTH_NAMES[m.month - 1]}</th>
              <td className="!text-right">{pesoExact(m.basic)}</td>
              <td className="!text-right">{adj(m).isZero() ? '—' : pesoExact(adj(m))}</td>
              <td className="!text-right font-semibold">{pesoExact(m.total)}</td>
              <td><StatusBadge row={m} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-[1rem]">
            <th scope="row" className="pt-4 text-left font-semibold">{t("Total")}</th>
            <td colSpan={2} />
            <td className="tabular pt-4 pr-4 text-right font-semibold">{pesoExact(r.totalEligible)}</td>
            <td className="pt-4 text-ink-2">÷ 12 = {pesoExact(r.fullYear)}</td>
          </tr>
        </tfoot>
      </table>
      {/* Phones: one card per month */}
      <ul className="ui m-0 mt-6 grid list-none gap-1.5 p-0 md:hidden">
        {r.months.map((m) => (
          <li key={m.month} className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-[16px] bg-ground px-4 py-3 ${m.status === 'not-employed' ? 'text-muted' : ''}`}>
            <span className="font-semibold">{MONTH_NAMES[m.month - 1]}</span>
            <span className="tabular text-right font-semibold">{pesoExact(m.total)}</span>
            <span className="text-[0.8125rem] text-ink-2">{tx("Basic {basic}{v1}", { basic: (pesoExact(m.basic)), v1: (!adj(m).isZero() && t(" · adj. {v0}", { v0: pesoExact(adj(m)) })), })}</span>
            <span className="text-right"><StatusBadge row={m} /></span>
          </li>
        ))}
        <li className="grid grid-cols-[1fr_auto] gap-x-4 rounded-[16px] bg-night px-4 py-3 text-night-ink">
          <span className="font-semibold">{t("Total ÷ 12")}</span>
          <span className="tabular text-right font-semibold">{pesoExact(r.fullYear)}</span>
        </li>
      </ul>
    </Disclosure>
  )
}

/* ------------------------------ Tax ------------------------------ */

function TaxCheck({ r, h }: { r: ThirteenthResult; h: ThirteenthHook }) {
  const tax = r.tax
  const combined = tax.combined.toNumber()
  const scale = Math.max(combined, tax.ceiling) || 1
  const reduce = useReducedMotion()
  return (
    <section aria-labelledby="tax-title" className="mt-[clamp(80px,9vw,140px)]">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 id="tax-title" className="text-[clamp(2rem,1.5rem+1.6vw,3rem)] leading-[1.05]">{t("Taxable Ba Ang 13th Month Pay Ko?")}</h2>
          <p className="mt-4 max-w-[46ch]">{tx("Your 13th month pay and other benefits are tax-free up to {strong} for {year} (NIRC Sec. 32(B)(7)(e), as amended by the TRAIN Law). Anything above that is added to your taxable compensation and taxed at your regular graduated rate, not a separate flat tax.", { strong: (<strong className="font-semibold">{tx("{ceiling} combined", { ceiling: (peso(tax.ceiling)), })}</strong>), year: (h.state.year), })}</p>
          <div className="mt-8 grid gap-6">
            <OptionalAmountField
              label={t("Your other taxable compensation this year (optional)")}
              value={h.state.annualTaxable}
              onChange={(v) => h.patch({ annualTaxable: v })}
              placeholder={t("Not entered")}
              hint={t("Annual basic pay and taxable allowances after SSS, PhilHealth and Pag-IBIG. Only used to estimate the extra tax.")}
            />
            <Toggle
              label={t("I am a statutory minimum wage earner")}
              checked={h.state.minimumWageEarner}
              onChange={(v) => h.patch({ minimumWageEarner: v })}
              description={t("Your minimum wage is tax-exempt, but benefits above the ceiling are still taxable.")}
            />
          </div>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="card p-5 sm:p-8">
            <p className="ui text-[0.9375rem] font-semibold">{t("13th month pay + other benefits")}</p>
            <p className="figure mt-2 text-[2.5rem] leading-tight">{pesoExact(tax.combined)}</p>
            <div className="relative mt-6 h-4 rounded-full bg-surface" role="img" aria-label={t("{exempt} exempt and {potentiallyTaxable} potentially taxable, against a {ceiling} ceiling", { exempt: pesoExact(tax.exempt), potentiallyTaxable: pesoExact(tax.potentiallyTaxable), ceiling: peso(tax.ceiling) })}>
              <motion.div className="absolute inset-y-0 left-0 rounded-l-full bg-gain" initial={false} animate={{ width: `${(tax.exempt.toNumber() / scale) * 100}%` }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }} />
              <motion.div
                className="absolute inset-y-0 bg-loss"
                initial={false}
                animate={{ left: `${(tax.exempt.toNumber() / scale) * 100}%`, width: `${(tax.potentiallyTaxable.toNumber() / scale) * 100}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }}
              />
              <span className="absolute -top-1 -bottom-1 w-[2px] bg-ink" style={{ left: `calc(${(tax.ceiling / scale) * 100}% - 1px)` }} aria-hidden="true" />
            </div>
            <p className="ui mt-2 text-right text-[0.8125rem] text-ink-2">{tx("Ceiling {ceiling}", { ceiling: (peso(tax.ceiling)), })}</p>
            <dl className="ui m-0 mt-6 grid gap-x-6 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt>{t("13th month pay")}</dt><dd className="tabular m-0">{pesoExact(tax.thirteenth)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt>{t("Other benefits")}</dt><dd className="tabular m-0">{pesoExact(tax.otherBenefits)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt className="text-gain">{t("Tax-exempt")}</dt><dd className="tabular m-0">{pesoExact(tax.exempt)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt className="text-loss">{t("Potentially taxable")}</dt><dd className="tabular m-0">{pesoExact(tax.potentiallyTaxable)}</dd></div>
            </dl>
            <p className="mt-6 text-[1.0625rem] leading-relaxed" data-testid="tax-verdict">
              {tax.potentiallyTaxable.isZero()
                ? t("Hindi taxable. Your total is within the {ceiling} exemption, so no tax should be withheld from it.", { ceiling: peso(tax.ceiling) })
                : tax.estimatedAdditionalTax
                  ? t("About {estimatedAdditionalTax} in additional income tax for the year on the {potentiallyTaxable} above the ceiling, using the BIR graduated table.", { estimatedAdditionalTax: pesoExact(tax.estimatedAdditionalTax), potentiallyTaxable: pesoExact(tax.potentiallyTaxable) })
                  : t("{potentiallyTaxable} is above the ceiling and becomes part of your taxable compensation. The actual tax depends on your total income for the year; enter it to estimate.", { potentiallyTaxable: pesoExact(tax.potentiallyTaxable) })}
            </p>
            <p className="ui mt-4 text-[0.8125rem] leading-relaxed text-muted">{t("An estimate, not your net payout. Employers settle the final tax through year-end adjustment, and some may withhold part of it from the 13th month pay itself.")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------ Section ------------------------------ */

/** Phones: a slim bar with the result, until the result card scrolls into view. */
function MobileResultBar({ r, target, area }: { r: ThirteenthResult | null; target: RefObject<HTMLDivElement | null>; area: RefObject<HTMLDivElement | null> }) {
  const resultVisible = useInView(target, { margin: '0px 0px -30% 0px' })
  // Only while the calculator itself is on screen, so it never covers the footer.
  const inCalculator = useInView(area)
  const show = !!r && inCalculator && !resultVisible
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          onClick={() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="ui fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex cursor-pointer items-center justify-between gap-3 rounded-[20px] border-0 bg-night px-5 py-3.5 text-left text-night-ink shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] lg:hidden"
        >
          <span className="text-[0.875rem]">{t("Estimated 13th month pay")}</span>
          <span className="figure text-[1.25rem]">{pesoExact(r!.fullYear)}</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export function ThirteenthSection({ h }: { h: ThirteenthHook }) {
  const resultsRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const r = h.result.ok ? h.result.value : null
  return (
    <section id="thirteenth" aria-labelledby="thirteenth-title">
      <ToolHeader
        path="/13th-month"
        id="thirteenth-title"
        title={t("Magkano Ang 13th Month Pay Mo?")}
        lede={t("Calculate your estimated 13th-month pay based on Philippine labor laws.")}
        meta={<p className="ui text-[0.875rem] text-muted">{t("Under PD 851, prorated for new hires and resignations, with the ₱90,000 tax check.")}</p>}
      />
      <div className="wrap">
        <div ref={areaRef} className="grid gap-4">
          <CalcGrid
            inputs={<QuickInputs h={h} />}
            result={
              <div ref={resultsRef} className="grid scroll-mt-24 gap-4">
                {r ? (
                  <Results r={r} h={h} />
                ) : (
                  <p role="alert" className="ui field-error rounded-[22px] bg-loss-soft p-5 text-[1rem]">
                    {!h.result.ok && h.result.error}
                  </p>
                )}
              </div>
            }
          />
          <Advanced h={h} r={r} />
          {r && <Breakdown r={r} />}
        </div>
        {r && <TaxCheck r={r} h={h} />}
      </div>
      <MobileResultBar r={r} target={resultsRef} area={areaRef} />
    </section>
  )
}
