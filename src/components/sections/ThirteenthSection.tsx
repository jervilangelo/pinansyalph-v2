import { AnimatePresence, useInView } from 'motion/react'
import { ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { FIRST_YEAR, calculateThirteenth, type MonthEntry, type MonthRow, type SalaryChange, type ThirteenthResult } from '../../calculators/thirteenth'
import { payrollRules } from '../../data'
import { safe } from '../../hooks/useScenario'
import { MONTH_NAMES, dateLabel, peso, pesoExact } from '../../utils/format'
import { AmountField, DateField, OptionalAmountField, SelectField, Toggle } from '../ui/fields'
import { AnimatedNumber, EASE, Reveal, motion, useReducedMotion } from '../ui/motion'

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
    <form className="mt-10 grid max-w-[34rem] gap-6" onSubmit={(e) => e.preventDefault()}>
      <AmountField
        label="Monthly basic salary"
        value={h.state.monthlyBasic}
        onChange={(v) => h.patch({ monthlyBasic: v })}
        hint="Basic pay only. Leave out allowances, overtime, night differential and holiday pay unless your company counts them as basic."
      />
      <SelectField label="Calculation year" value={String(h.state.year)} onChange={(v) => h.patch({ year: Number(v) })} options={years.map((y) => ({ value: y, label: y }))} />
      <div className="grid gap-6 sm:grid-cols-2">
        <DateField label="Employment start date" value={h.state.startDate} onChange={(v) => h.patch({ startDate: v })} />
        <div>
          <DateField label="Employment end date" optional value={h.state.endDate} onChange={(v) => h.patch({ endDate: v })} min={h.state.startDate || undefined} />
          {h.state.endDate && (
            <button type="button" className="ui mt-2 cursor-pointer border-0 bg-transparent p-0 text-[0.875rem] underline underline-offset-4" onClick={() => h.patch({ endDate: '' })}>
              Clear end date (still employed)
            </button>
          )}
        </div>
      </div>
      <p className="ui text-[0.875rem] leading-relaxed text-night-muted">Fill in the end date only if you resigned or were separated. Everything stays in your browser.</p>
    </form>
  )
}

function Stat({ label, value, note, emphasis = false, testId }: { label: string; value: ReactNode; note?: ReactNode; emphasis?: boolean; testId?: string }) {
  return (
    <div className={`flex flex-col gap-1 p-4 sm:p-5 ${emphasis ? 'bg-accent-soft' : 'bg-surface'}`}>
      <dt className="ui text-[0.875rem] leading-snug font-medium text-ink-2">{label}</dt>
      <dd className="m-0 tabular text-[1.5rem] leading-tight font-medium tracking-[-0.01em]" data-testid={testId}>
        {value}
      </dd>
      {note && <p className="ui text-[0.8125rem] leading-snug text-muted">{note}</p>}
    </div>
  )
}

