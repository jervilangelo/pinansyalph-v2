import { AnimatePresence } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useInView } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { lookupBenchmarks, verdict, type Candidate, type Lookup } from '../../calculators/salaryBenchmark'
import { inflation } from '../../data'
import salaryJson from '../../data/salary-benchmarks.json'
import { JOB_TITLES, PSA_OCCUPATIONS, searchJobTitles, type JobTitle } from '../../data/salaryOccupations'
import { safe } from '../../hooks/useScenario'
import { Link } from '../../router'
import type { SalaryBenchmarkDataset } from '../../types/salary'
import { dateLabel, monthLabel, peso } from '../../utils/format'
import { ToolHeader } from '../layout/Page'
import { Combobox, type ComboOption } from '../ui/Combobox'
import { Disclosure } from '../ui/Disclosure'
import { AmountField, Segmented, SelectField } from '../ui/fields'
import { AnimatedNumber, DUR, EASE, Reveal, motion, useReducedMotion } from '../ui/motion'
import { CalcGrid, Panel, SunMark } from '../ui/Result'
import { StatusTag } from '../ui/Status'
import { JobOfferSection } from './JobOfferSection'
import { tx } from '../../i18n/react'
import { t, tv } from '../../i18n'

export const salaryData = salaryJson as SalaryBenchmarkDataset

type Experience = 'entry' | 'mid' | 'senior'
const NOT_LISTED = 'not-listed'

const pctText = (p: number) => `${Math.abs(p).toFixed(1)}%`
const signedPeso = (n: number) => (Math.abs(n) < 0.5 ? peso(0) : `${n > 0 ? '+' : '−'}${peso(Math.abs(n))}`)

/** Prices since a survey month, from PSA's purchasing power of the peso (official series, not an estimate). */
function pricesSince(ref: string): { pct: number; latest: string } | null {
  const m = ref.match(/^([A-Za-z]+) (\d{4})$/)
  if (!m) return null
  const month = new Date(`${m[1]} 1, 2000`).getMonth() + 1
  const key = `${m[2]}-${String(month).padStart(2, '0')}`
  const pp = inflation.purchasingPower
  const then = pp.find((x) => x.period === key)
  const now = pp[pp.length - 1]
  if (!then || now.period <= key) return null
  return { pct: (then.value / now.value - 1) * 100, latest: now.period }
}

function jobOption(t: JobTitle): ComboOption {
  return {
    id: t.id,
    label: t.title,
    hint: t.benchmark ? `PSA benchmark: ${PSA_OCCUPATIONS[t.benchmark].title}` : 'No PSA occupation benchmark yet',
  }
}

/* ------------------------------------------------------------------ */

