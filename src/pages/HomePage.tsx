import { ArrowRight, ArrowUpRight, Heart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calculatePayroll } from '../calculators/payroll'
import { AnimatedSymbol } from '../components/brand/Logo'
import { ToolMark } from '../components/brand/ToolMark'
import { Page } from '../components/layout/Page'
import { useSupport } from '../components/support/Support'
import { AmountField } from '../components/ui/fields'
import { AnimatedNumber, Reveal, SplitWords, motion, useEnter } from '../components/ui/motion'
import { SunMark } from '../components/ui/Result'
import { StatusTag } from '../components/ui/Status'
import { basePurchasingPowerYear, fuel, inflation, latestFuel, latestHeadline, latestMp2, latestPurchasingPower, payrollRules, savingsBaseRange } from '../data'
import { safe } from '../hooks/useScenario'
import { GROUPS, Link, TOOLS } from '../router'
import { TAGLINE } from '../site'
import { useSplashGone } from '../splash'
import { dateLabel, monthLabel, peso, perLiter } from '../utils/format'

const BASE = import.meta.env.BASE_URL

/* ------------------------------------------------------------------ */
/* The live thing: type a salary, see the take-home pay.               */
/* ------------------------------------------------------------------ */

function QuickPay() {
  const [basic, setBasic] = useState(30000)
  const r = useMemo(
    () =>
      safe(() =>
        calculatePayroll(
          { basic, taxableAllowances: 0, otherTaxable: 0, nonTaxableAllowances: 0, overtime: 0, frequency: 'semiMonthly', minimumWageEarner: false, otherDeductions: 0, annualBonus: 0 },
          payrollRules,
        ),
      ),
    [basic],
  )
  const rows = r.ok
    ? [
        { label: 'SSS', value: r.value.sss.employee.toNumber(), color: '#7d9cc4' },
        { label: 'PhilHealth', value: r.value.philhealth.toNumber(), color: '#a9c0dd' },
        { label: 'Pag-IBIG', value: r.value.pagibig.toNumber(), color: '#cfdcec' },
        { label: 'Withholding tax', value: r.value.withholdingMonthly.toNumber(), color: '#EDA100' },
      ]
    : []
  const gross = r.ok ? r.value.grossMonthly.toNumber() : 0
  const take = r.ok ? r.value.takeHomeMonthly.toNumber() : 0

  return (
    <section aria-labelledby="quick-title" className="card p-5 sm:p-8">
      <h2 id="quick-title" className="text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] leading-tight">
        Magkano ang matatanggap mo?
      </h2>
      <p className="ui mt-1.5 text-[0.9375rem] text-muted">Type your monthly basic salary. The answer updates as you type.</p>
      <form className="mt-6" onSubmit={(e) => e.preventDefault()}>
        <AmountField label="Monthly basic salary" value={basic} onChange={setBasic} />
      </form>

      {r.ok ? (
        <div className="mt-6" aria-live="polite">
          <div className="rounded-[22px] bg-accent p-5 text-accent-ink sm:p-6">
            <p className="ui flex items-center gap-2.5 text-[0.9375rem] font-semibold text-white/90">
              <SunMark />
              Estimated take-home pay
            </p>
            <p className="figure mt-3 text-[clamp(2.5rem,1.8rem+3vw,3.75rem)] leading-none">
              <AnimatedNumber value={take} format={peso} testId="quick-take-home" />
            </p>
            <p className="ui mt-2 text-[0.9375rem] text-white/85">a month, after government deductions</p>
          </div>

          {gross > 0 && (
            <div className="mt-5">
              <div
                className="flex h-2.5 overflow-hidden rounded-full bg-surface"
                role="img"
                aria-label={`Of ${peso(gross)} gross: ${peso(take)} take-home, ${rows.map((x) => `${peso(x.value)} ${x.label}`).join(', ')}`}
              >
                <motion.span className="h-full bg-accent" animate={{ width: `${(take / gross) * 100}%` }} transition={{ duration: 0.5 }} />
                {rows.map((x) => (
                  <motion.span key={x.label} className="h-full" style={{ background: x.color }} animate={{ width: `${(x.value / gross) * 100}%` }} transition={{ duration: 0.5 }} />
                ))}
              </div>
              <dl className="ui m-0 mt-4 grid gap-x-6 gap-y-2.5 text-[0.9375rem] min-[420px]:grid-cols-2">
                {rows.map((x) => (
                  <div key={x.label} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-ink-2">
                      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
                      {x.label}
                    </dt>
                    <dd className="tabular m-0 font-semibold">{peso(x.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="ui text-[0.8125rem] leading-snug text-muted">Rank-and-file employee, no allowances. An estimate using current official tables.</p>
            <Link to={`/sweldo?basic=${basic}`} className="btn btn-soft btn-sm group shrink-0">
              Full breakdown
              <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      ) : (
        <p role="alert" className="ui mt-6 rounded-[16px] bg-loss-soft p-4 text-loss">
          {r.error}
        </p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Hero({ ready }: { ready: boolean }) {
  const enter = useEnter()
  return (
    <header className="wrap grid items-center gap-10 pt-8 pb-4 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:pt-16">
      {/* Keyed so the entrance replays once the splash has gone; the estimator keeps its state. */}
      <div key={ready ? 'shown' : 'covered'} className="lg:col-span-7">
        <AnimatedSymbol size={88} className="-ml-2 h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]" />
        <h1 className="mt-5 max-w-[13ch] text-[clamp(2.75rem,1.5rem+4.6vw,5.5rem)] leading-[0.98] tracking-[-0.035em]">
          <SplitWords text={TAGLINE} delay={0.55} />
        </h1>
        <motion.p {...enter(0.85)} className="mt-6 max-w-[34ch] text-step-lead leading-snug text-ink-2">
          Free calculators for your sweldo, ipon, and the prices you pay, built on official Philippine data.
        </motion.p>
        <motion.div {...enter(0.95)} className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/sweldo" className="btn btn-primary group">
            Compute my take-home pay
            <ArrowRight aria-hidden="true" size={18} className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
          </Link>
          <a href="#tools" className="btn btn-soft">
            See all tools
          </a>
        </motion.div>
        <motion.p {...enter(1.05)} className="ui mt-6 text-[0.875rem] text-muted">
          Walang sign-up. Your numbers stay on your device.
        </motion.p>
      </div>
      <motion.div {...enter(0.4)} className="lg:col-span-5">
        <QuickPay />
      </motion.div>
    </header>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The tool index: an editorial table of contents, not a grid of cards. Each
 * group is a column label in large serif; its tools are numbered rows on
 * hairline rules, with the tool's own mark and, where the homepage already has
 * it, the latest official figure the tool is built on.
 */
function toolFigure(path: string): { value: string; label: string } | null {
  if (path === '/inflation') return { value: `${latestHeadline.value.toFixed(1)}%`, label: monthLabel(latestHeadline.period, true) }
  if (path === '/mp2') return { value: `${latestMp2.rate.toFixed(2)}%`, label: `${latestMp2.year} dividend` }
  if (path === '/gas') return { value: perLiter(latestFuel.diesel.min, latestFuel.diesel.max), label: 'diesel change this week' }
  if (path === '/banks') return { value: `${savingsBaseRange.min}–${savingsBaseRange.max}%`, label: 'base rates' }
  return null
}

function Tools() {
  let n = 0
  return (
    <section id="tools" aria-labelledby="tools-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <h2 id="tools-title" className="text-step-head max-w-[16ch]">
            Ano ang gusto mong malaman?
          </h2>
          <p className="mt-4 max-w-[46ch] text-step-lead leading-snug text-ink-2">
            {TOOLS.length} tools for your sahod, ipon, the prices you pay and where your money goes. Each opens with the answer, then shows its working.
          </p>
        </div>
        <nav aria-label="Tool categories" className="lg:col-span-5">
          <ul className="ui m-0 flex list-none flex-wrap gap-x-1 gap-y-2 p-0 lg:justify-end">
            {GROUPS.map((g) => (
              <li key={g.id}>
                <a
                  href={`#group-${g.id}`}
                  className="group flex items-baseline gap-1.5 rounded-full px-3 py-2 text-[0.9375rem] font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-accent"
                >
                  {g.label}
                  <span className="tabular text-[0.75rem] font-medium text-muted">{TOOLS.filter((t) => t.group === g.id).length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Reveal>

      <div className="mt-[clamp(48px,6vw,88px)] border-t-2 border-ink">
        {GROUPS.map((g) => {
          const tools = TOOLS.filter((t) => t.group === g.id)
          return (
            <div key={g.id} id={`group-${g.id}`} className="scroll-mt-24 border-b border-line">
              <Reveal className="grid gap-x-10 py-8 sm:py-10 lg:grid-cols-12">
                <div className="mb-4 lg:col-span-3 lg:mb-0">
                  <h3 className="text-[clamp(2.25rem,1.6rem+2.2vw,3.5rem)] leading-[0.95] tracking-[-0.03em]">{g.label}</h3>
                  <p className="ui mt-2 text-[0.875rem] font-semibold tracking-[0.08em] text-accent uppercase">{g.gloss}</p>
                  <p className="ui mt-1 max-w-[24ch] text-[0.9375rem] text-muted">{g.question}</p>
                </div>
                <ol className="m-0 list-none p-0 lg:col-span-9">
                  {tools.map((t) => {
                    n += 1
                    const fig = toolFigure(t.path)
                    return (
                      <li key={t.path} className="border-t border-line first:border-t-0 lg:first:border-t-0">
                        <Link
                          to={t.path}
                          className="tool-row group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-4 sm:grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:py-5"
                        >
                          <span aria-hidden="true" className="figure hidden text-[0.9375rem] text-muted tabular-nums transition-colors group-hover:text-accent sm:block">
                            {String(n).padStart(2, '0')}
                          </span>
                          <ToolMark path={t.path} size={44} className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:scale-105" />
                          <span className="min-w-0">
                            <span className="serif block text-[clamp(1.25rem,1.05rem+0.8vw,1.75rem)] leading-tight tracking-[-0.015em] transition-colors group-hover:text-accent">{t.name}</span>
                            <span className="ui mt-1 block text-[0.9375rem] leading-snug text-muted">{t.blurb}</span>
                            {fig && (
                              <span className="ui mt-2 flex items-baseline gap-2 text-[0.875rem] md:hidden">
                                <span className="tabular font-semibold text-ink">{fig.value}</span>
                                <span className="text-muted">{fig.label}</span>
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-5">
                            {fig && (
                              <span className="hidden text-right md:block">
                                <span className="figure block text-[1.375rem] leading-none whitespace-nowrap">{fig.value}</span>
                                <span className="ui mt-1 block text-[0.75rem] text-muted">{fig.label}</span>
                              </span>
                            )}
                            <span className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1 group-hover:bg-accent group-hover:text-white">
                              <ArrowRight aria-hidden="true" size={18} />
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </Reveal>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Numbers() {
  const centavos = Math.round(latestPurchasingPower.value * 100)
  const diesel = latestFuel.diesel
  const tiles = [
    {
      to: '/inflation',
      label: 'Inflation',
      value: <AnimatedNumber value={latestHeadline.value} format={(n) => `${n.toFixed(1)}%`} />,
      body: `Prices in ${monthLabel(latestHeadline.period)} were ${latestHeadline.value.toFixed(1)}% higher than a year earlier.`,
      source: `PSA · retrieved ${dateLabel(inflation.retrievedAt)}`,
      status: <StatusTag status={inflation.status} />,
    },
    {
      to: '/mp2',
      label: 'MP2 dividend',
      value: <AnimatedNumber value={latestMp2.rate} format={(n) => `${n.toFixed(2)}%`} />,
      body: `Declared by Pag-IBIG for ${latestMp2.year}. Rates are set yearly and not guaranteed.`,
      source: latestMp2.declaredOn ? `Pag-IBIG Fund · announced ${dateLabel(latestMp2.declaredOn)}` : 'Pag-IBIG Fund',
      status: <StatusTag status="historical" />,
    },
    {
      to: '/gas',
      label: 'Diesel this week',
      value: perLiter(diesel.min, diesel.max),
      body: `DOE adjustment effective ${dateLabel(latestFuel.effectiveDate)}, per liter, across oil companies.`,
      source: `DOE Oil Monitor · retrieved ${dateLabel(fuel.retrievedAt)}`,
      status: <StatusTag status={fuel.status} />,
    },
    {
      to: '/inflation',
      label: `Your ₱1 from ${basePurchasingPowerYear}`,
      value: <AnimatedNumber value={centavos} format={(n) => `${Math.round(n)}¢`} />,
      body: `is what it buys today, by PSA’s purchasing power of the peso (${monthLabel(latestPurchasingPower.period)}).`,
      source: `PSA · ${basePurchasingPowerYear} = ₱1.00`,
      status: <StatusTag status={inflation.status} />,
    },
  ]
  return (
    <section aria-labelledby="numbers-title" className="wrap mt-[clamp(96px,11vw,170px)]">
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="flex flex-col lg:col-span-5">
          <h2 id="numbers-title" className="text-step-head">
            Latest official numbers
          </h2>
          <p className="mt-4 max-w-[40ch] text-ink-2">
            Published figures from PSA, DOE and Pag-IBIG, each with its date. They refresh automatically when the agencies release new data, and are never estimated.
          </p>
          <figure className="relative m-0 mt-8 min-h-[260px] flex-1 overflow-hidden rounded-[28px] bg-surface-2">
            <img
              src={`${BASE}images/jeepney-1400.webp`}
              srcSet={`${BASE}images/jeepney-800.webp 800w, ${BASE}images/jeepney-1400.webp 1400w`}
              sizes="(min-width: 1024px) 40vw, 100vw"
              width={1400}
              height={1050}
              loading="lazy"
              alt="A jeepney turning at a sunny Manila street corner under tangled power lines"
              className="absolute inset-0 h-full w-full object-cover object-[62%_60%] transition-transform duration-[1400ms] ease-[var(--ease-out-quint)] hover:scale-[1.03]"
            />
            <figcaption className="ui absolute bottom-3 left-3 rounded-full bg-paper/95 px-3 py-1.5 text-[0.8125rem] font-medium">Pedro Gil, Manila</figcaption>
          </figure>
        </Reveal>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:col-span-7">
          {tiles.map((t, i) => (
            <Reveal as="li" key={t.label} delay={0.06 * i} className="flex">
              <Link to={t.to} className="group flex w-full flex-col rounded-[28px] bg-paper p-6 transition-colors duration-300 hover:bg-accent-soft sm:p-7">
                <span className="flex items-center justify-between gap-3">
                  <span className="ui text-[0.9375rem] font-semibold">{t.label}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={20}
                    className="text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                  />
                </span>
                <span className="figure mt-5 block text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)] leading-none">{t.value}</span>
                <span className="mt-3 block text-[0.9375rem] leading-relaxed text-ink-2">{t.body}</span>
                <span className="ui mt-auto block pt-5 text-[0.8125rem] leading-relaxed text-muted">
                  {t.source}
                  <span className="mt-1 block">{t.status}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function OpenSource() {
  const { openSupport } = useSupport()
  return (
    <section aria-labelledby="open-title" className="wrap mt-[clamp(96px,11vw,170px)]">
      <Reveal className="grid gap-8 rounded-[32px] bg-accent-soft p-6 sm:p-10 lg:grid-cols-12 lg:items-end lg:p-14">
        <div className="lg:col-span-8">
          <AnimatedSymbol size={56} play={false} />
          <h2 id="open-title" className="text-step-head mt-6 max-w-[18ch]">
            Libre, open source, para sa lahat.
          </h2>
          <p className="mt-4 max-w-[54ch] text-step-lead leading-snug text-ink-2">No ads, no accounts, no tracking. Every formula and dataset is public, so anyone can check how a number is made.</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
          <button type="button" onClick={openSupport} className="btn btn-primary">
            <Heart aria-hidden="true" size={18} />
            Support the project
          </button>
          <Link to="/about" className="btn btn-paper">
            About PinansyalPH
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export function HomePage() {
  // Replay the hero's entrance once the splash has gone, so it is seen rather than played underneath.
  const ready = useSplashGone()
  return (
    <Page path="/" next={false}>
      <Hero ready={ready} />
      <Tools />
      <Numbers />
      <OpenSource />
    </Page>
  )
}