function Results({ r, h }: { r: ThirteenthResult; h: ThirteenthHook }) {
  const year = h.state.year
  const deadline = r.separated ? 'when your employment ends, with your final pay' : `on or before December 24, ${year}`
  return (
    <div aria-live="polite">
      <p className="ui text-[0.9375rem] font-semibold">Estimated 13th month pay, {year}</p>
      <p className="tabular mt-2 text-[clamp(2.75rem,1.4rem+3.6vw,5.5rem)] leading-[0.95] font-medium tracking-[-0.04em]" data-testid="thirteenth-total">
        <AnimatedNumber value={r.fullYear.toNumber()} format={(n) => pesoExact(n)} />
      </p>
      <div className="ui mt-4 flex flex-wrap gap-2 text-[0.8125rem] font-semibold">
        {r.hasProjection ? (
          <span className="bg-warn-soft px-2.5 py-1 text-warn">Includes projected months</span>
        ) : (
          <span className="bg-gain-soft px-2.5 py-1 text-gain">Based on months already earned</span>
        )}
        {r.separated && <span className="bg-surface px-2.5 py-1">Separated: prorated</span>}
        {r.hasPartialEstimate && <span className="bg-surface px-2.5 py-1">Partial month estimated</span>}
      </div>
      <p className="mt-4 max-w-[52ch] text-ink-2">
        {peso(r.totalEligible)} eligible basic salary ÷ 12. Employers must pay it {deadline}.
      </p>

      <AnimatePresence initial={false}>
        {(r.belowOneMonth || r.overpaid.gt(0)) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="ui mt-5 grid gap-2 text-[0.9375rem]">
              {r.belowOneMonth && (
                <p role="status" className="bg-warn-soft p-4">
                  You worked less than one month in {year}. PD 851 covers employees who worked at least one month during the calendar year,
                  so your employer may not be required to pay it.
                </p>
              )}
              {r.overpaid.gt(0) && (
                <p role="status" className="bg-warn-soft p-4">
                  You were already paid {pesoExact(r.overpaid)} more than this estimate. Check with HR: the difference may be a bonus, not 13th month
                  pay.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <dl className="m-0 mt-8 grid gap-2 sm:grid-cols-2">
        <Stat label="Total eligible basic salary" value={<AnimatedNumber value={r.totalEligible.toNumber()} format={pesoExact} />} note={r.hasProjection ? `${pesoExact(r.totalProjected)} of this is projected` : 'All earned'} />
        <Stat label="Earned-to-date 13th month pay" value={<AnimatedNumber value={r.earnedToDate.toNumber()} format={pesoExact} />} note={`Months completed by ${dateLabel(h.today)}`} testId="earned-to-date" />
        <Stat label="Projected full-year 13th month pay" value={<AnimatedNumber value={r.fullYear.toNumber()} format={pesoExact} />} note={r.hasProjection ? 'Assumes your salary continues as entered' : 'Same as earned: nothing is projected'} />
        <Stat label="Previously paid amount" value={<AnimatedNumber value={r.previouslyPaid.toNumber()} format={pesoExact} />} note="Advances or installments already received" />
        <Stat emphasis label="Estimated remaining entitlement" value={<AnimatedNumber value={r.remaining.toNumber()} format={pesoExact} />} note="Full-year amount minus what was already paid" testId="remaining-entitlement" />
        <Stat
          label="Potentially taxable benefits"
          value={<AnimatedNumber value={r.tax.potentiallyTaxable.toNumber()} format={pesoExact} />}
          note={`Above the ${peso(r.tax.ceiling)} combined exemption`}
          testId="potentially-taxable"
        />
      </dl>
    </div>
  )
}

/* ------------------------------ Advanced ------------------------------ */

function SalaryChanges({ h }: { h: ThirteenthHook }) {
  const changes = h.state.salaryChanges
  const set = (next: SalaryChange[]) => h.patch({ salaryChanges: next })
  return (
    <div>
      <h3 className="text-[1.375rem] leading-tight">Salary increases or decreases</h3>
      <p className="ui mt-2 text-[0.9375rem] text-ink-2">The new monthly basic salary applies from the month you choose until the next change.</p>
      <ul className="m-0 mt-5 grid list-none gap-3 p-0">
        <AnimatePresence initial={false}>
          {changes.map((c, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="grid items-end gap-3 bg-paper p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <SelectField
                label="Starting"
                value={String(c.month)}
                onChange={(v) => set(changes.map((x, j) => (j === i ? { ...x, month: Number(v) } : x)))}
                options={MONTH_NAMES.map((m, k) => ({ value: String(k + 1), label: m }))}
              />
              <AmountField label="New monthly basic salary" value={c.monthly} onChange={(v) => set(changes.map((x, j) => (j === i ? { ...x, monthly: v } : x)))} />
              <button type="button" className="btn bg-surface hover:bg-surface-2" onClick={() => set(changes.filter((_, j) => j !== i))} aria-label={`Remove the salary change starting ${MONTH_NAMES[c.month - 1]}`}>
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <button type="button" className="btn btn-quiet mt-3 px-0" onClick={() => set([...changes, { month: Math.min(12, (changes.at(-1)?.month ?? 6) + 1), monthly: h.state.monthlyBasic }])}>
        <Plus aria-hidden="true" size={18} /> Add a salary change
      </button>
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
    <li className="bg-paper">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ui flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-4 py-3 text-left text-[1rem] font-medium transition-colors hover:bg-surface"
      >
        <span className="flex items-center gap-2">
          {name}
          {edited && <span className="bg-accent-soft px-2 py-0.5 text-[0.75rem] font-semibold text-accent">Edited</span>}
          {row.partial && <span className="bg-surface px-2 py-0.5 text-[0.75rem] font-semibold">Partial</span>}
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
                label={`${name}: actual eligible basic salary`}
                value={entry.actual ?? null}
                onChange={(v) => h.setMonth(i, { actual: v })}
                placeholder={`Computed: ${pesoExact(row.usesActual ? 0 : row.basic)}`}
                hint={row.partial ? `Estimated from ${row.partial.days} of ${row.partial.daysInMonth} days. Enter the figure on your payslip if you have it.` : 'Leave empty to use your monthly salary.'}
              />
              <OptionalAmountField compact label={`${name}: unpaid absences deducted`} value={entry.unpaidAbsences || null} onChange={(v) => h.setMonth(i, { unpaidAbsences: v ?? 0 })} placeholder="₱0" hint="Leave without pay, tardiness or undertime. Paid leave is not deducted." />
              <OptionalAmountField compact label={`${name}: eligible salary adjustments`} value={entry.adjustment || null} onChange={(v) => h.setMonth(i, { adjustment: v ?? 0 })} placeholder="₱0" hint="Retroactive basic pay or corrections credited for this month." />
              <OptionalAmountField
                compact
                label={`${name}: maternity salary differential`}
                value={entry.maternityDifferential || null}
                onChange={(v) => h.setMonth(i, { maternityDifferential: v ?? 0 })}
                placeholder="₱0"
                hint="The employer-paid top-up under RA 11210 counts. The SSS maternity benefit itself does not."
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
    <div className="bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="thirteenth-advanced"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-5 py-6 text-left text-ink transition-colors hover:bg-surface-2 sm:px-8"
      >
        <span>
          <span className="block text-[1.5rem] leading-tight">Advanced calculator</span>
          <span className="ui mt-1 block text-[0.9375rem] text-ink-2">Salary changes, partial months, unpaid absences, adjustments, maternity differential, earlier payments and other benefits.</span>
        </span>
        <ChevronDown aria-hidden="true" size={26} className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
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
                  <h3 className="text-[1.375rem] leading-tight">Payments and other benefits</h3>
                  <div className="mt-5 grid gap-6">
                    <AmountField label="13th month pay already received this year" value={h.state.previouslyPaid} onChange={(v) => h.patch({ previouslyPaid: v })} hint="Midyear advances or earlier installments." />
                    <AmountField
                      label="Other qualifying benefits this year"
                      value={h.state.otherBenefits}
                      onChange={(v) => h.patch({ otherBenefits: v })}
                      hint="Christmas or productivity bonuses, and de minimis benefits above their limits. Used only for the tax check."
                    />
                  </div>
                </div>
                <button type="button" className="btn btn-quiet self-start px-0" onClick={h.reset}>
                  <RotateCcw aria-hidden="true" size={16} /> Reset everything
                </button>
              </div>
              <div className="lg:col-span-7">
                <h3 className="text-[1.375rem] leading-tight">Month by month</h3>
                <p className="ui mt-2 text-[0.9375rem] text-ink-2">
                  Open a month to enter what your payslip shows. Entering an actual amount replaces the estimate for that month.
                </p>
                {r ? (
                  <ul className="m-0 mt-5 grid list-none gap-1 p-0">
                    {r.months
                      .filter((m) => m.status !== 'not-employed')
                      .map((m) => (
                        <MonthEditor key={m.month} row={m} entry={h.state.months[m.month - 1] ?? {}} h={h} />
                      ))}
                  </ul>
                ) : (
                  <p className="ui mt-5 bg-paper p-4 text-ink-2">Fix the dates above to edit months.</p>
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
    <span className={`ui inline-block px-2 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap ${tone}`}>
      {STATUS_LABEL[row.status]}
      {row.partial ? ' · partial est.' : ''}
    </span>
  )
}
const adj = (r: MonthRow) => r.adjustment.plus(r.maternityDifferential).minus(r.unpaidAbsences)

function Breakdown({ r }: { r: ThirteenthResult }) {
  return (
    <section aria-labelledby="breakdown-title" className="mt-2 bg-paper px-5 py-10 sm:px-8 lg:px-[6%] lg:py-16">
      <Reveal>
        <h2 id="breakdown-title" className="text-[clamp(1.75rem,1.2rem+1.6vw,2.5rem)] leading-[1.1]">
          Monthly breakdown
        </h2>
        <p className="ui mt-2 max-w-[60ch] text-[0.9375rem] text-ink-2">
          Actual months have already ended. Projected months assume your salary continues and are not yet earned.
        </p>
      </Reveal>
      {/* Wide screens: a table */}
      <table className="ui mt-8 hidden w-full border-collapse text-[0.9375rem] md:table">
        <caption className="sr-only">Eligible earnings by month</caption>
        <thead>
          <tr className="border-b border-surface-2 text-left text-ink-2">
            <th scope="col" className="py-3 pr-4 font-medium">Month</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Eligible basic salary</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Adjustments</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Total eligible earnings</th>
            <th scope="col" className="py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {r.months.map((m) => (
            <tr key={m.month} className={`border-b border-surface transition-colors hover:bg-ground ${m.status === 'not-employed' ? 'text-muted' : ''}`}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">{MONTH_NAMES[m.month - 1]}</th>
              <td className="py-3 pr-4 text-right">{pesoExact(m.basic)}</td>
              <td className="py-3 pr-4 text-right">{adj(m).isZero() ? '—' : pesoExact(adj(m))}</td>
              <td className="py-3 pr-4 text-right font-semibold">{pesoExact(m.total)}</td>
              <td className="py-3"><StatusBadge row={m} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-[1rem]">
            <th scope="row" className="pt-4 text-left font-semibold">Total</th>
            <td colSpan={2} />
            <td className="tabular pt-4 pr-4 text-right font-semibold">{pesoExact(r.totalEligible)}</td>
            <td className="pt-4 text-ink-2">÷ 12 = {pesoExact(r.fullYear)}</td>
          </tr>
        </tfoot>
      </table>
      {/* Phones: one card per month */}
      <ul className="ui m-0 mt-8 grid list-none gap-1 p-0 md:hidden">
        {r.months.map((m) => (
          <li key={m.month} className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 bg-ground px-4 py-3 ${m.status === 'not-employed' ? 'text-muted' : ''}`}>
            <span className="font-semibold">{MONTH_NAMES[m.month - 1]}</span>
            <span className="tabular text-right font-semibold">{pesoExact(m.total)}</span>
            <span className="text-[0.8125rem] text-ink-2">
              Basic {pesoExact(m.basic)}
              {!adj(m).isZero() && ` · adj. ${pesoExact(adj(m))}`}
            </span>
            <span className="text-right"><StatusBadge row={m} /></span>
          </li>
        ))}
        <li className="grid grid-cols-[1fr_auto] gap-x-4 bg-ink px-4 py-3 text-ground">
          <span className="font-semibold">Total ÷ 12</span>
          <span className="tabular text-right font-semibold">{pesoExact(r.fullYear)}</span>
        </li>
      </ul>
    </section>
  )
}

/* ------------------------------ Tax ------------------------------ */

function TaxCheck({ r, h }: { r: ThirteenthResult; h: ThirteenthHook }) {
  const t = r.tax
  const combined = t.combined.toNumber()
  const scale = Math.max(combined, t.ceiling) || 1
  const reduce = useReducedMotion()
  return (
    <section aria-labelledby="tax-title" className="mt-[clamp(72px,8vw,140px)]">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <h2 id="tax-title" className="text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[1.05]">
            Taxable Ba Ang 13th Month Pay Ko?
          </h2>
          <p className="mt-4 max-w-[46ch]">
            Your 13th month pay and other benefits are tax-free up to <strong className="font-semibold">{peso(t.ceiling)} combined</strong> for {h.state.year}
            {' '}(NIRC Sec. 32(B)(7)(e), as amended by the TRAIN Law). Anything above that is added to your taxable compensation and taxed at your
            regular graduated rate, not a separate flat tax.
          </p>
          <div className="mt-8 grid gap-6">
            <OptionalAmountField
              label="Your other taxable compensation this year (optional)"
              value={h.state.annualTaxable}
              onChange={(v) => h.patch({ annualTaxable: v })}
              placeholder="Not entered"
              hint="Annual basic pay and taxable allowances after SSS, PhilHealth and Pag-IBIG. Only used to estimate the extra tax."
            />
            <Toggle
              label="I am a statutory minimum wage earner"
              checked={h.state.minimumWageEarner}
              onChange={(v) => h.patch({ minimumWageEarner: v })}
              description="Your minimum wage is tax-exempt, but benefits above the ceiling are still taxable."
            />
          </div>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="bg-paper p-5 sm:p-8">
            <p className="ui text-[0.9375rem] font-semibold">13th month pay + other benefits</p>
            <p className="tabular mt-1 text-[2.25rem] leading-tight font-medium">{pesoExact(t.combined)}</p>
            <div className="relative mt-6 h-4 bg-surface" role="img" aria-label={`${pesoExact(t.exempt)} exempt and ${pesoExact(t.potentiallyTaxable)} potentially taxable, against a ${peso(t.ceiling)} ceiling`}>
              <motion.div className="absolute inset-y-0 left-0 bg-gain" initial={false} animate={{ width: `${(t.exempt.toNumber() / scale) * 100}%` }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }} />
              <motion.div
                className="absolute inset-y-0 bg-loss"
                initial={false}
                animate={{ left: `${(t.exempt.toNumber() / scale) * 100}%`, width: `${(t.potentiallyTaxable.toNumber() / scale) * 100}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }}
              />
              <span className="absolute -top-1 -bottom-1 w-[2px] bg-ink" style={{ left: `calc(${(t.ceiling / scale) * 100}% - 1px)` }} aria-hidden="true" />
            </div>
            <p className="ui mt-2 text-right text-[0.8125rem] text-ink-2">Ceiling {peso(t.ceiling)}</p>
            <dl className="ui m-0 mt-6 grid gap-x-6 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt>13th month pay</dt><dd className="tabular m-0">{pesoExact(t.thirteenth)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt>Other benefits</dt><dd className="tabular m-0">{pesoExact(t.otherBenefits)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt className="text-gain">Tax-exempt</dt><dd className="tabular m-0">{pesoExact(t.exempt)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-surface pb-2"><dt className="text-loss">Potentially taxable</dt><dd className="tabular m-0">{pesoExact(t.potentiallyTaxable)}</dd></div>
            </dl>
            <p className="mt-6 text-[1.0625rem] leading-relaxed" data-testid="tax-verdict">
              {t.potentiallyTaxable.isZero()
                ? `Hindi taxable. Your total is within the ${peso(t.ceiling)} exemption, so no tax should be withheld from it.`
                : t.estimatedAdditionalTax
                  ? `About ${pesoExact(t.estimatedAdditionalTax)} in additional income tax for the year on the ${pesoExact(t.potentiallyTaxable)} above the ceiling, using the BIR graduated table.`
                  : `${pesoExact(t.potentiallyTaxable)} is above the ceiling and becomes part of your taxable compensation. The actual tax depends on your total income for the year; enter it to estimate.`}
            </p>
            <p className="ui mt-4 text-[0.8125rem] leading-relaxed text-muted">
              An estimate, not your net payout. Employers settle the final tax through year-end adjustment, and some may withhold part of it from
              the 13th month pay itself.
            </p>
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
          className="ui fixed inset-x-3 bottom-3 z-30 flex cursor-pointer items-center justify-between gap-3 border-0 bg-ink px-5 py-3.5 text-left text-ground shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] lg:hidden"
        >
          <span className="text-[0.875rem]">Estimated 13th month pay</span>
          <span className="tabular text-[1.125rem] font-semibold">{pesoExact(r!.fullYear)}</span>
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
    <section id="thirteenth" aria-labelledby="thirteenth-title" className="px-[var(--gutter)] pt-[clamp(24px,4vw,56px)]">
      <div ref={areaRef}>
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="on-dark bg-night px-5 py-10 text-night-ink sm:px-8 lg:px-[8%] lg:py-16">
          <Reveal>
            <h1 id="thirteenth-title" className="text-step-head">
              Magkano Ang 13th Month Pay Mo?
            </h1>
            <p className="mt-4 max-w-[46ch] text-night-muted">Calculate your estimated 13th-month pay based on Philippine labor laws.</p>
          </Reveal>
          <QuickInputs h={h} />
        </div>
        <div ref={resultsRef} className="scroll-mt-24 bg-paper px-5 py-10 sm:px-8 lg:px-[8%] lg:py-16">
          {r ? (
            <Results r={r} h={h} />
          ) : (
            <p role="alert" className="ui field-error bg-loss-soft p-4 text-[1rem]">
              {!h.result.ok && h.result.error}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2">
        <Advanced h={h} r={r} />
      </div>
      {r && <Breakdown r={r} />}
      </div>
      {r && (
        <div className="wrap !px-0">
          <TaxCheck r={r} h={h} />
        </div>
      )}
      <MobileResultBar r={r} target={resultsRef} area={areaRef} />
    </section>
  )
}