function Bars({ c }: { c: Candidate }) {
  const reduce = useReducedMotion()
  const max = Math.max(c.comparison.user, c.comparison.benchmark) * 1.04
  const rows = [
    { label: 'Your pay', value: c.comparison.user, cls: 'bg-accent' },
    { label: c.benchmark.measure === 'median' ? 'Median' : 'Average', value: c.comparison.benchmark, cls: 'bg-surface-2' },
  ]
  return (
    <div className="grid gap-3" role="img" aria-label={t("Your pay {user}; {v1} {benchmark}", { user: peso(c.comparison.user), v1: rows[1].label.toLowerCase(), benchmark: peso(c.comparison.benchmark) })}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 sm:grid-cols-[6.5rem_1fr]">
          <span className="ui text-[0.875rem] font-medium text-ink-2">{tv(r.label)}</span>
          <span className="relative block h-9 overflow-hidden rounded-[10px] bg-ground">
            <motion.span
              className={`absolute inset-y-0 left-0 block origin-left rounded-[10px] ${r.cls}`}
              initial={false}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }}
            />
            <span className={`ui absolute inset-y-0 left-3 flex items-center text-[0.875rem] font-semibold tabular ${r.cls === 'bg-accent' ? 'text-white' : 'text-ink'}`}>{peso(r.value)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function ResultPanel({ lookup, job, experience, notListed }: { lookup: Lookup; job: JobTitle | null; experience: Experience; notListed: boolean }) {
  const c = lookup.primary!
  const v = verdict(c.comparison)
  const since = pricesSince(c.survey.referencePeriod)
  const isMedian = c.benchmark.measure === 'median'
  return (
    <>
      <motion.div
        key={c.group + c.comparison.band}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } }}
        className="on-accent rounded-[28px] bg-accent p-6 text-accent-ink sm:p-8"
        aria-live="polite"
        data-testid="underpaid-result"
      >
        <p className="ui flex items-center gap-2.5 text-[0.9375rem] font-semibold text-white/90">
          <SunMark />
          {c.comparison.band === 'near' ? t("Malapit sa benchmark") : c.comparison.band === 'below' ? t("Mas mababa sa benchmark") : t("Mas mataas sa benchmark")}
        </p>
        <p className="figure mt-4 text-[clamp(2.75rem,2rem+3.4vw,4.5rem)] leading-[0.95]">
          <AnimatedNumber value={c.comparison.difference} format={signedPeso} testId="underpaid-difference" />
        </p>
        <p className="ui mt-3 text-[1.0625rem] font-semibold">{tx("{span} the {v0} {v1} of {v2}", { span: (<span data-testid="underpaid-percent">{c.comparison.band === 'near' && Math.abs(c.comparison.percent) < 0.05 ? t("Same as") : `${pctText(c.comparison.percent)} ${c.comparison.percent < 0 ? t('below') : t('above')}`}</span>), v0: (isMedian ? t('median') : t('average')), v1: (isMedian ? t("basic pay") : 'wage'), v2: (c.group.charAt(0).toLowerCase() + c.group.slice(1)), })}</p>
        <p className="ui mt-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-white/85">{tv(v.title)}</p>
      </motion.div>

      <div className="card p-5 sm:p-7">
        <Bars c={c} />
        <p className="ui mt-5 text-[0.875rem] leading-relaxed text-muted">{tx("Compared on {v0}. Source: PSA {label}, reference period {referencePeriod}. {coverage}.", { v0: (c.benchmark.basis === 'wage-rate' ? t("basic pay plus regular allowances (PSA “wage rate”)") : t("basic pay only")), label: (tv(c.survey.label)), referencePeriod: (c.survey.referencePeriod), coverage: (tv(c.survey.coverage)), })}</p>
        <div className="mt-3">
          <StatusTag status="verified" extra={t("PSA survey figure, {referencePeriod}", { referencePeriod: c.survey.referencePeriod })} />
        </div>
      </div>

      <div className="card grid gap-3 p-5 text-[0.9375rem] leading-relaxed sm:p-7">
        {!lookup.occupationCovered && (
          <p data-testid="no-occupation-benchmark">{tx("{strong} This compares you with all time-rated workers{v0}, which mixes every kind of job.{v1}", { strong: (<strong className="font-semibold">
              {notListed || !job ? t("Your job is not in PSA’s open benchmark list.") : t("PSA’s open tables have no benchmark for {title}.", { title: job.title })}
            </strong>), v0: (c.scope === 'all-region' ? t(" in your region") : c.scope === 'all-industry' ? t(" in your industry") : ''), v1: (job?.related && t(" If your work is mainly {v0} tasks, choose that job instead.", { v0: PSA_OCCUPATIONS[job.related].title.toLowerCase() })), })}</p>
        )}
        <p>{tx("{strong} PSA’s survey does not separate pay by experience, so this average mixes {v0}", { strong: (<strong className="font-semibold">{t("Experience:")}</strong>), v0: (experience === 'entry' ? t("new hires with long-time staff. Entry-level pay often starts below it.") : experience === 'senior' ? t("all levels. Senior roles often sit above it.") : t("all levels, from new hires to senior staff.")), })}</p>
        {since && since.pct > 0.5 && (
          <p>{tx("{strong} consumer prices rose about {v0}% from {referencePeriod} to {latest} (PSA purchasing power of the peso). The benchmark itself is not adjusted.", { strong: (<strong className="font-semibold">{t("Prices since then:")}</strong>), v0: (since.pct.toFixed(1)), referencePeriod: (c.survey.referencePeriod), latest: (monthLabel(since.latest)), })}</p>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

export function UnderpaidSection() {
  const d = salaryData
  const [job, setJob] = useState<ComboOption | null>(null)
  const [region, setRegion] = useState('ncr')
  const [industry, setIndustry] = useState('')
  const [industryTouched, setIndustryTouched] = useState(false)
  const [experience, setExperience] = useState<Experience>('mid')
  const [basic, setBasic] = useState(0)
  const [allowances, setAllowances] = useState(0)

  const notListed = job?.id === NOT_LISTED
  const title = job && !notListed ? JOB_TITLES.find((t) => t.id === job.id) ?? null : null
  const ready = !!job && basic > 0

  const lookup = useMemo(() => {
    if (!ready) return null
    return safe(() =>
      lookupBenchmarks(d, { occupation: title?.benchmark ?? null, region, industry: industry || null, pay: { basic, allowances } }),
    )
  }, [ready, d, title, region, industry, basic, allowances])

  function pickJob(o: ComboOption | null) {
    setJob(o)
    const t = o ? JOB_TITLES.find((x) => x.id === o.id) : null
    // Suggest the typical industry once, without overriding a visitor's own choice.
    if (t?.typicalIndustry && !industryTouched) setIndustry(t.typicalIndustry)
  }

  const s24 = d.surveys[0]
  const resultRef = useRef<HTMLDivElement>(null)
  const calcRef = useRef<HTMLDivElement>(null)
  const resultInView = useInView(resultRef, { margin: '0px 0px -35% 0px' })
  const calcInView = useInView(calcRef)
  const primary = lookup?.ok ? lookup.value.primary : null
  const others = lookup?.ok ? lookup.value.others : []

  const inputs = (
    <Panel as="form" title={t("Your job and pay")} intro={t("Four quick answers. Nothing you enter leaves your browser.")}>
      <div className="grid gap-6">
        <div>
          <Combobox
            label={t("Job title")}
            value={job}
            onChange={pickJob}
            placeholder={t("e.g. Bookkeeper, IT support")}
            search={(q) => searchJobTitles(q).map(jobOption)}
            emptyText={(q) => <>{tx("No job title matches “{q}”.", { q: (q), })}</>}
            footer={(close) => (
              <button
                type="button"
                className="w-full cursor-pointer rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left text-[0.9375rem] font-semibold text-accent hover:bg-surface"
                onClick={() => {
                  pickJob({ id: NOT_LISTED, label: 'My job is not listed' })
                  close()
                }}
              >{t("My job is not listed: compare with all workers")}</button>
            )}
          />
          <AnimatePresence initial={false} mode="wait">
            {title?.benchmark ? (
              <motion.p key="match" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="ui mt-3 rounded-[16px] bg-accent-soft px-4 py-3 text-[0.875rem] leading-snug">
                <strong className="font-semibold">{tx("Matched to PSA: {title}", { title: (tv(PSA_OCCUPATIONS[title.benchmark].title)), })}</strong> ({PSA_OCCUPATIONS[title.benchmark].psoc}).{' '}
                <span className="text-ink-2">{tv(PSA_OCCUPATIONS[title.benchmark].description)}</span>
              </motion.p>
            ) : job ? (
              <motion.p key="none" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="ui mt-3 rounded-[16px] bg-ground px-4 py-3 text-[0.875rem] leading-snug text-ink-2">{t("PSA’s open data has no occupation benchmark for this job. You will be compared with all workers in your region and industry.")}</motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid gap-6">
          <SelectField
            label={t("Where you work")}
            value={region}
            onChange={setRegion}
            options={[{ value: 'ph', label: t("Whole country (skip)") }, ...d.regions.filter((r) => r.id !== 'ph').map((r) => ({ value: r.id, label: r.id === 'ncr' ? 'NCR (Metro Manila)' : r.short }))]}
          />
          <SelectField
            label={t("Industry (optional)")}
            value={industry}
            onChange={(v) => {
              setIndustry(v)
              setIndustryTouched(true)
            }}
            options={[{ value: '', label: t("Not sure (skip)") }, ...d.industries.map((i) => ({ value: i.id, label: i.name.replace(/ except .*$/i, '') }))]}
          />
        </div>

        <Segmented<Experience>
          label={t("Experience")}
          value={experience}
          onChange={setExperience}
          options={[
            { value: 'entry', label: t("Entry / Junior") },
            { value: 'mid', label: t("Mid-level") },
            { value: 'senior', label: t("Senior") },
          ]}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <AmountField label={t("Basic monthly pay")} value={basic} onChange={setBasic} hint={t("Before SSS, PhilHealth, Pag-IBIG and tax.")} />
          <AmountField label={t("Regular monthly allowances")} value={allowances} onChange={setAllowances} hint={t("Paid every month, like rice, transport or COLA. Leave ₱0 if none.")} />
        </div>
        <p className="ui -mt-2 rounded-[16px] bg-ground px-4 py-3 text-[0.875rem] leading-relaxed text-ink-2">{tx("Use your {strong} pay, not your take-home pay. Leave out overtime, night differential, commissions, bonuses and 13th month pay: PSA leaves them out too. Only know your take-home? {link} shows the deductions.", { strong: (<strong className="font-semibold text-ink">{t("gross")}</strong>), link: (<Link className="link" to="/sweldo">{t("The Sweldo calculator")}</Link>), })}</p>
      </div>
    </Panel>
  )

  const result = !ready ? (
    <div className="card p-6 sm:p-8" data-testid="underpaid-empty">
      <p className="ui flex items-center gap-2.5 text-[0.9375rem] font-semibold text-ink-2">
        <SunMark />{t("Your comparison")}</p>
      <p className="serif mt-4 text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] leading-tight tracking-[-0.015em]">{!job ? t("Start with your job title.") : t("Now enter your basic monthly pay.")}</p>
      <p className="mt-3 max-w-[44ch] text-ink-2">{tx("You will see how your pay compares with the {referencePeriod} average from PSA’s Occupational Wages Survey, in pesos and in percent.", { referencePeriod: (s24.referencePeriod), })}</p>
    </div>
  ) : lookup && !lookup.ok ? (
    <p role="alert" className="ui rounded-[22px] bg-loss-soft p-5 text-loss">
      {tv(lookup.error)}
    </p>
  ) : lookup?.ok && lookup.value.primary ? (
    <ResultPanel lookup={lookup.value} job={tv(title)} experience={experience} notListed={notListed} />
  ) : (
    <p role="status" className="ui rounded-[22px] bg-warn-soft p-5">{t("PSA has not published a figure for this combination. Try the whole country or skip the industry.")}</p>
  )

  return (
    <section id="underpaid" aria-labelledby="underpaid-title">
      <ToolHeader
        path="/underpaid-ba-ko"
        id="underpaid-title"
        title={t("Underpaid ba ko?")}
        lede={
          <>{tx("{span} Compare your pay with official Philippine wage statistics from PSA’s Occupational Wages Survey.", { span: (<span className="font-semibold text-ink">{t("Alamin kung competitive ang sweldo mo.")}</span>), })}</>
        }
        meta={<StatusTag status="verified" extra={t("PSA OWS {referencePeriod}, retrieved {retrievedAt}", { referencePeriod: s24.referencePeriod, retrievedAt: dateLabel(d.retrievedAt) })} />}
      />

      <div className="wrap grid gap-4">
        <div ref={calcRef}>
          <CalcGrid
            inputs={inputs}
            result={
              <div ref={resultRef} className="grid scroll-mt-24 gap-4">
                {result}
              </div>
            }
          />
        </div>

        <div className="grid gap-3">
          {others.length > 0 && (
            <Disclosure title={t("Other published comparisons")} summary={`${others.length} more`} size="lg" headingLevel={2} id="other-comparisons">
              <ul className="ui m-0 grid list-none gap-2 p-0">
                {others.map((c) => (
                  <li key={c.scope} className="grid gap-2 rounded-[18px] bg-ground px-4 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                    <span>
                      <span className="block font-semibold">{tv(c.group)}</span>
                      <span className="block text-[0.8125rem] text-muted">{tx("{v0} {value} · PSA {label} · {v3}", { v0: (c.benchmark.measure === 'median' ? t("Median basic pay") : t("Average wage")), value: (peso(c.benchmark.value)), label: (tv(c.survey.label)), v3: (c.survey.coverage.toLowerCase()), })}</span>
                    </span>
                    <span className={`tabular text-[1.0625rem] font-semibold sm:text-right ${c.comparison.band === 'below' ? 'text-loss' : c.comparison.band === 'above' ? 'text-gain' : ''}`}>
                      {signedPeso(c.comparison.difference)} ({c.comparison.percent > 0 ? '+' : c.comparison.percent < 0 ? '−' : ''}
                      {pctText(c.comparison.percent)})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="ui mt-3 text-[0.8125rem] text-muted">{t("2022 figures come from an earlier survey design (20+ workers, selected industries) and are not directly comparable with 2024.")}</p>
            </Disclosure>
          )}

          <Disclosure title={t("What PSA’s figures mean")} size="lg" headingLevel={2} id="methodology">
            <div className="grid max-w-[76ch] gap-4 text-[0.9375rem] leading-relaxed text-ink-2">
              <p>
                <strong className="font-semibold text-ink">{t("Who is counted.")}</strong> {tv(d.population)}
              </p>
              <dl className="m-0 grid gap-3">
                {[
                  ['Basic pay', d.definitions.basicPay],
                  ['Allowances', d.definitions.allowance],
                  ['Wage rate', d.definitions.wageRate],
                  ['Median', d.definitions.median],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-semibold text-ink">{tv(k)}</dt>
                    <dd className="m-0">{tv(v)}</dd>
                  </div>
                ))}
              </dl>
              <p>{tx("{strong} Difference = your pay − the PSA figure. Percent = (your pay − PSA figure) ÷ PSA figure × 100. Within ±5% reads as “malapit” because survey averages are not precise to the peso. Averages are pulled up by high earners, so most workers in a group earn less than its average.", { strong: (<strong className="font-semibold text-ink">{t("How the comparison works.")}</strong>), })}</p>
              <p>{tx("{strong} PSA’s open tables have no percentiles, sample sizes or experience levels for these occupations, and no figure that combines an occupation with both a region and an industry. None of these are estimated here.", { strong: (<strong className="font-semibold text-ink">{t("What is not published.")}</strong>), })}</p>
              <ul className="m-0 grid gap-1.5 pl-5">
                {d.surveys.flatMap((s) => s.notes).map((n) => (
                  <li key={n}>{tv(n)}</li>
                ))}
              </ul>
              <div>
                <p className="font-semibold text-ink">{t("Source tables (PSA OpenSTAT)")}</p>
                <ul className="m-0 mt-2 grid gap-1.5 pl-5 text-[0.875rem]">
                  {d.tables.map((t) => (
                    <li key={t.id}>
                      {tv(t.title)} <span className="text-muted">{tx("(table {id}, updated {updated})", { id: (t.id), updated: (dateLabel(t.updated)), })}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.875rem]">{tx("Find them at {link} under Labor and Employment › Occupational Wages Survey.", { link: (<a className="link" href="https://openstat.psa.gov.ph/" target="_blank" rel="noopener noreferrer">{t("openstat.psa.gov.ph")}</a>), })}</p>
              </div>
            </div>
          </Disclosure>

          <Disclosure title={t("Before you draw conclusions")} size="lg" headingLevel={2}>
            <div className="grid max-w-[76ch] gap-3 text-[0.9375rem] leading-relaxed text-ink-2">
              <p>{tx("{strong} Earning below an average does not mean your employer breaks the law. Whether you receive at least the legal minimum wage depends on your region’s current wage order, set by the {link} and its regional boards. For a pay complaint, ask DOLE (hotline 1349).", { strong: (<strong className="font-semibold text-ink">{t("This is a market comparison, not a legal one.")}</strong>), link: (<a className="link" href="https://nwpc.dole.gov.ph/" target="_blank" rel="noopener noreferrer">{t("National Wages and Productivity Commission")}</a>), })}</p>
              <p>{t("Pay also depends on your exact responsibilities, experience, the size and type of your employer, benefits like HMO and leave, and how long ago the survey was taken. A job in a 10-person office and a job in a multinational can share a title and not much else.")}</p>
            </div>
          </Disclosure>
        </div>
      </div>

      {/* Phones: the answer sits below a long form, so keep it one tap away. */}
      <AnimatePresence>
        {primary && calcInView && !resultInView && (
          <motion.button
            type="button"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            data-floating-bar
            className="ui fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex cursor-pointer items-center justify-between gap-3 rounded-[20px] border-0 bg-night px-5 py-3.5 text-left text-night-ink shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] lg:hidden"
          >
            <span className="text-[0.875rem]">{t("See your result")}</span>
            <span className="figure text-[1.25rem]">
              {signedPeso(primary.comparison.difference)} <span className="ui text-[0.875rem] font-normal opacity-80">({primary.comparison.percent > 0 ? '+' : primary.comparison.percent < 0 ? '−' : ''}{pctText(primary.comparison.percent)})</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <JobOfferSection />

      <Reveal className="wrap mt-4">
        <p className="ui text-[0.875rem] text-muted">{tx("Want the full picture of your take-home pay? {link}", { link: (<Link className="link inline-flex items-center gap-1" to="/sweldo">{t("Open the Sweldo calculator")}{' '}<ArrowRight aria-hidden="true" size={14} />
          </Link>), })}</p>
      </Reveal>
    </section>
  )
}
